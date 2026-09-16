import { ask } from '../claude/ask.js';
import { tellHer } from '../claude/failure.js';
import { offerPrompt } from '../claude/prompts/offer.js';
import { openingPrompt, restPrompt, PAGES_PER_STORY } from '../claude/prompts/story.js';
import { wordPrompt, sentencePrompt } from '../claude/prompts/gloss.js';
import { examPrompt } from '../claude/prompts/exam.js';
import { markPrompt } from '../claude/prompts/mark.js';
import { bridgePrompt, bridgeMarkPrompt, miniPrompt } from '../claude/prompts/bridge.js';
import { getProfile } from '../profiles.js';
import { ACTIVITIES, getActivity } from '../activities.js';
import { progressFor, peek } from '../store/progress.js';
import { storiesFor, newId } from '../store/stories.js';
import { bank, timesWrong } from '../store/words.js';

const MAX_BRIDGE_WORDS = 8;

/** Stories whose later pages are still being written, keyed by story id. */
const beingWritten = new Map();

/**
 * What each activity looks like right now, for the picker.
 *
 * Reads position without starting a session, so opening the picker never resumes
 * anything. Picking an activity is a deliberate act - landing straight back in
 * whatever was last touched is exactly the behaviour this replaces.
 */
export function overviewFor(profileId) {
  const profile = getProfile(profileId);
  if (!profile) throw tellHer('That learner is not set up yet.', `unknown profile: ${profileId}`);
  const stories = storiesFor(profileId);

  return {
    profile: { id: profile.id, name: profile.name, age: profile.age, grade: profile.grade },
    activities: ACTIVITIES.map((activity) => {
      if (!activity.ready) {
        return { ...activity, standing: activity.notReady };
      }

      const p = peek(profileId, activity.id);
      const story = p.storyId ? stories.read(p.storyId) : null;

      let standing = 'Nothing on the go — start something new.';
      if (story && p.phase !== 'done') {
        const total = story.pageCount ?? story.pages.length;
        const where = { reading: 'reading', exam: 'on the questions for', bridge: 'on the word check for' }[p.phase] ?? 'on';
        standing = `Carry on — ${where} page ${p.pageIndex + 1} of ${total} of “${story.title}”.`;
      } else if (p.history.length) {
        standing = `${p.history.length} finished. Start something new.`;
      }

      return { ...activity, standing, resumable: Boolean(story && p.phase !== 'done') };
    }),
  };
}

/**
 * One input per word, and every word findable in the sentence holding it.
 *
 * A word tested in three sentences used to mean answering for it three times, which
 * is most of the effort of this step for none of the value. The first sentence that
 * tests a word keeps it; any later sentence with nothing left to ask is dropped
 * rather than shown with no question attached.
 *
 * This also migrates bridges built before targets carried their surface form, so a
 * session sitting on this step does not have to be thrown away.
 */
function normaliseBridge(sentences = []) {
  const claimed = new Set();
  const out = [];

  for (const sentence of sentences) {
    const targets = [];
    for (const target of sentence.targets ?? []) {
      const word = typeof target === 'string' ? target : target?.word;
      if (!word || claimed.has(word.toLowerCase())) continue;
      claimed.add(word.toLowerCase());
      targets.push({ word, asWritten: (typeof target === 'string' ? null : target.asWritten) || word });
    }
    if (targets.length) out.push({ ...sentence, targets });
  }
  return out;
}

/**
 * Everything one learner can do, bound to that learner.
 *
 * The profile is threaded through rather than held in a module variable on purpose:
 * two learners can have the app open at once, and a shared "current profile" would
 * quietly file one of them's words under the other.
 */
export function sessionFor(profileId, activityId) {
  const profile = getProfile(profileId);
  if (!profile) throw tellHer('That learner is not set up yet.', `unknown profile: ${profileId}`);

  const activity = getActivity(activityId);
  if (!activity) throw tellHer('Pick what you want to do first.', `unknown activity: ${activityId}`);
  if (!activity.ready) throw tellHer(activity.notReady ?? 'That is not ready yet.', `activity not ready: ${activityId}`);

  const progress = progressFor(profileId, activityId);
  const stories = storiesFor(profileId);
  const words = bank(profileId);

  /** Everything the screen needs, in one shape, whatever phase they are in. */
  function state() {
    const p = progress.load();
    const story = p.storyId ? stories.read(p.storyId) : null;
    return {
      profile: { id: profile.id, name: profile.name, age: profile.age, grade: profile.grade },
      activity: { id: activity.id, name: activity.name },
      phase: p.phase,
      offers: p.offers,
      story: story && {
        id: story.id,
        title: story.title,
        pageIndex: p.pageIndex,
        pageCount: story.pageCount ?? story.pages.length,
        page: story.pages[p.pageIndex] ?? null,
        // The lid will get closed mid-page; tapped words stay marked.
        askedWords: words.askedOnPage(p.storyId, p.pageIndex).map((w) => w.word),
      },
      exam: p.exam && {
        round: p.exam.round,
        questions: p.exam.questions.filter((q) => p.exam.pending.includes(q.id)),
        results: p.exam.results,
        allQuestions: p.exam.questions,
      },
      bridge: p.bridge && {
        mode: p.bridge.mode,
        attempt: p.bridge.attempt,
        sentences: normaliseBridge(p.bridge.sentences),
        results: p.bridge.results ?? null,
        mini: p.bridge.mini
          ? {
              questions: p.bridge.mini.questions.filter((q) => p.bridge.mini.pending.includes(q.id)),
              results: p.bridge.mini.results,
            }
          : null,
      },
      history: p.history,
    };
  }

  async function offerStories() {
    const p = progress.load();
    const recentTitles = p.history.slice(-6).map((h) => h.title);
    const offers = await ask(offerPrompt({ profile, recentTitles }), { fast: true, what: 'offers' });
    progress.update({ phase: 'choosing', offers, storyId: null, pageIndex: 0, exam: null, bridge: null });
    return state();
  }

  /** Write pages two and three behind them, while they read page one. */
  function writeRest(story) {
    if (beingWritten.has(story.id)) return beingWritten.get(story.id);

    const job = ask(restPrompt({ profile, title: story.title, plan: story.plan, page: story.pages[0] }), {
      what: 'rest of story',
    })
      .then((written) => {
        const current = stories.read(story.id);
        current.pages = [current.pages[0], ...(written.pages ?? [])].slice(0, PAGES_PER_STORY);
        stories.write(current);
        return current;
      })
      .finally(() => beingWritten.delete(story.id));

    beingWritten.set(story.id, job);
    return job;
  }

  async function chooseStory(index) {
    const p = progress.load();
    const pick = p.offers?.[index];
    if (!pick) throw tellHer("That story isn't on the list any more - pick another one.");

    const revisit = words.ranked(null, { limit: 10, onlyDue: true });
    const written = await ask(openingPrompt({ profile, title: pick.title, teaser: pick.teaser, revisit }), {
      what: 'story',
    });

    const story = {
      id: newId(),
      title: written.title ?? pick.title,
      teaser: pick.teaser,
      plan: written.plan ?? '',
      pages: [written.page],
      pageCount: PAGES_PER_STORY,
      revisited: written.used ?? [],
      source: 'generated',
      createdAt: new Date().toISOString(),
    };
    stories.write(story);
    writeRest(story);
    progress.update({
      phase: 'reading',
      source: 'story',
      storyId: story.id,
      pageIndex: 0,
      offers: null,
      exam: null,
      bridge: null,
    });
    return state();
  }

  async function lookupWord({ word, sentence }) {
    const p = progress.load();
    const existing = words.get(word);
    const timesAsked = existing ? existing.lookups.filter((l) => l.storyId === p.storyId).length : 0;

    const gloss = await ask(wordPrompt({ profile, word, sentence, timesAsked }), { fast: true, what: 'word' });
    words.recordLookup(word, {
      storyId: p.storyId,
      pageIndex: p.pageIndex,
      meaning: gloss.meaning,
      lemma: gloss.lemma,
    });
    return { ...gloss, timesAsked };
  }

  function lookupSentence({ sentence }) {
    return ask(sentencePrompt({ profile, sentence }), { fast: true, what: 'sentence' });
  }

  async function startExam() {
    const p = progress.load();
    const story = stories.read(p.storyId);
    const page = story.pages[p.pageIndex];
    const asked = words.askedOnPage(p.storyId, p.pageIndex);

    const built = await ask(examPrompt({ profile, page, asked }), { what: 'exam' });
    const questions = [
      ...(built.comprehension ?? []).map((q) => ({ ...q, kind: 'comprehension' })),
      ...(built.vocabulary ?? []).map((q) => ({ ...q, kind: 'vocabulary' })),
    ];

    progress.update({
      phase: 'exam',
      exam: { questions, pending: questions.map((q) => q.id), results: {}, round: 1, wrongWords: [] },
    });
    return state();
  }

  async function submitExam(answers) {
    const p = progress.load();
    const story = stories.read(p.storyId);
    const page = story.pages[p.pageIndex];
    const asking = p.exam.questions.filter((q) => p.exam.pending.includes(q.id));

    const marked = await ask(markPrompt({ profile, page, questions: asking, answers }), { what: 'marking' });
    const byId = Object.fromEntries((marked.results ?? []).map((r) => [r.id, r]));

    const wrongWords = new Set(p.exam.wrongWords);
    const results = { ...p.exam.results };
    const pending = [];

    for (const q of asking) {
      const r = byId[q.id] ?? {
        id: q.id,
        correct: false,
        feedback: 'I could not read that answer - try it again.',
        evidence: null,
      };
      results[q.id] = r;
      if (!r.correct) pending.push(q.id);
      if (q.word) {
        words.recordAnswer(q.word, { correct: !!r.correct, storyId: p.storyId, kind: 'exam' });
        if (!r.correct) wrongWords.add(q.word);
      }
    }

    progress.update({
      exam: { ...p.exam, results, pending, round: p.exam.round + 1, wrongWords: [...wrongWords] },
    });

    // Still things to get right - they stay here and retry only those.
    if (pending.length) return state();
    return startBridgeOrAdvance();
  }

  /**
   * Exam clean. Now the real check: can those words be read somewhere new?
   *
   * Only words that actually gave trouble get here - a page read cleanly has nothing
   * to prove and goes straight on.
   */
  async function startBridgeOrAdvance() {
    const p = progress.load();
    const asked = words.askedOnPage(p.storyId, p.pageIndex);
    const wrong = new Set(p.exam?.wrongWords ?? []);

    const candidates = asked.filter((w) => wrong.has(w.word) || w.struggling).slice(0, MAX_BRIDGE_WORDS);
    if (!candidates.length) return advancePage();

    const built = await ask(bridgePrompt({ profile, words: candidates, attempt: 1 }), { what: 'bridge' });
    progress.update({
      phase: 'bridge',
      bridge: {
        mode: 'bridge',
        attempt: 1,
        words: candidates.map((w) => ({ word: w.word, meaning: w.meaning, struggling: w.struggling })),
        sentences: built.sentences ?? [],
        results: null,
        mini: null,
      },
    });
    return state();
  }

  async function submitBridge(answers) {
    const p = progress.load();
    const b = p.bridge;

    // They answered about words, so mark words - each paired with the sentence it
    // was highlighted in, which is the only context its meaning depends on.
    const asked = normaliseBridge(b.sentences).flatMap((s) =>
      s.targets.map((t) => ({ word: t.word, sentence: s.text })),
    );

    const marked = await ask(bridgeMarkPrompt({ profile, asked, answers }), { what: 'bridge marking' });
    const byWord = new Map((marked.words ?? []).map((w) => [String(w.word).toLowerCase(), w]));

    const wrongWords = [];
    const results = [];
    for (const { word } of asked) {
      const r = byWord.get(word.toLowerCase()) ?? {
        word,
        correct: false,
        feedback: 'Have another go at this one.',
        translation: null,
      };
      results.push({ ...r, word });
      words.recordAnswer(word, { correct: !!r.correct, storyId: p.storyId, kind: 'bridge' });
      if (!r.correct) wrongWords.push(word);
    }

    if (!wrongWords.length) {
      progress.update({ bridge: { ...b, results } });
      return advancePage();
    }

    // Back to drilling - then a fresh set of sentences, never the same ones.
    const targets = b.words.filter((w) => wrongWords.includes(w.word));
    const mini = await ask(miniPrompt({ profile, words: targets }), { what: 'mini' });
    const questions = (mini.vocabulary ?? []).map((q) => ({ ...q, kind: 'vocabulary' }));

    progress.update({
      bridge: {
        ...b,
        mode: 'mini',
        results,
        mini: { questions, pending: questions.map((q) => q.id), results: {} },
      },
    });
    return state();
  }

  async function submitMini(answers) {
    const p = progress.load();
    const b = p.bridge;
    const story = stories.read(p.storyId);
    const asking = b.mini.questions.filter((q) => b.mini.pending.includes(q.id));

    const marked = await ask(markPrompt({ profile, page: story.pages[p.pageIndex], questions: asking, answers }), {
      what: 'mini marking',
    });
    const byId = Object.fromEntries((marked.results ?? []).map((r) => [r.id, r]));

    const results = { ...b.mini.results };
    const pending = [];
    for (const q of asking) {
      const r = byId[q.id] ?? { id: q.id, correct: false, feedback: 'Try that one again.', evidence: null };
      results[q.id] = r;
      if (!r.correct) pending.push(q.id);
      if (q.word) words.recordAnswer(q.word, { correct: !!r.correct, storyId: p.storyId, kind: 'mini' });
    }

    if (pending.length) {
      progress.update({ bridge: { ...b, mini: { ...b.mini, results, pending } } });
      return state();
    }

    // Drilled clean. Prove it on sentences never seen before.
    const attempt = b.attempt + 1;
    const built = await ask(bridgePrompt({ profile, words: b.words, attempt }), { what: 'bridge' });
    progress.update({
      bridge: { ...b, mode: 'bridge', attempt, sentences: built.sentences ?? [], results: null, mini: null },
    });
    return state();
  }

  async function advancePage() {
    const p = progress.load();
    let story = stories.read(p.storyId);
    const total = story.pageCount ?? story.pages.length;
    const next = p.pageIndex + 1;

    // They have outrun the writer, or the server restarted mid-story. Either way
    // the page has to exist before they can be sent to it.
    if (next < total && next >= story.pages.length) story = await writeRest(story);

    if (next >= total) {
      const history = [
        ...p.history,
        { storyId: story.id, title: story.title, finishedAt: new Date().toISOString() },
      ];
      progress.update({ phase: 'done', exam: null, bridge: null, history });
      return state();
    }

    progress.update({ phase: 'reading', pageIndex: next, exam: null, bridge: null });
    return state();
  }

  /** The word bank, for a parent - and for showing a teacher. */
  function report() {
    const p = progress.load();
    return words.ranked(p.storyId, { limit: 500 }).map((w) => ({
      word: w.word,
      meaning: w.meaning,
      asked: w.lookups.length,
      wrong: timesWrong(w),
      streak: w.streak,
      struggling: w.struggling,
      dueAt: w.dueAt,
    }));
  }

  return {
    state,
    offerStories,
    chooseStory,
    lookupWord,
    lookupSentence,
    startExam,
    submitExam,
    submitBridge,
    submitMini,
    report,
  };
}

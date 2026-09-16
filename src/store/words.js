import { read, write } from './db.js';

const FILE = 'words.json';

// Days until a word is worth testing again, indexed by how many times in a row it
// has now been right. Index 0 (never right, or just got it wrong) is "today".
const INTERVALS = [0, 1, 3, 7, 21, 60];

function blank(word) {
  return {
    word,
    meaning: null,
    lemma: null,
    lookups: [],
    answers: [],
    streak: 0,
    dueAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------- pure helpers

/** How many times this word was asked about inside one particular story. */
export function repeatsInStory(entry, storyId) {
  return entry.lookups.filter((l) => l.storyId === storyId).length;
}

export function timesWrong(entry) {
  return entry.answers.filter((a) => !a.correct).length;
}

/** Wrong answers at the end of the run - "got it wrong repeatedly", right now. */
export function wrongInARow(entry) {
  let n = 0;
  for (let i = entry.answers.length - 1; i >= 0 && !entry.answers[i].correct; i--) n++;
  return n;
}

/**
 * A word that is not being retained. Two ways in, and both are the owner's rule
 * rather than a threshold picked for tidiness: asking again inside one story means
 * being told did not stick, and missing it twice means the test did not stick either.
 */
export function struggling(entry, storyId) {
  return repeatsInStory(entry, storyId) >= 2 || timesWrong(entry) >= 2;
}

/**
 * How loudly this word should shout to be included - in an exam, in bridge
 * sentences, and in the next story. Higher wins.
 */
export function attention(entry, storyId) {
  const again = Math.max(0, repeatsInStory(entry, storyId) - 1);
  return (
    again * 3 +
    entry.lookups.length +
    timesWrong(entry) * 4 +
    wrongInARow(entry) * 2 -
    entry.streak * 2
  );
}

// ---------------------------------------------------------------- one learner's bank

/** The word bank for one learner. Nothing here reaches another learner's words. */
export function bank(profile) {
  const load = () => read(profile, FILE, {});
  const save = (b) => write(profile, FILE, b);

  return {
    /**
     * A word was tapped to ask what it means.
     *
     * This is the signal the whole tool is built around: a word asked about twice in
     * one story is a word that was explained and did not stay. Nothing here decides
     * what to do about that - `attention` and `struggling` read it back out.
     */
    recordLookup(word, { storyId, pageIndex, meaning, lemma }) {
      const b = load();
      const key = word.toLowerCase();
      const entry = b[key] ?? blank(key);
      entry.lookups.push({ at: new Date().toISOString(), storyId, pageIndex });
      if (meaning) entry.meaning = meaning;
      if (lemma) entry.lemma = lemma;
      // Being told again resets any run of correct answers - it was not known.
      entry.streak = 0;
      entry.dueAt = new Date().toISOString();
      b[key] = entry;
      save(b);
      return entry;
    },

    /** A question about this word was answered, in an exam, a retry or a bridge. */
    recordAnswer(word, { correct, storyId, kind }) {
      const b = load();
      const key = word.toLowerCase();
      const entry = b[key] ?? blank(key);
      entry.answers.push({ at: new Date().toISOString(), correct, storyId, kind });
      entry.streak = correct ? entry.streak + 1 : 0;
      const days = INTERVALS[Math.min(entry.streak, INTERVALS.length - 1)];
      entry.dueAt = new Date(Date.now() + days * 864e5).toISOString();
      b[key] = entry;
      save(b);
      return entry;
    },

    all() {
      return Object.values(load());
    },

    get(word) {
      return load()[word.toLowerCase()] ?? null;
    },

    /** Words worth putting in front of this learner again, most urgent first. */
    ranked(storyId, { limit = 12, onlyDue = false } = {}) {
      const now = Date.now();
      return Object.values(load())
        .filter((e) => (onlyDue ? new Date(e.dueAt).getTime() <= now : true))
        .map((e) => ({ ...e, attention: attention(e, storyId), struggling: struggling(e, storyId) }))
        .sort((a, b) => b.attention - a.attention)
        .slice(0, limit);
    },

    /** Every word asked about while reading one page - that page's own vocabulary. */
    askedOnPage(storyId, pageIndex) {
      return Object.values(load())
        .filter((e) => e.lookups.some((l) => l.storyId === storyId && l.pageIndex === pageIndex))
        .map((e) => ({
          ...e,
          timesAsked: repeatsInStory(e, storyId),
          attention: attention(e, storyId),
          struggling: struggling(e, storyId),
        }))
        .sort((a, b) => b.attention - a.attention);
    },
  };
}

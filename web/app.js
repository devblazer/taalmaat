const main = document.getElementById('main');
const crumb = document.getElementById('crumb');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const cover = document.getElementById('cover');
const coverTitle = document.getElementById('cover-title');
const coverSub = document.getElementById('cover-sub');
const coverBar = document.getElementById('cover-bar');
const coverFill = document.getElementById('cover-fill');

let state = null;
let error = null;
/** Words she has tapped on the page in front of her, so they stay marked. */
let asked = new Set();
/** The sentence the open popup came out of, for the "explain the whole sentence" step. */
let popupSentence = null;

/**
 * What she sees while Claude is thinking.
 *
 * `seconds` is the measured typical wait, and it drives a bar that creeps to 92%
 * and stops. It is an estimate rather than real progress - but a child staring at
 * a blank page for twenty-three seconds concludes the thing is broken, and a bar
 * that is honestly paced is the difference between waiting and giving up.
 */
const WAITS = {
  offers: { title: 'Finding you some stories…', seconds: 6 },
  story: {
    title: 'Writing your story…',
    seconds: 25,
    lines: [
      'This one takes a little longer — it is being written just for you.',
      'Thinking about who is in it…',
      'Getting the first page right…',
      'Almost there.',
    ],
  },
  exam: { title: 'Getting your questions ready…', seconds: 6 },
  marking: { title: 'Reading your answers…', seconds: 8 },
  checking: { title: 'Checking…', seconds: 12 },
  sentences: { title: 'Writing you some new sentences…', seconds: 12 },
};

let coverTick = null;

function showCover(wait) {
  coverTitle.textContent = wait.title;
  coverSub.textContent = wait.lines?.[0] ?? '';
  coverFill.style.width = '0%';
  coverBar.hidden = false;
  cover.hidden = false;

  const started = Date.now();
  clearInterval(coverTick);
  coverTick = setInterval(() => {
    const elapsed = (Date.now() - started) / 1000;
    coverFill.style.width = `${Math.min(92, (elapsed / wait.seconds) * 92).toFixed(1)}%`;

    // Past the estimate the bar stops moving, and a bar that has stopped reads as
    // broken. Say so instead of letting her guess.
    if (elapsed > wait.seconds * 1.4) {
      coverSub.textContent = 'This is taking longer than usual — still going.';
    } else if (wait.lines) {
      const step = Math.min(wait.lines.length - 1, Math.floor(elapsed / (wait.seconds / wait.lines.length)));
      coverSub.textContent = wait.lines[step];
    }
  }, 400);
}

function hideCover() {
  clearInterval(coverTick);
  coverTick = null;
  coverFill.style.width = '100%';
  setTimeout(() => {
    cover.hidden = true;
  }, 200);
}

async function api(path, body, wait) {
  if (wait) showCover(wait);
  try {
    const res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error = { message: data.error ?? 'Something went wrong there.', canRetry: data.canRetry !== false };
      throw new Error(error.message);
    }
    error = null;
    return data;
  } catch (err) {
    // A dead server or pulled network never reaches the branch above.
    error ??= { message: 'Cannot reach the app right now.', canRetry: true };
    throw err;
  } finally {
    if (wait) hideCover();
  }
}

/** The last thing she tried, so the Try again button can be the same thing again. */
let lastGo = null;

/** Most calls hand back the whole state; this is the one place that swaps it in. */
async function go(path, body, wait) {
  lastGo = { path, body, wait };
  try {
    state = await api(path, body, wait);
    asked = new Set(state.story?.askedWords ?? []);
  } catch {
    /* error is rendered */
  }
  render();
}

function retry() {
  if (!lastGo) return;
  error = null;
  go(lastGo.path, lastGo.body, lastGo.wait);
}

// ---------------------------------------------------------------- text

const TOKEN = /(['’]?\p{L}+(?:['’-]\p{L}+)*)|([^\p{L}]+)/gu;

function sentencesOf(paragraph) {
  return paragraph.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

/**
 * Render the page as tappable words, each one knowing which sentence it sits in.
 *
 * `blocked` holds the words the exam is currently asking about. She keeps the story
 * beside her and may reread and look things up - that is the point - but tapping the
 * very word being tested would hand her the answer, so those words nudge instead.
 */
function renderPage(text, { blocked = new Set() } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'page';

  for (const para of text.split(/\n\s*\n|\n/).filter((p) => p.trim())) {
    const p = document.createElement('p');
    for (const sentence of sentencesOf(para.trim())) {
      const s = document.createElement('span');
      s.className = 's';
      s.dataset.sentence = sentence;

      for (const m of sentence.matchAll(TOKEN)) {
        if (m[1]) {
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = m[1];
          if (asked.has(m[1].toLowerCase())) w.classList.add('asked');
          if (blocked.has(m[1].toLowerCase())) {
            w.classList.add('blocked');
            w.addEventListener('click', () => nudge(m[1]));
          } else {
            w.addEventListener('click', () => tapWord(m[1], sentence, w));
          }
          s.append(w);
        } else {
          s.append(document.createTextNode(m[2]));
        }
      }
      p.append(s, ' ');
    }
    wrap.append(p);
  }
  return wrap;
}

// ---------------------------------------------------------------- popup

function showPopup(html) {
  popupBody.innerHTML = html;
  popup.hidden = false;
}

function closePopup() {
  popup.hidden = true;
  popupSentence = null;
}

popup.querySelector('.popup-close').addEventListener('click', closePopup);

/** She tapped a word the exam is asking her about. No free answers. */
function nudge(word) {
  showPopup(`
    <h4>${escape(word)}</h4>
    <p class="meaning">This is one of the words you're being asked about — see if you can get it on your own first.</p>
    <p class="note">You can still look up any other word, and read the story as many times as you like.</p>
  `);
}

/** One lookup at a time - a second tap mid-lookup lands in the wrong popup. */
let lookingUp = false;

async function tapWord(word, sentence, el) {
  if (lookingUp) return;
  lookingUp = true;
  document.body.classList.add('waiting-word');

  popupSentence = sentence;
  showPopup(`<h4>${escape(word)}</h4><p class="looking">Looking it up…</p>`);
  try {
    const g = await api('/api/word', { word, sentence });
    asked.add(word.toLowerCase());
    el.classList.add('asked');

    const again = g.seenBefore
      ? `<p class="again">You've looked this one up before - have another go at holding onto it.</p>`
      : '';
    const lemma = g.lemma && g.lemma.toLowerCase() !== word.toLowerCase()
      ? ` <span class="note">(from <b>${escape(g.lemma)}</b>)</span>`
      : '';

    showPopup(`
      <h4>${escape(word)}</h4>
      ${again}
      <p class="meaning">${escape(g.meaning)}${lemma}</p>
      ${g.note ? `<p class="note">${escape(g.note)}</p>` : ''}
      <div class="row"><button class="ghost" id="explain-sentence">I still don't get the sentence</button></div>
    `);
    document.getElementById('explain-sentence').addEventListener('click', explainSentence);
  } catch {
    showPopup(`<h4>${escape(word)}</h4><p class="meaning">Couldn't look that up just now - tap it again.</p>`);
  } finally {
    lookingUp = false;
    document.body.classList.remove('waiting-word');
  }
}

async function explainSentence() {
  if (lookingUp) return;
  lookingUp = true;
  document.body.classList.add('waiting-word');

  const sentence = popupSentence;
  showPopup(`<h4>The whole sentence</h4><p class="looking">Working it out…</p>`);
  try {
    const s = await api('/api/sentence', { sentence });
    const list = (s.words ?? [])
      .map((w) => `<li><b>${escape(w.af)}</b> — ${escape(w.en)}</li>`)
      .join('');
    showPopup(`
      <h4>The whole sentence</h4>
      <p class="note">${escape(sentence)}</p>
      <p class="meaning">${escape(s.translation)}</p>
      ${s.structure ? `<p class="note">${escape(s.structure)}</p>` : ''}
      ${list ? `<ul class="wordlist">${list}</ul>` : ''}
    `);
  } catch {
    showPopup(`<h4>The whole sentence</h4><p class="meaning">Couldn't explain that just now - try again.</p>`);
  } finally {
    lookingUp = false;
    document.body.classList.remove('waiting-word');
  }
}

// ---------------------------------------------------------------- errors

/**
 * What she sees when something breaks.
 *
 * A message she can read, and a button that does the thing again. Without the
 * button a failure is a dead end: the banner used to appear over a blank page with
 * no way forward at all.
 */
function errorCard({ message, canRetry }) {
  const card = el(`
    <div class="error">
      <div class="error-face">😕</div>
      <div class="error-body">
        <p class="error-message">${escape(message)}</p>
        <p class="error-hint">${
          canRetry
            ? 'Nothing you did is lost — have another go.'
            : 'Nothing you did is lost. Ask whoever set this up to restart it.'
        }</p>
      </div>
    </div>
  `);

  if (canRetry && lastGo) {
    const row = el(`<div class="row"><button class="primary">Try again</button></div>`);
    row.querySelector('button').addEventListener('click', retry);
    card.querySelector('.error-body').append(row);
  }
  return card;
}

// ---------------------------------------------------------------- views

function render() {
  main.replaceChildren();
  main.classList.remove('wide');
  crumb.textContent = '';
  if (error) main.append(errorCard(error));

  // Nothing loaded and nothing working - the card above is the whole screen, so it
  // has to be able to get her out on its own.
  if (!state) return;

  ({
    choosing: viewChoosing,
    reading: viewReading,
    exam: viewExam,
    bridge: viewBridge,
    done: viewDone,
  }[state.phase] ?? viewChoosing)();
}

function viewChoosing() {
  if (!state.offers) {
    main.append(el(`<p class="lead">Ready for a story?</p>`));
    const b = el(`<div class="row"><button class="primary">Show me three stories</button></div>`);
    b.querySelector('button').addEventListener('click', () => go('/api/offers', {}, WAITS.offers));
    main.append(b);
    return;
  }

  main.append(el(`<p class="lead">Which one do you want to read?</p>`));
  state.offers.forEach((o, i) => {
    const card = el(`<button class="offer"><h3>${escape(o.title)}</h3><p>${escape(o.teaser)}</p></button>`);
    card.addEventListener('click', () => go('/api/choose', { index: i }, WAITS.story));
    main.append(card);
  });

  const more = el(`<div class="row"><button class="ghost">Show me three different ones</button></div>`);
  more.querySelector('button').addEventListener('click', () => go('/api/offers', {}, WAITS.offers));
  main.append(more);
}

function viewReading() {
  const s = state.story;
  crumb.textContent = `${s.title} — page ${s.pageIndex + 1} of ${s.pageCount}`;
  main.append(el(`<h2 class="story-title">${escape(s.title)}</h2>`));
  main.append(el(`<div class="page-of">Page ${s.pageIndex + 1} of ${s.pageCount}</div>`));
  main.append(renderPage(s.page));
  main.append(el(`<p class="hint">Tap any word you don't know. Nobody is counting — that's what this is for.</p>`));

  const row = el(`<div class="row"><button class="primary">I've finished this page</button></div>`);
  row.querySelector('button').addEventListener('click', () => {
    closePopup();
    go('/api/exam', {}, WAITS.exam);
  });
  main.append(row);
}

function questionCard(q, previous) {
  const card = el(`
    <div class="q">
      <span class="tag">${q.kind === 'vocabulary' ? 'Word' : 'About the story'}</span>
      <label for="a-${q.id}">${escape(q.question)}</label>
      <input type="text" id="a-${q.id}" data-qid="${q.id}" autocomplete="off" />
    </div>
  `);
  if (previous && !previous.correct) {
    card.prepend(el(`<div class="result wrong"><div class="head">Not quite last time</div><div>${escape(previous.feedback)}</div>${
      previous.evidence ? `<p class="evidence">${escape(previous.evidence)}</p>` : ''
    }</div>`));
  }
  return card;
}

function collectAnswers() {
  const answers = {};
  for (const input of main.querySelectorAll('input[data-qid]')) {
    answers[input.dataset.qid] = input.value.trim();
  }
  return answers;
}

/**
 * The exam, with the story still open beside it.
 *
 * Nobody should be answering from memory alone - going back and rereading is the
 * skill, not cheating. The only thing withheld is a lookup of a word she is being
 * tested on.
 */
function viewExam() {
  const e = state.exam;
  crumb.textContent = `${state.story.title} — page ${state.story.pageIndex + 1}`;
  main.classList.add('wide');

  const retry = e.round > 1;
  main.append(el(`<p class="lead">${retry ? 'Nearly — just these left.' : 'Tell me what you understood.'}</p>`));

  const split = el(`<div class="split"></div>`);
  const storyPane = el(`<div class="story-pane"><h3>The story</h3></div>`);
  const asking = el(`<div class="ask-pane"></div>`);

  const blocked = new Set(e.allQuestions.filter((q) => q.word).map((q) => q.word.toLowerCase()));
  storyPane.append(renderPage(state.story.page, { blocked }));
  storyPane.append(el(`<p class="hint">Read it again as many times as you like. You can still tap words that aren't being asked about.</p>`));

  for (const q of e.allQuestions) {
    const r = e.results[q.id];
    if (r?.correct) {
      asking.append(
        el(`<div class="result right"><div class="head">✓ ${escape(q.question)}</div><div>${escape(r.feedback)}</div></div>`),
      );
    } else if (e.questions.some((p) => p.id === q.id)) {
      asking.append(questionCard(q, r));
    }
  }

  const row = el(`<div class="row"><button class="primary">Check my answers</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/exam/answer', { answers: collectAnswers() }, WAITS.marking));
  asking.append(row);

  split.append(storyPane, asking);
  main.append(split);
}

function viewBridge() {
  const b = state.bridge;
  crumb.textContent = `${state.story.title} — page ${state.story.pageIndex + 1}`;

  if (b.mode === 'mini') {
    main.append(el(`<p class="lead">Let's pin these down properly first.</p>`));
    for (const q of b.mini.questions) main.append(questionCard(q, b.mini.results[q.id]));
    const row = el(`<div class="row"><button class="primary">Check</button></div>`);
    row.querySelector('button').addEventListener('click', () => go('/api/mini/answer', { answers: collectAnswers() }, WAITS.checking));
    main.append(row);
    return;
  }

  main.append(
    el(`<p class="lead">${
      b.attempt > 1
        ? 'New sentences this time. What does the marked word mean?'
        : 'Last thing — what does the marked word mean in each one?'
    }</p>`),
  );

  for (const s of b.sentences) {
    const card = el(`<div class="sentence-card"><p class="af">${highlight(s.text, s.targets)}</p></div>`);
    for (const t of s.targets) {
      const previous = (b.results ?? []).find((r) => r.word?.toLowerCase() === t.word.toLowerCase());
      if (previous && !previous.correct) {
        card.append(
          el(`<div class="result wrong"><div class="head">Not quite last time</div><div>${escape(previous.feedback)}</div></div>`),
        );
      }
      card.append(
        el(`
          <label class="ask">
            <span><b>${escape(t.asWritten)}</b> means…</span>
            <input type="text" data-qid="${escape(t.word)}" placeholder="In English…" autocomplete="off" />
          </label>
        `),
      );
    }
    main.append(card);
  }

  const row = el(`<div class="row"><button class="primary">Check</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/bridge/answer', { answers: collectAnswers() }, WAITS.checking));
  main.append(row);
}

function viewDone() {
  main.append(el(`<p class="lead">You finished <b>${escape(state.history.at(-1)?.title ?? 'the story')}</b>. Well read.</p>`));
  const row = el(`<div class="row"><button class="primary">Another story</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/offers', {}, WAITS.offers));
  main.append(row);
}

// ---------------------------------------------------------------- helpers

/**
 * Mark the word she is being asked about inside its sentence.
 *
 * Without this the sentence is a wall of Afrikaans with no clue which word the
 * question is about. Escaped first, so the replace only ever wraps plain text; if
 * the word cannot be found the sentence is still shown, just unmarked.
 */
function highlight(text, targets = []) {
  let out = escape(text);
  for (const t of targets) {
    const needle = escape(t.asWritten || t.word);
    if (!needle) continue;
    const pattern = new RegExp(`(^|[^\\p{L}])(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu');
    out = out.replace(pattern, (_, before, hit) => `${before}<mark>${hit}</mark>`);
  }
  return out;
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

go('/api/state');

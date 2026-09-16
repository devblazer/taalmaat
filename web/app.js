const main = document.getElementById('main');
const crumb = document.getElementById('crumb');
const popup = document.getElementById('popup');
const popupBody = document.getElementById('popup-body');
const busy = document.getElementById('busy');

let state = null;
let error = null;
/** Words she has tapped on the page in front of her, so they stay marked. */
let asked = new Set();
/** The sentence the open popup came out of, for the "explain the whole sentence" step. */
let popupSentence = null;

let inFlight = 0;

async function api(path, body) {
  inFlight++;
  busy.hidden = false;
  try {
    const res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'something went wrong');
    error = null;
    return data;
  } catch (err) {
    error = err.message;
    throw err;
  } finally {
    if (--inFlight === 0) busy.hidden = true;
  }
}

/** Most calls hand back the whole state; this is the one place that swaps it in. */
async function go(path, body) {
  try {
    state = await api(path, body);
    asked = new Set(state.story?.askedWords ?? []);
  } catch {
    /* error is rendered */
  }
  render();
}

// ---------------------------------------------------------------- text

const TOKEN = /(['’]?\p{L}+(?:['’-]\p{L}+)*)|([^\p{L}]+)/gu;

function sentencesOf(paragraph) {
  return paragraph.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

/** Render the page as tappable words, each one knowing which sentence it sits in. */
function renderPage(text) {
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
          w.addEventListener('click', () => tapWord(m[1], sentence, w));
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

async function tapWord(word, sentence, el) {
  popupSentence = sentence;
  showPopup(`<h4>${escape(word)}</h4><p class="meaning">…</p>`);
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
    showPopup(`<h4>${escape(word)}</h4><p class="meaning">Couldn't look that up just now - try again.</p>`);
  }
}

async function explainSentence() {
  const sentence = popupSentence;
  showPopup(`<h4>The whole sentence</h4><p class="meaning">…</p>`);
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
  }
}

// ---------------------------------------------------------------- views

function render() {
  main.replaceChildren();
  crumb.textContent = '';
  if (error) main.append(el(`<div class="error">${escape(error)}</div>`));
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
    b.querySelector('button').addEventListener('click', () => go('/api/offers', {}));
    main.append(b);
    return;
  }

  main.append(el(`<p class="lead">Which one do you want to read?</p>`));
  state.offers.forEach((o, i) => {
    const card = el(`<button class="offer"><h3>${escape(o.title)}</h3><p>${escape(o.teaser)}</p></button>`);
    card.addEventListener('click', () => go('/api/choose', { index: i }));
    main.append(card);
  });

  const more = el(`<div class="row"><button class="ghost">Show me three different ones</button></div>`);
  more.querySelector('button').addEventListener('click', () => go('/api/offers', {}));
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
    go('/api/exam', {});
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

function viewExam() {
  const e = state.exam;
  crumb.textContent = `${state.story.title} — page ${state.story.pageIndex + 1}`;

  const retry = e.round > 1;
  main.append(
    el(`<p class="lead">${retry ? 'Nearly — just these left.' : 'Tell me what you understood.'}</p>`),
  );

  for (const q of e.allQuestions) {
    const r = e.results[q.id];
    if (r?.correct) {
      main.append(el(`<div class="result right"><div class="head">✓ ${escape(q.question)}</div><div>${escape(r.feedback)}</div></div>`));
    } else if (e.questions.some((p) => p.id === q.id)) {
      main.append(questionCard(q, r));
    }
  }

  const row = el(`<div class="row"><button class="primary">Check my answers</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/exam/answer', { answers: collectAnswers() }));
  main.append(row);
}

function viewBridge() {
  const b = state.bridge;
  crumb.textContent = `${state.story.title} — page ${state.story.pageIndex + 1}`;

  if (b.mode === 'mini') {
    main.append(el(`<p class="lead">Let's pin these down properly first.</p>`));
    for (const q of b.mini.questions) main.append(questionCard(q, b.mini.results[q.id]));
    const row = el(`<div class="row"><button class="primary">Check</button></div>`);
    row.querySelector('button').addEventListener('click', () => go('/api/mini/answer', { answers: collectAnswers() }));
    main.append(row);
    return;
  }

  main.append(
    el(`<p class="lead">${
      b.attempt > 1 ? 'New sentences this time. What do they mean?' : 'Last thing — these use the words you found tricky. What do they mean?'
    }</p>`),
  );

  for (const s of b.sentences) {
    main.append(
      el(`
        <div class="sentence-card">
          <p class="af">${escape(s.text)}</p>
          <input type="text" data-qid="${s.id}" placeholder="In English…" autocomplete="off" />
        </div>
      `),
    );
  }

  const row = el(`<div class="row"><button class="primary">Check</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/bridge/answer', { answers: collectAnswers() }));
  main.append(row);
}

function viewDone() {
  main.append(el(`<p class="lead">You finished <b>${escape(state.history.at(-1)?.title ?? 'the story')}</b>. Well read.</p>`));
  const row = el(`<div class="row"><button class="primary">Another story</button></div>`);
  row.querySelector('button').addEventListener('click', () => go('/api/offers', {}));
  main.append(row);
}

// ---------------------------------------------------------------- helpers

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

go('/api/state');

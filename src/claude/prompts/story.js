import { learnerBlock, contentBlock, AFRIKAANS_RULES, pron } from './level.js';

export const PAGES_PER_STORY = 3;

/**
 * The story arrives in two calls, and that is a latency decision rather than a
 * literary one.
 *
 * Writing all three pages at once measured 93 seconds on this machine, which is a
 * minute and a half of blank screen between picking a story and reading one. The
 * opening page alone comes back in roughly a third of that, and the reader then
 * spends several minutes on it and the exam - which is when the rest gets written,
 * behind them.
 *
 * `revisit` is the quiet half of the whole tool: words they have struggled with
 * before get worked into a brand-new story, because seeing a word again somewhere
 * else is what fixes it. Being re-tested on the same sentence only proves they
 * remember the sentence.
 */
export function openingPrompt({ profile, title, teaser, revisit = [] }) {
  const p = pron(profile);
  const words = revisit.slice(0, 10);
  const revisitBlock = words.length
    ? `
${p.Subj} has struggled with these words before. Work as many as you naturally can
into the story, in fresh situations - not the sentence ${p.subj} met them in. Do not
force them in and do not draw attention to them; the story must still read as a story:
${words.map((w) => `- ${w.word}${w.meaning ? ` (${w.meaning})` : ''}`).join('\n')}
`
    : '';

  return `${learnerBlock(profile)}

${AFRIKAANS_RULES}

${contentBlock(profile)}
${revisitBlock}
Write the opening of this story in Afrikaans:

Title: ${title}
It is about: ${teaser}

It will be ${PAGES_PER_STORY} pages of about ${profile.pageWords} words each. Right
now, write only PAGE ONE - plus a short plan for the rest, so the story stays on the
rails when you continue it. Write in the past tense, the way a story is normally
told. Page one must end somewhere that makes ${p.obj} want page two.

Reply with JSON only, no other text:
{
  "title": "${title}",
  "plan": "Two or three English sentences: what happens on pages two and three, and how it ends.",
  "page": "the Afrikaans text of page one",
  "used": ["which of the revisit words you actually managed to use"]
}`;
}

/** Pages two and three, written while page one is still being read. */
export function restPrompt({ profile, title, plan, page, pages = PAGES_PER_STORY - 1 }) {
  return `${learnerBlock(profile)}

${AFRIKAANS_RULES}

${contentBlock(profile)}

You are continuing the story "${title}".

Your plan for the rest was:
${plan}

Page one was:
"""
${page}
"""

Write the remaining ${pages} pages, about ${profile.pageWords} words each, same voice
and same level. The last page must finish the story properly - no cliffhanger, no
moral tacked on the end.

Reply with JSON only, no other text:
{ "pages": ["page two Afrikaans text", "page three Afrikaans text"] }`;
}

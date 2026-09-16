import { LEARNER } from './level.js';

/**
 * The end-of-page test: did she understand it, and did the words she asked about
 * stay with her.
 *
 * Vocabulary questions come from her own taps, worst first, so the test is
 * literally made of the things she did not know twenty minutes ago.
 */
export function examPrompt({ page, asked }) {
  const vocab = asked.slice(0, 8);
  const vocabBlock = vocab.length
    ? vocab
        .map(
          (w) =>
            `- ${w.word}${w.meaning ? ` (you told her: ${w.meaning})` : ''}` +
            `${w.timesAsked > 1 ? ` [she asked ${w.timesAsked} times on this page - she is not holding onto this one]` : ''}`,
        )
        .join('\n')
    : '(she did not ask about any words on this page)';

  return `${LEARNER}

She has just finished reading this page:

"""
${page}
"""

Words she stopped and asked about while reading it:
${vocabBlock}

Build her test. Two parts.

COMPREHENSION - 3 questions about what happened, ANSWERED IN ENGLISH. She is not
writing Afrikaans yet; this is checking that she understood, nothing else. Ask
things she can only answer by having followed the story - why someone did
something, what changed, what a character wanted. Do not ask anything answerable by
copying one Afrikaans word out of the text without understanding it.

VOCABULARY - one question per word above, in the order given. Ask what the word
means. For a word she asked about more than once, do not just ask for the meaning -
put it in a short new Afrikaans phrase and ask what that phrase means, so she has to
recognise it rather than recite it.

Reply with JSON only, no other text:
{
  "comprehension": [ { "id": "c1", "question": "..." } ],
  "vocabulary": [ { "id": "v1", "word": "the Afrikaans word being tested", "question": "..." } ]
}`;
}

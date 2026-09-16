import { learnerBlock, pron } from './level.js';

/**
 * The end-of-page test: was it understood, and did the words asked about stay.
 *
 * Vocabulary questions come from the learner's own taps, worst first, so the test is
 * literally made of the things they did not know twenty minutes ago.
 */
export function examPrompt({ profile, page, asked }) {
  const p = pron(profile);
  const vocab = asked.slice(0, 8);
  const vocabBlock = vocab.length
    ? vocab
        .map(
          (w) =>
            `- ${w.word}${w.meaning ? ` (you told ${p.obj}: ${w.meaning})` : ''}` +
            `${w.timesAsked > 1 ? ` [asked ${w.timesAsked} times on this page - not holding onto this one]` : ''}`,
        )
        .join('\n')
    : `(${p.subj} did not ask about any words on this page)`;

  return `${learnerBlock(profile)}

${p.Subj} has just finished reading this page:

"""
${page}
"""

Words ${p.subj} stopped and asked about while reading it:
${vocabBlock}

Build the test. Two parts.

**Exactly 3 comprehension questions, however long the page is.** A page from a real
book carries several times the content of a written story page, and asking
proportionally more about it would turn one page into an entire evening. Pick the 3
that cover the page best and let the rest go.

COMPREHENSION - 3 questions about what happened, ANSWERED IN ENGLISH. ${p.Subj} is not
writing Afrikaans yet; this is checking understanding, nothing else. Ask things that
can only be answered by having followed the page - why someone did something, what
changed, what a character wanted. Do not ask anything answerable by copying one
Afrikaans word out of the text without understanding it.

Pitch the questions at ${p.poss} age. ${p.Subj} will have the page open beside the
questions and may reread it, so do not ask for recall of a detail - ask for something
that needs the page to be understood.

VOCABULARY - one question per word above, in the order given. Ask what the word means.
For a word asked about more than once, do not just ask for the meaning - put it in a
short new Afrikaans phrase and ask what that phrase means, so it has to be recognised
rather than recited.

Reply with JSON only, no other text:
{
  "comprehension": [ { "id": "c1", "question": "..." } ],
  "vocabulary": [ { "id": "v1", "word": "the Afrikaans word being tested", "question": "..." } ]
}`;
}

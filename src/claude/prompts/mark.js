import { learnerBlock, pron } from './level.js';

/**
 * Mark what was written.
 *
 * Two things this must get right. It marks MEANING, not spelling - a learner typing
 * in a hurry marked down for "frite" learns to fear the box. And a wrong answer has
 * to point at where in the page the right one was, because being told you are wrong
 * teaches nothing on its own.
 */
export function markPrompt({ profile, page, questions, answers }) {
  const p = pron(profile);
  const items = questions
    .map(
      (q) =>
        `- id ${q.id}${q.word ? ` [word: ${q.word}]` : ''}\n  Q: ${q.question}\n  ${p.Poss} answer: ${answers[q.id] || '(blank)'}`,
    )
    .join('\n');

  return `${learnerBlock(profile)}

The page ${p.subj} read:

"""
${page}
"""

${p.Poss} answers:
${items}

Mark each one.

Mark the MEANING. If it has been understood, it is correct - bad spelling, missing
capitals, half a sentence, English phrasing that is a bit off, all still correct.
Mark it wrong only if the understanding is actually wrong or missing. A blank answer
is wrong.

For anything wrong, give the right answer, and quote the short piece of Afrikaans
from the page where it could have been found. For a vocabulary word, give the meaning
again plainly. Write to ${p.obj}, not about ${p.obj} - "you" - and keep it warm and
brief. ${p.Subj} is ${profile.age} and ${p.subj} is trying.

Reply with JSON only, no other text:
{
  "results": [
    {
      "id": "c1",
      "correct": true,
      "feedback": "one or two short sentences, written to them",
      "evidence": "the Afrikaans phrase from the page that holds the answer, or null"
    }
  ]
}`;
}

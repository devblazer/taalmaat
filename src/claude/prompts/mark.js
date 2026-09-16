import { LEARNER } from './level.js';

/**
 * Mark what she wrote.
 *
 * Two things this must get right. It marks MEANING, not spelling - she is eleven
 * and typing in a hurry, and marking her down for "frite" would teach her to fear
 * the box. And a wrong answer has to point at where in the story the right one
 * was, which is his rule: being told you are wrong teaches nothing on its own.
 */
export function markPrompt({ page, questions, answers }) {
  const items = questions
    .map((q) => `- id ${q.id}${q.word ? ` [word: ${q.word}]` : ''}\n  Q: ${q.question}\n  Her answer: ${answers[q.id] ?? '(blank)'}`)
    .join('\n');

  return `${LEARNER}

The page she read:

"""
${page}
"""

Her answers:
${items}

Mark each one.

Mark the MEANING. If she has understood it, it is correct - bad spelling, missing
capitals, half a sentence, English phrasing that is a bit off, all still correct.
Mark it wrong only if the understanding is actually wrong or missing. A blank
answer is wrong.

For anything wrong, tell her what the right answer is, and quote the short piece of
Afrikaans from the page where she could have found it. For a vocabulary word, give
the meaning again plainly. Write to her, not about her - "you" - and keep it warm
and brief. She is eleven and she is trying.

Reply with JSON only, no other text:
{
  "results": [
    {
      "id": "c1",
      "correct": true,
      "feedback": "one or two short sentences to her",
      "evidence": "the Afrikaans phrase from the page that holds the answer, or null"
    }
  ]
}`;
}

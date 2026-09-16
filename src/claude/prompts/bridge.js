import { LEARNER, AFRIKAANS_RULES } from './level.js';

/**
 * The last gate before the next page.
 *
 * She has now answered every exam question correctly - but some of those she only
 * got right on the second or third try. This puts those words back in front of her
 * inside brand-new Afrikaans she has never seen, and asks her to read it. Knowing a
 * word in the sentence you were taught it in is not knowing the word.
 *
 * `attempt` climbs every time she comes back through here, and the prompt is told
 * to write different sentences each time - otherwise she learns the sentence.
 */
export function bridgePrompt({ words, attempt = 1 }) {
  const list = words
    .map((w) => `- ${w.word}${w.meaning ? ` = ${w.meaning}` : ''}${w.struggling ? ' [she keeps losing this one]' : ''}`)
    .join('\n');

  const fresh =
    attempt > 1
      ? `\nThis is attempt ${attempt}. She has already seen sentences built from these words, so write COMPLETELY different ones - new situations, new sentence shapes. If she can pass by remembering the last set, this check is worthless.`
      : '';

  return `${LEARNER}

${AFRIKAANS_RULES}

These are the words she has been getting wrong:
${list}

Write two or three short Afrikaans sentences that use them - pack several words into
each sentence where it still sounds natural. Every word above must appear at least
once across the set. The sentences must be ordinary, natural Afrikaans that stands on
its own; do not write a word-list dressed up with punctuation.

Keep everything else in the sentences easy, so the only hard part is the words being
tested.${fresh}

Reply with JSON only, no other text:
{
  "sentences": [
    { "id": "b1", "text": "the Afrikaans sentence", "targets": ["which of the words above appear in it"] }
  ]
}`;
}

/**
 * Mark the bridge per WORD, not per sentence.
 *
 * What comes next depends on which words she is still missing, so a sentence she
 * half-understood has to resolve into "this word yes, that word no".
 */
export function bridgeMarkPrompt({ sentences, answers }) {
  const items = sentences
    .map((s) => `- id ${s.id}\n  Afrikaans: ${s.text}\n  Testing: ${s.targets.join(', ')}\n  Her English: ${answers[s.id] ?? '(blank)'}`)
    .join('\n');

  return `${LEARNER}

She was shown new Afrikaans sentences and asked what each one means in English.

${items}

For each sentence, decide whether her English shows she understood it. Then give one
verdict per word being tested - one entry per word, not per sentence it appears in.

A word counts as CORRECT if she showed she knew it in ANY sentence it appeared in,
even where she missed other sentences containing it. She has demonstrated that word;
marking it wrong because she fell down elsewhere is untrue, and it is the fastest way
to make her stop believing this thing.

A word counts as WRONG only if she never showed she knew it - she skipped every
sentence it was in, or got that word's meaning wrong everywhere it appeared. A
sentence she understood overall while plainly guessing one word from context is not
evidence for that word.

Mark meaning, not spelling or phrasing. List every word being tested exactly once.

Reply with JSON only, no other text:
{
  "sentences": [
    { "id": "b1", "correct": true, "feedback": "one short warm line to her", "translation": "what it actually meant" }
  ],
  "words": [ { "word": "...", "correct": true } ]
}`;
}

/** Straight back to drilling the words she just missed, then the bridge again. */
export function miniPrompt({ words }) {
  return `${LEARNER}

She has just failed to read these words inside new sentences:
${words.map((w) => `- ${w.word}${w.meaning ? ` = ${w.meaning}` : ''}`).join('\n')}

Ask her one short question per word to drill the meaning back in. Vary the shape -
some straight "what does X mean", some giving a tiny Afrikaans phrase and asking
what it means. She answers in English.

Reply with JSON only, no other text:
{ "vocabulary": [ { "id": "m1", "word": "...", "question": "..." } ] }`;
}

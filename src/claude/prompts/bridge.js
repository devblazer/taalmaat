import { LEARNER, AFRIKAANS_RULES } from './level.js';

/**
 * The last gate before the next page.
 *
 * She has now answered every exam question correctly - but some of those she only
 * got right on the second or third try. This puts those words back in front of her
 * inside brand-new Afrikaans she has never seen, and asks her to read it. Knowing a
 * word in the sentence you were taught it in is not knowing the word.
 *
 * She is asked for the WORD, not the sentence. The sentence is context she reads,
 * not a translation exercise - one word tested across three sentences meant three
 * full translations for one word, which is a pile of work for nothing. Hence one
 * sentence per word, and `asWritten` so the screen can point at the word she means.
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

Write short Afrikaans sentences that put those words in a new situation. The
sentences must be ordinary, natural Afrikaans that stands on its own; do not write a
word-list dressed up with punctuation.

Rules about which words go where, and they matter:

- EVERY word above is tested exactly ONCE, in exactly ONE sentence. Never test the
  same word in two sentences - she would be answering the same question twice.
- A sentence may test more than one word if they sit together naturally. Two or three
  words in one good sentence is better than three thin sentences.
- Write as few sentences as it takes to cover the words once each. One word means one
  sentence.
- Keep everything else in the sentence easy, so the only hard part is the word being
  tested.

For each word, also give it back exactly as it appears IN that sentence - the same
spelling, the same capitals, the same ending. The screen highlights that word, and it
can only find it if you copy it across character for character.${fresh}

Reply with JSON only, no other text:
{
  "sentences": [
    {
      "id": "b1",
      "text": "the Afrikaans sentence",
      "targets": [ { "word": "the word from the list", "asWritten": "that word exactly as it appears in this sentence" } ]
    }
  ]
}`;
}

/**
 * Mark the bridge per WORD, not per sentence.
 *
 * What comes next depends on which words she is still missing, so a sentence she
 * half-understood has to resolve into "this word yes, that word no".
 */
export function bridgeMarkPrompt({ asked, answers }) {
  const items = asked
    .map(
      (a) =>
        `- word: ${a.word}\n  In the sentence: ${a.sentence}\n  Her English for that word: ${answers[a.word] || '(blank)'}`,
    )
    .join('\n');

  return `${LEARNER}

She was shown Afrikaans sentences she had never seen, with one word highlighted in
each, and asked what that highlighted word means in English.

${items}

Mark each word. She is answering about the word, not the sentence, so judge only
whether she has the meaning of that word as it is used there.

Correct is: the right meaning, however roughly she put it - a synonym, a near-miss in
English phrasing, bad spelling, one word instead of a phrase. She is eleven and typing
fast. Blank is wrong. A guess that lands on the wrong meaning is wrong.

For anything wrong, tell her the meaning plainly and point at how the sentence could
have helped her work it out. Write to her - "you" - warm and brief.

Reply with JSON only, no other text:
{
  "words": [
    {
      "word": "...",
      "correct": true,
      "feedback": "one or two short sentences to her",
      "translation": "what the whole sentence meant, so she can see the word in place"
    }
  ]
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

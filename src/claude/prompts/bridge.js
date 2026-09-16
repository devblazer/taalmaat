import { learnerBlock, AFRIKAANS_RULES, pron } from './level.js';

/**
 * The last gate before the next page.
 *
 * Every exam question has now been answered correctly - but some only on the second
 * or third try. This puts those words back in front of the learner inside brand-new
 * Afrikaans they have never seen. Knowing a word in the sentence you were taught it
 * in is not knowing the word.
 *
 * The question is about the WORD, not the sentence. The sentence is context to read,
 * not a translation exercise - one word tested across three sentences meant three
 * full translations for one word. Hence one sentence per word, and `asWritten` so
 * the screen can point at the word being asked about.
 *
 * `attempt` climbs on every return trip, and the prompt is told to write different
 * sentences each time - otherwise the sentence is what gets learned.
 */
export function bridgePrompt({ profile, words, attempt = 1 }) {
  const p = pron(profile);
  const list = words
    .map((w) => `- ${w.word}${w.meaning ? ` = ${w.meaning}` : ''}${w.struggling ? ' [keeps losing this one]' : ''}`)
    .join('\n');

  const fresh =
    attempt > 1
      ? `\nThis is attempt ${attempt}. ${p.Subj} has already seen sentences built from these words, so write COMPLETELY different ones - new situations, new sentence shapes. If ${p.subj} can pass by remembering the last set, this check is worthless.`
      : '';

  return `${learnerBlock(profile)}

${AFRIKAANS_RULES}

These are the words ${p.subj} has been getting wrong:
${list}

Write short Afrikaans sentences that put those words in a new situation. The
sentences must be ordinary, natural Afrikaans that stands on its own; do not write a
word-list dressed up with punctuation.

Rules about which words go where, and they matter:

- EVERY word above is tested exactly ONCE, in exactly ONE sentence. Never test the
  same word in two sentences - that is the same question twice.
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

export function bridgeMarkPrompt({ profile, asked, answers }) {
  const p = pron(profile);
  const items = asked
    .map(
      (a) =>
        `- word: ${a.word}\n  In the sentence: ${a.sentence}\n  ${p.Poss} English for that word: ${answers[a.word] || '(blank)'}`,
    )
    .join('\n');

  return `${learnerBlock(profile)}

${p.Subj} was shown Afrikaans sentences ${p.subj} had never seen, with one word
highlighted in each, and asked what that highlighted word means in English.

${items}

Mark each word. ${p.Subj} is answering about the word, not the sentence, so judge only
whether ${p.subj} has the meaning of that word as it is used there.

Correct is: the right meaning, however roughly put - a synonym, a near-miss in English
phrasing, bad spelling, one word instead of a phrase. ${p.Subj} is ${profile.age} and
typing fast. Blank is wrong. A guess that lands on the wrong meaning is wrong.

For anything wrong, give the meaning plainly and point at how the sentence could have
helped work it out. Write to ${p.obj} - "you" - warm and brief.

Reply with JSON only, no other text:
{
  "words": [
    {
      "word": "...",
      "correct": true,
      "feedback": "one or two short sentences, written to them",
      "translation": "what the whole sentence meant, so the word can be seen in place"
    }
  ]
}`;
}

/** Straight back to drilling the words just missed, then the bridge again. */
export function miniPrompt({ profile, words }) {
  const p = pron(profile);

  return `${learnerBlock(profile)}

${p.Subj} has just failed to read these words inside new sentences:
${words.map((w) => `- ${w.word}${w.meaning ? ` = ${w.meaning}` : ''}`).join('\n')}

Ask one short question per word to drill the meaning back in. Vary the shape - some
straight "what does X mean", some giving a tiny Afrikaans phrase and asking what it
means. ${p.Subj} answers in English.

Reply with JSON only, no other text:
{ "vocabulary": [ { "id": "m1", "word": "...", "question": "..." } ] }`;
}

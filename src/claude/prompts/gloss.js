import { learnerBlock, AFRIKAANS_RULES, pron } from './level.js';

/**
 * A word was tapped.
 *
 * `timesAsked` is how the "special attention" rule reaches the learner at the moment
 * it actually helps. The second time the same word is asked about, repeating the same
 * definition has already been shown not to work, so the prompt is told to come at it
 * from somewhere else and hand over something to hang it on.
 */
export function wordPrompt({ profile, word, sentence, timesAsked = 0 }) {
  const p = pron(profile);
  const again =
    timesAsked >= 1
      ? `
${p.Subj} has asked about this exact word ${timesAsked === 1 ? 'once' : `${timesAsked} times`} already.
Telling ${p.obj} the same thing again clearly did not stick. Explain it a different
way this time, and give ${p.obj} a hook - what the word is related to, what it sounds
like, a picture to attach it to. Say gently that ${p.subj} has met it before; do not
make ${p.obj} feel caught out.`
      : '';

  return `${learnerBlock(profile)}

A word tapped while reading. Explain it.

Word: ${word}
The sentence it is in: ${sentence}
${again}

Explain what it means HERE, in this sentence - not every meaning it can have.
Keep it to one or two short English sentences. If it is a form of another word
(a past tense, a plural, a compound), say what the base word is, because that is
the part worth remembering.

Reply with JSON only, no other text:
{
  "meaning": "short English meaning as used here",
  "lemma": "base form of the word, or null",
  "note": "one short helpful line - a hook, a related word, or how the form was built. null if there is nothing useful to add.",
  "seenBefore": ${timesAsked >= 1}
}`;
}

/** Still stuck after the words - explain the whole sentence. */
export function sentencePrompt({ profile, sentence }) {
  const p = pron(profile);

  return `${learnerBlock(profile)}

${AFRIKAANS_RULES}

${p.Subj} read this Afrikaans sentence and still does not understand it after looking
up the words. Explain the whole thing.

Sentence: ${sentence}

Give a natural English translation - what it actually means, not word-for-word.
Then, only if there is genuinely something in HOW the sentence is built that tripped
${p.obj} up (verbs at the end, nie...nie wrapped around it, a word order English does
not have), explain that one thing in plain English. If the sentence is straightforward
and ${p.subj} just did not know the words, say so and skip it.

Reply with JSON only, no other text:
{
  "translation": "natural English meaning",
  "structure": "the one thing about how it is built that is worth knowing, or null",
  "words": [ { "af": "word", "en": "meaning" } ]
}`;
}

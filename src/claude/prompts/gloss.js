import { LEARNER, AFRIKAANS_RULES } from './level.js';

/**
 * She tapped a word.
 *
 * `timesAsked` is how his "special attention" rule reaches her at the moment it
 * actually helps. The second time she asks the same word, repeating the same
 * definition has already been shown not to work, so the prompt is told to come at
 * it from somewhere else and hand her something to hang it on.
 */
export function wordPrompt({ word, sentence, timesAsked = 0 }) {
  const again =
    timesAsked >= 1
      ? `
She has asked about this exact word ${timesAsked === 1 ? 'once' : `${timesAsked} times`} already.
Telling her the same thing again clearly did not stick. Explain it a different way
this time, and give her a hook - what the word is related to, what it sounds like,
a picture to attach it to. Say gently that she has met it before; do not make her
feel caught out.`
      : '';

  return `${LEARNER}

A word she tapped while reading. Explain it.

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

/** She still does not get it after the words - explain the whole sentence. */
export function sentencePrompt({ sentence }) {
  return `${LEARNER}

${AFRIKAANS_RULES}

She read this Afrikaans sentence and still does not understand it after looking up
the words. Explain the whole thing.

Sentence: ${sentence}

Give her a natural English translation - what it actually means, not word-for-word.
Then, only if there is genuinely something in HOW the sentence is built that tripped
her up (verbs at the end, nie...nie wrapped around it, a word order English does not
have), explain that one thing in plain English. If the sentence is straightforward
and she just did not know the words, say so and skip it.

Reply with JSON only, no other text:
{
  "translation": "natural English meaning",
  "structure": "the one thing about how it is built that is worth knowing, or null",
  "words": [ { "af": "word", "en": "meaning" } ]
}`;
}

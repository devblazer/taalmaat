import { learnerBlock } from './level.js';

/**
 * Repair a scan, and nothing else.
 *
 * OCR of a printed page is good but not perfect: it breaks lines mid-sentence,
 * splits hyphenated words across lines, and confuses characters that look alike.
 * Left alone those artifacts become the text a learner studies, and a mangled word
 * gets learned as a real one.
 *
 * The hard rule is that this repairs, never writes. The text belongs to a book the
 * family owns; the job is to make the scan match the page, not to improve it,
 * shorten it, or carry on from it. Anything genuinely unreadable is marked rather
 * than guessed, so a person can check it against the photo.
 */
export function tidyPrompt({ profile, raw, confidence }) {
  const shaky =
    confidence && confidence < 80
      ? `\nThe scan came back at ${Math.round(confidence)}% confidence, which is low - expect more errors than usual, and be readier to mark something unreadable than to guess at it.`
      : '';

  return `${learnerBlock(profile)}

Below is the raw output of optical character recognition, run on a photograph of a
page from a printed Afrikaans book the family owns. Your job is to repair the SCAN so
that it matches what is actually printed on that page.${shaky}

Repair only these things:

- Line breaks that fall in the middle of a sentence because of where the line ended
  on the page. Join them back into flowing paragraphs. Keep real paragraph breaks.
- Words split across a line break with a hyphen. Rejoin them into the single word.
- Characters OCR confuses: l / I / 1, rn / m, O / 0, c / e, and missing or wrong
  accents. Afrikaans uses e, e, e, o, u and so on - restore an accent where the word
  plainly needs one, because an unaccented word is a different word.
- Obvious stray marks read as punctuation.

You must NOT:

- Reword, rephrase, modernise, simplify or improve anything. Not one word.
- Add, remove, summarise, shorten, expand, or continue the text.
- Fix the author's grammar, punctuation or style. If the page says it, it stays.
- Guess at a word you cannot make out. Write [?] instead and let a person check it
  against the photo.
- Include page numbers, running headers, chapter numbers or footnotes that are
  fragments of the page furniture rather than part of the prose.

If the scan is too poor to repair honestly, say so rather than inventing a page.

Raw OCR output:
"""
${raw}
"""

Reply with JSON only, no other text:
{
  "text": "the repaired page text, paragraphs separated by a blank line",
  "usable": true,
  "unreadable": 0,
  "note": "one short English line for whoever scanned it - what you had to fix, or what looks wrong. null if it was clean."
}`;
}

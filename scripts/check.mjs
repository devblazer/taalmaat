/**
 * Print a sample of everything the tool would put in front of a learner, so a human
 * can read the Afrikaans.
 *
 * Nothing here asserts. The failure this catches is grammatical Afrikaans that is
 * subtly wrong, and no test in this repo can see that - only a person can, and
 * ideally a person who speaks it. Run it after touching anything in
 * src/claude/prompts/ and read the output.
 *
 *   node scripts/check.mjs           # every learner
 *   node scripts/check.mjs summer    # just one
 */
import { ask, warmUp } from '../src/claude/ask.js';
import { PROFILES, getProfile } from '../src/profiles.js';
import { offerPrompt } from '../src/claude/prompts/offer.js';
import { openingPrompt } from '../src/claude/prompts/story.js';
import { wordPrompt } from '../src/claude/prompts/gloss.js';

const only = process.argv[2];
const people = only ? [getProfile(only)].filter(Boolean) : PROFILES;
if (!people.length) {
  console.error(`no such learner: ${only}`);
  process.exit(2);
}

const lap = (label, t) => console.log(`\n[${((Date.now() - t) / 1000).toFixed(1)}s] ${label}\n${'-'.repeat(64)}`);
warmUp();

for (const profile of people) {
  console.log(`\n${'='.repeat(64)}\n  ${profile.name.toUpperCase()} - ${profile.age}, Grade ${profile.grade}\n${'='.repeat(64)}`);

  let t = Date.now();
  const offers = await ask(offerPrompt({ profile, recentTitles: [] }), { fast: true, what: 'offers' });
  lap('THREE STORIES OFFERED', t);
  offers.forEach((o, i) => console.log(`${i + 1}. ${o.title}\n   ${o.teaser}`));

  t = Date.now();
  const story = await ask(openingPrompt({ profile, title: offers[0].title, teaser: offers[0].teaser }), { what: 'story' });
  lap(`PAGE ONE OF "${story.title}"  <- the wait after picking`, t);
  console.log(story.page);

  const sentence = story.page.split(/(?<=[.!?])\s+/).find((s) => s.length > 40) ?? story.page;
  const word = sentence.match(/\p{L}{6,}/u)?.[0] ?? 'die';

  t = Date.now();
  const first = await ask(wordPrompt({ profile, word, sentence, timesAsked: 0 }), { fast: true, what: 'word' });
  lap(`TAPS "${word}"`, t);
  console.log(`${first.meaning}${first.lemma ? `   (from ${first.lemma})` : ''}\n${first.note ?? ''}`);
}

process.exit(0);

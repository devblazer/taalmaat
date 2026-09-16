/**
 * Print a sample of everything the tool would put in front of her, so a human can
 * read the Afrikaans.
 *
 * Nothing here asserts. The failure this catches is grammatical Afrikaans that is
 * subtly wrong, and no test in this repo can see that - only a person can, and
 * ideally a person who speaks it. Run it after touching anything in
 * src/claude/prompts/ and read the output.
 *
 *   node scripts/check.mjs
 */
import { ask, warmUp } from '../src/claude/ask.js';
import { offerPrompt } from '../src/claude/prompts/offer.js';
import { openingPrompt } from '../src/claude/prompts/story.js';
import { wordPrompt } from '../src/claude/prompts/gloss.js';
import { bridgePrompt } from '../src/claude/prompts/bridge.js';

const lap = (label, t) => console.log(`\n[${((Date.now() - t) / 1000).toFixed(1)}s] ${label}\n${'-'.repeat(60)}`);

warmUp();

let t = Date.now();
const offers = await ask(offerPrompt({ recentTitles: [] }), { fast: true, what: 'offers' });
lap('THREE STORIES SHE COULD PICK', t);
offers.forEach((o, i) => console.log(`${i + 1}. ${o.title}\n   ${o.teaser}`));

t = Date.now();
const story = await ask(openingPrompt({ title: offers[0].title, teaser: offers[0].teaser }), { what: 'story' });
lap(`PAGE ONE OF "${story.title}"  <- this is her wait`, t);
console.log(story.page);

const sentence = story.page.split(/(?<=[.!?])\s+/).find((s) => s.length > 40) ?? story.page;
const word = sentence.match(/\p{L}{6,}/u)?.[0] ?? 'die';

t = Date.now();
const first = await ask(wordPrompt({ word, sentence, timesAsked: 0 }), { fast: true, what: 'word' });
lap(`SHE TAPS "${word}"`, t);
console.log(`${first.meaning}${first.lemma ? `   (from ${first.lemma})` : ''}\n${first.note ?? ''}`);

t = Date.now();
const again = await ask(wordPrompt({ word, sentence, timesAsked: 2 }), { fast: true, what: 'word' });
lap(`SHE TAPS "${word}" FOR THE THIRD TIME  <- must come at it differently`, t);
console.log(`${again.meaning}\n${again.note ?? ''}`);

t = Date.now();
const bridge = await ask(
  bridgePrompt({
    words: [
      { word: 'langsaan', meaning: 'next door', struggling: true },
      { word: 'beurtkrag', meaning: 'load shedding', struggling: false },
      { word: 'geskrik', meaning: 'got a fright', struggling: true },
    ],
    attempt: 1,
  }),
  { what: 'bridge' },
);
lap('BRIDGE SENTENCES FOR WORDS SHE KEEPS LOSING', t);
for (const s of bridge.sentences) console.log(`${s.text}\n   tests: ${s.targets.join(', ')}`);

process.exit(0);

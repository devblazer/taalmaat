# Taalmaat

An Afrikaans reading tutor for one eleven-year-old who leaned on AI translation for two
years and never learned the words.

She picks a story, reads it, and taps any word she doesn't know. At the end of each page
she is tested on what happened — and on every word she tapped. She retries until it is
all right. Then, before she is allowed on, the words she got wrong come back inside
brand-new Afrikaans sentences she has never seen, because knowing a word in the sentence
you were taught it in is not knowing the word.

## Running it

```
npm install
npm start
```

Then open <http://localhost:4780>. Her progress is in `data/`, which is gitignored — it
is hers, not the project's.

It needs the `claude` CLI installed and logged in. It runs on that login, not on an API
key, and it never asks for one.

## How it decides what she doesn't know

Everything hangs off one signal: **what she taps**. `src/store/words.js` is the word bank
and the only place that judges her.

- A word tapped **twice in one story** is a word she was told and did not keep. That is
  the loud signal, and it feeds everything downstream.
- A word she gets wrong **twice** counts the same way.
- Either makes her `struggling`, and `attention()` ranks how loudly a word should shout.

Attention decides three things: which words get tested, which words get packed into the
bridge sentences, and which words are quietly worked into the *next* story she reads. That
last one is the part that actually makes vocabulary stick — a word met again somewhere
new, weeks later, with no announcement.

Words she gets right go quiet on a widening schedule (1, 3, 7, 21, 60 days). Words she
gets wrong come straight back.

## The loop

```
choose → read → exam → (retry until clean) → bridge → next page
                                               ↓ fail
                                        mini exam → fresh bridge sentences
```

The **bridge** is the gate before the next page, and it only opens for words that actually
gave her trouble. If she read the page cleanly there is nothing to prove and she goes
straight on. If she fails it, she drills those words and then gets **different sentences** —
regenerating them matters, because a repeated sentence tests memory of the sentence.

## Two models, and why

| | |
|---|---|
| `claude-haiku-4-5` | word and sentence lookups — she is waiting, and it is a dictionary answer |
| `claude-opus-5` | anything that *writes* Afrikaans — stories, bridge sentences, marking |

The split is about what an error costs. A vague gloss she can ask about again. A malformed
Afrikaans sentence she quietly learns as correct.

## Speed

Both Claude processes are started when the server boots and kept alive across turns
(`src/claude/session.js`). Measured on this machine:

| | |
|---|---|
| cold spawn, per call | **~6.5s** — what it costs to *not* do this |
| warm turn | **~1s** |
| word tap | 1.6–2.0s |
| building an exam | ~5s |
| page one of a story | **~23s** — her wait after picking |
| pages two and three | ~32s more, written behind her while she reads page one |

Writing all three pages in one call measured **93 seconds**, which is a minute and a half
of blank screen. That is why the story arrives in two calls; `src/claude/prompts/story.js`
explains the split.

A session is thrown away after a dozen turns, because context piles up and every lookup
would otherwise be slower than the last.

## Checking the Afrikaans

```
node scripts/check.mjs
```

Prints a sample of everything the tool would show her. It asserts nothing, on purpose —
the failure mode that matters is Afrikaans that is fluent and subtly wrong, and no test
here can see that. A person has to read it, ideally one who speaks it.

`/api/report` returns her whole word bank — what she has asked about, how often, what she
keeps missing. That is the page to show a teacher, and the only realistic way to catch this
thing teaching her something wrong.

## Known holes

- **Nobody verifies the Afrikaans.** It reads as correct and idiomatic, with real South
  African register, but neither the author of this tool nor its user can check it. The word
  bank export exists so someone who can, occasionally does.
- **One learner.** No accounts, no sign-in. `data/` is one child's progress.
- **Stories are generated, not sourced.** Openly-licensed human-written Afrikaans does exist
  (African Storybook, Global Digital Library, Nal'ibali) but the volume sits at
  levels pitched well below an eleven-year-old's interests. Ingesting those as an
  alternative source is the obvious next move if generated text ever disappoints.
- **No audio.** Afrikaans pronunciation is a real part of the subject and none of it is here.

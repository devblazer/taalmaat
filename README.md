# Taalmaat

An Afrikaans reading tutor for two learners who can read the grammar and don't have the
words.

You pick a story, read it, and tap any word you don't know. At the end of each page you
are tested on what happened — and on every word you tapped. You retry until it is all
right. Then, before you are allowed on, the words you got wrong come back inside
brand-new Afrikaans sentences you have never seen, because knowing a word in the sentence
you were taught it in is not knowing the word.

## The learners

`src/profiles.js` holds them. A profile is not a name on a folder — it is the level
everything is pitched at, and every prompt is built from it.

| | | |
|---|---|---|
| **Erin** | 11, Grade 6, Afrikaans FAL | short sentences, everyday words, nothing abstract |
| **Summer** | 16, Grade 11, Afrikaans FAL | full grammar, long sentences; the work is vocabulary and idiom |

They share the machinery and nothing else — separate word banks, progress and stories,
under `data/<name>/`. The difference is visible in what they get offered: a lost phone
and a stray dog for one, a student election and what a friend's remark costs for the
other.

Add someone by copying a block in `src/profiles.js`. Set `pronouns` to what the person
actually uses rather than guessing from the name — the prompts use it.

## Running it

```
npm install
npm start
```

Then open <http://localhost:4780> and pick who is reading. Progress lives in
`data/<name>/`, which is gitignored — it belongs to them, not to the project.

It needs the `claude` CLI installed and logged in. It runs on that login, not on an API
key, and it never asks for one.

## How it decides what they don't know

Everything hangs off one signal: **what gets tapped**. `src/store/words.js` is the word
bank, one per learner, and the only place that judges anyone.

- A word tapped **twice in one story** is a word that was explained and did not stay.
  That is the loud signal, and it feeds everything downstream.
- A word got wrong **twice** counts the same way.
- Either marks it `struggling`, and `attention()` ranks how loudly a word should shout.

Attention decides three things: which words get tested, which words get packed into the
bridge sentences, and which words are quietly worked into the *next* story. That last one
is the part that actually makes vocabulary stick — a word met again somewhere new, weeks
later, with no announcement.

Words got right go quiet on a widening schedule (1, 3, 7, 21, 60 days). Words got wrong
come straight back.

## The loop

```
choose → read → exam → (retry until clean) → bridge → next page
                                               ↓ fail
                                        mini exam → fresh bridge sentences
```

The **bridge** is the gate before the next page, and it only opens for words that actually
gave trouble. A page read cleanly has nothing to prove and goes straight on. A failed
bridge means drilling those words and then **different sentences** — regenerating them
matters, because a repeated sentence tests memory of the sentence.

Each word is tested in exactly one sentence, and that word is highlighted in it. The
sentence is context to read, not a translation exercise.

## Two models, and why

| | |
|---|---|
| `claude-haiku-4-5` | word and sentence lookups — someone is waiting, and it is a dictionary answer |
| `claude-opus-5` | anything that *writes* Afrikaans — stories, bridge sentences, marking |

The split is about what an error costs. A vague gloss can be asked about again. A malformed
Afrikaans sentence gets quietly learned as correct.

## Speed

Both Claude processes are started when the server boots and kept alive across turns
(`src/claude/session.js`). Measured on this machine:

| | |
|---|---|
| cold spawn, per call | **~6.5s** — what it costs to *not* do this |
| warm turn | **~1s** |
| word tap | 1.6–2.0s |
| building an exam | ~5s |
| page one of a story | **~23s** — the wait after picking |
| pages two and three | ~32s more, written behind them while page one is read |

Writing all three pages in one call measured **93 seconds**, which is a minute and a half
of blank screen. That is why the story arrives in two calls; `src/claude/prompts/story.js`
explains the split.

A session is thrown away after a dozen turns, because context piles up and every lookup
would otherwise be slower than the last.

## Checking the Afrikaans

```
node scripts/check.mjs
```

Prints a sample for every learner, or one named learner (`node scripts/check.mjs summer`). It asserts nothing, on purpose —
the failure mode that matters is Afrikaans that is fluent and subtly wrong, and no test
here can see that. A person has to read it, ideally one who speaks it.

`/api/report?who=<name>` returns that learner's whole word bank — what they asked about, how
often, what they keep missing. That is the page to show a teacher, and the only realistic
way to catch this thing teaching them something wrong.

## Known holes

- **Nobody verifies the Afrikaans.** It reads as correct and idiomatic, with real South
  African register, but neither the author of this tool nor its users can check it. The word
  bank export exists so someone who can, occasionally does.
- **No sign-in.** Picking a learner is a button, not a login. Deliberate: it is a family
  tool on one machine, and a password would cost more than it buys.
- **No import path yet.** Both learners can be offered generated stories; bringing in a
  page from their own book (photograph, OCR, correct, read) is the next piece.
- **Stories are generated, not sourced.** Openly-licensed human-written Afrikaans does exist
  (African Storybook, Global Digital Library, Nal'ibali) but the volume sits at levels pitched
  well below even the younger learner's interests, let alone a Grade 11's.
- **No audio.** Afrikaans pronunciation is a real part of the subject and none of it is here.

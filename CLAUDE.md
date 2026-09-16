# Taalmaat

An Afrikaans reading tutor for the owner's eleven-year-old daughter. Read `README.md`
first — it has the loop, the measured timings and the known holes.

## Who it is for, and what that changes

One child, Afrikaans First Additional Language, about Grade 6. She reads Afrikaans; she
does not write it yet, so **every answer she types is in English** and marking judges
meaning, never spelling.

Nobody in her house speaks Afrikaans. That is the constraint behind most decisions here:
this tool is her only source of correct Afrikaans, and **neither she nor her parents can
tell when it is wrong**. Fluent, idiomatic, subtly incorrect Afrikaans is the worst
failure this project has, and nothing automated catches it.

## House rules

- **She must never see that Claude is involved.** No chat box, no free-text prompt, no
  model names, no "AI" anywhere in the UI. This is a safeguard, not polish — she got into
  this position by letting a chatbot do the work, and a visible one invites her to try
  again.
- **The Afrikaans quality bar lives in one file.** `src/claude/prompts/level.js` holds who
  she is, the grammar rules, and the content rules. Every prompt imports it. If the story
  is written at one level and tested at another, the tool teaches her she is worse at this
  than she is.
- **After touching anything in `src/claude/prompts/`, run `node scripts/check.mjs` and
  read the output.** It asserts nothing. You are the test.
- **Marking is generous about spelling and strict about meaning.** She is eleven and
  typing fast. Marking her down for `frite` teaches her to fear the box.
- **Never mark a word wrong that she demonstrably got right.** This was a real bug: a word
  appearing in two bridge sentences collapsed to the worst verdict, so a word she had just
  translated correctly came back marked wrong. See the per-word rules in
  `src/claude/prompts/bridge.js`.
- **Bridge sentences are regenerated every attempt.** If she can pass by remembering the
  last set, the check is worthless. `attempt` is passed to the prompt for exactly this.
- **The bridge asks for the word, never the sentence, and marks the word on screen.**
  The sentence is context she reads, not a translation exercise. Each word is tested in
  exactly one sentence — testing one word across three meant three full translations for
  one word. `asWritten` carries the word's exact surface form so the screen can highlight
  it; without that she is staring at a wall of Afrikaans with no idea what is being asked.
- **`settingSources: []` on every call.** Without it the SDK loads `~/.claude` and any
  nearby `CLAUDE.md`, and a child's tutor inherits some other project's house rules. No
  tools either — this is text in, text out, not an agent.

## Shape

```
src/claude/     session.js keeps one process warm per model; ask.js is the only caller
src/claude/prompts/   one file per kind of request; level.js is shared by all of them
src/store/      words.js is the word bank and the only thing that judges her
src/session/    flow.js is the state machine: reading -> exam -> retry -> bridge -> mini
src/server.js   every route does the thing and returns the whole state
web/            no build step, no framework
```

`flow.js` returns the **entire state** from every route, so the screen never computes what
changed and a reload mid-exam puts her back exactly where she was. She will close the lid.

## The Agent SDK, as actually installed

Version 0.1.77 does **not** export `startup()`, whatever the docs say — check before using
anything from them. `unstable_v2_createSession` exists but its options are too thin
(no `settingSources`), so this project uses stable `query()` with a streaming-input
channel to hold a session open. `src/claude/session.js` is that, and it is the trickiest
code here.

Cold spawn is ~6.5s and a warm turn is ~1s. Anything that makes her wait on a cold spawn
is a regression.

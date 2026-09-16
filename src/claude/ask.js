import { WarmSession } from './session.js';

export const FAST = 'claude-haiku-4-5';   // lookups: she is waiting, and it is a dictionary answer
export const CAREFUL = 'claude-opus-5';   // anything that writes Afrikaans she will learn from

/**
 * Settings shared by every call.
 *
 * `settingSources: []` matters more than it looks: without it the SDK loads
 * ~/.claude and whatever CLAUDE.md, skills and hooks live near the working
 * directory, and a tutor for an eleven-year-old inherits some other project's
 * house rules. No tools, no file access - this is text in, text out, not an agent.
 */
const BASE = {
  settingSources: [],
  allowedTools: [],
  permissionMode: 'default',
};

const sessions = {
  fast: new WarmSession({ model: FAST, options: BASE, maxTurns: 12 }),
  careful: new WarmSession({ model: CAREFUL, options: BASE, maxTurns: 8, turnTimeoutMs: 180_000 }),
};

/** Start both processes at boot so the first thing she does is not the slow one. */
export function warmUp() {
  sessions.fast.warm();
  sessions.careful.warm();
}

/** Models are told to answer in JSON; this survives them fencing or prefacing it. */
function parseJson(text, what) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) throw new Error(`${what}: no JSON in reply: ${text.slice(0, 200)}`);
  const end = body.lastIndexOf(body[start] === '{' ? '}' : ']');
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (err) {
    throw new Error(`${what}: unparseable JSON (${err.message}): ${body.slice(0, 200)}`);
  }
}

/**
 * One prompt in, one parsed JSON value out.
 *
 * `fast` picks the model, not the mechanism - both sessions are warm. The split is
 * about what an error costs: a vague gloss she can ask about again, a malformed
 * Afrikaans sentence she quietly learns as correct.
 */
export async function ask(prompt, { fast = false, what = 'claude' } = {}) {
  const text = (await sessions[fast ? 'fast' : 'careful'].ask(prompt)).trim();
  if (!text) throw new Error(`${what}: empty reply`);
  return parseJson(text, what);
}

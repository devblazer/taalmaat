/**
 * Turn an internal failure into something worth showing a child.
 *
 * Everything in here exists because the alternative was real: `exam: unparseable
 * JSON (Unexpected token <)` rendered on screen for an eleven-year-old to read. She
 * cannot act on that, it tells her the thing is broken in a way she caused, and it
 * puts the machinery on display - which this project is meant not to do.
 *
 * Two audiences, always. `kid` is what she sees. `detail` is what a parent reads in
 * the server log when she says "it did the sad face again".
 */

const KINDS = [
  {
    code: 'setup',
    // The CLI is missing or not signed in. Not her problem and not retryable by her.
    match: /ENOENT|spawn|not logged|unauthor|authenticat|credential|api key|no such file/i,
    kid: 'This needs a grown-up to start it up again.',
    canRetry: false,
  },
  {
    code: 'slow',
    match: /no reply within|timed? ?out|ETIMEDOUT/i,
    kid: 'That took too long to come back.',
    canRetry: true,
  },
  {
    code: 'dropped',
    match: /session ended|ECONNRESET|EPIPE|closed/i,
    kid: 'That got lost on the way.',
    canRetry: true,
  },
  {
    code: 'muddled',
    match: /unparseable JSON|no JSON in reply|empty reply/i,
    kid: 'That came back muddled.',
    canRetry: true,
  },
  {
    code: 'busy',
    match: /rate limit|429|overloaded|capacity/i,
    kid: 'Things are busy right now.',
    canRetry: true,
  },
];

const GENERIC = {
  code: 'unknown',
  kid: 'Something went wrong there.',
  canRetry: true,
};

/**
 * `err.kid` wins - it marks a message written deliberately for her at the throw
 * site, like "that story is not on offer any more", which needs no translation.
 */
export function explain(err) {
  const message = err?.message ?? String(err);

  if (err?.kid) return { code: 'expected', kid: err.kid, canRetry: true, detail: message };

  const kind = KINDS.find((k) => k.match.test(message)) ?? GENERIC;
  return { code: kind.code, kid: kind.kid, canRetry: kind.canRetry, detail: message };
}

/** Throw something she can read as-is. */
export function tellHer(kid, detail = kid) {
  const err = new Error(detail);
  err.kid = kid;
  return err;
}

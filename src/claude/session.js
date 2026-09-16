import { query } from '@anthropic-ai/claude-agent-sdk';

/**
 * One Claude process, kept alive across turns.
 *
 * Measured on this machine: spawning costs about 3.7 seconds, and every turn after
 * that is about one second. A word tap has to feel like a dictionary, so the
 * process is started when the server boots and stays up - she never pays the 3.7.
 *
 * The cost of keeping it is that context piles up, since every previous lookup is
 * still in the conversation. `maxTurns` throws the session away before that starts
 * to show, and the next tap pays one spawn.
 */
export class WarmSession {
  constructor({ model, options = {}, maxTurns = 12, turnTimeoutMs = 90_000 }) {
    this.model = model;
    this.options = options;
    this.maxTurns = maxTurns;
    this.turnTimeoutMs = turnTimeoutMs;
    this.live = null;
    this.turns = 0;
    this.queue = Promise.resolve();
  }

  /** Bring the process up now, so the first real request does not pay for it. */
  warm() {
    this.#run(() => this.#ensure()).catch(() => {});
  }

  /**
   * Ask one question and get the reply text.
   *
   * Turns are queued: one process handles one turn at a time, and two taps in
   * quick succession would otherwise interleave into the same message stream.
   */
  ask(prompt) {
    return this.#run(async () => {
      try {
        return await this.#turn(prompt);
      } catch (err) {
        // A broken pipe, a timeout, a crashed child - throw it away and try once
        // on a fresh process rather than handing her an error she cannot act on.
        this.#drop();
        return this.#turn(prompt);
      }
    });
  }

  #run(job) {
    const next = this.queue.then(job, job);
    this.queue = next.then(() => {}, () => {});
    return next;
  }

  #ensure() {
    if (this.live) return this.live;

    const channel = pushable();
    const stream = query({ prompt: channel, options: { ...this.options, model: this.model } });
    this.live = { channel, iterator: stream[Symbol.asyncIterator]() };
    this.turns = 0;
    return this.live;
  }

  #drop() {
    try {
      this.live?.channel.end();
    } catch {
      /* already gone */
    }
    this.live = null;
  }

  async #turn(prompt) {
    if (this.turns >= this.maxTurns) this.#drop();
    const { channel, iterator } = this.#ensure();

    channel.push({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: prompt }] },
      parent_tool_use_id: null,
      session_id: '',
    });
    this.turns++;

    const deadline = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`no reply within ${this.turnTimeoutMs}ms`)), this.turnTimeoutMs).unref?.(),
    );

    for (;;) {
      const { value, done } = await Promise.race([iterator.next(), deadline]);
      if (done) throw new Error('session ended before it answered');
      if (value?.type === 'result') return String(value.result ?? '');
    }
  }
}

/** An async iterable you can push into after it has started being consumed. */
function pushable() {
  const waiting = [];
  let resolve = null;
  let closed = false;

  return {
    push(value) {
      if (closed) return;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r(value);
      } else {
        waiting.push(value);
      }
    },
    end() {
      closed = true;
      if (resolve) {
        const r = resolve;
        resolve = null;
        r(null);
      }
    },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        const value = waiting.length ? waiting.shift() : await new Promise((r) => (resolve = r));
        if (value === null) return;
        yield value;
      }
    },
  };
}

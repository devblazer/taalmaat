import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionFor } from './session/flow.js';
import { listProfiles } from './profiles.js';
import { warmUp } from './claude/ask.js';
import { explain, tellHer } from './claude/failure.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(root, 'web')));

/**
 * Who is asking.
 *
 * Every request carries it. Nothing is remembered server-side between requests,
 * because two learners can have this open at once and a shared "current learner"
 * would file one of them's words under the other.
 */
function who(req) {
  const id = req.query.who ?? req.body?.who;
  if (!id) throw tellHer('Pick who is reading first.', 'no profile on request');
  return sessionFor(String(id));
}

/**
 * Every route is the same shape: do the thing, hand back the whole state.
 *
 * The screen never has to work out what changed, and a reload mid-exam lands back
 * exactly where it was - which matters, because the lid gets closed.
 */
function route(handler) {
  return async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (err) {
      // The whole truth goes to the log, where a parent can read it. They get a
      // sentence they can act on, and never the machinery.
      const failure = explain(err);
      console.error(`[${failure.code}]`, failure.detail);
      if (failure.code === 'setup') {
        console.error('  -> check the `claude` CLI is installed and logged in, then restart.');
      }
      res.status(500).json({ error: failure.kid, code: failure.code, canRetry: failure.canRetry });
    }
  };
}

app.get('/api/profiles', route(async () => listProfiles()));

app.get('/api/state', route(async (req) => who(req).state()));
app.post('/api/offers', route(async (req) => who(req).offerStories()));
app.post('/api/choose', route(async (req) => who(req).chooseStory(Number(req.body.index))));
app.post('/api/word', route(async (req) => who(req).lookupWord(req.body)));
app.post('/api/sentence', route(async (req) => who(req).lookupSentence(req.body)));
app.post('/api/exam', route(async (req) => who(req).startExam()));
app.post('/api/exam/answer', route(async (req) => who(req).submitExam(req.body.answers ?? {})));
app.post('/api/bridge/answer', route(async (req) => who(req).submitBridge(req.body.answers ?? {})));
app.post('/api/mini/answer', route(async (req) => who(req).submitMini(req.body.answers ?? {})));
app.get('/api/report', route(async (req) => who(req).report()));

const port = Number(process.env.PORT ?? 4780);
app.listen(port, () => {
  console.log(`Taalmaat on http://localhost:${port}`);
  // Both Claude processes come up now, so the first tap is a one-second wait
  // rather than a six-second one.
  warmUp();
});

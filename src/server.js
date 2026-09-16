import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as flow from './session/flow.js';
import { warmUp } from './claude/ask.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(root, 'web')));

/**
 * Every route is the same shape: do the thing, hand back the whole state.
 *
 * The screen never has to work out what changed, and a reload mid-exam puts her
 * back exactly where she was - which matters, because she will close the lid.
 */
function route(handler) {
  return async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (err) {
      console.error('[error]', err);
      res.status(500).json({ error: err?.message ?? String(err) });
    }
  };
}

app.get('/api/state', route(async () => flow.state()));
app.post('/api/offers', route(async () => flow.offerStories()));
app.post('/api/choose', route(async (req) => flow.chooseStory(Number(req.body.index))));
app.post('/api/word', route(async (req) => flow.lookupWord(req.body)));
app.post('/api/sentence', route(async (req) => flow.lookupSentence(req.body)));
app.post('/api/exam', route(async () => flow.startExam()));
app.post('/api/exam/answer', route(async (req) => flow.submitExam(req.body.answers ?? {})));
app.post('/api/bridge/answer', route(async (req) => flow.submitBridge(req.body.answers ?? {})));
app.post('/api/mini/answer', route(async (req) => flow.submitMini(req.body.answers ?? {})));
app.get('/api/report', route(async () => flow.report()));

const port = Number(process.env.PORT ?? 4780);
app.listen(port, () => {
  console.log(`Taalmaat on http://localhost:${port}`);
  // Both Claude processes come up now, so her first tap is a one-second wait
  // rather than a five-second one.
  warmUp();
});

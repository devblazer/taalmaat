import { createWorker } from 'tesseract.js';

/**
 * Reading a photographed page.
 *
 * One Tesseract worker, kept alive. Measured on this machine: 3.2s to start, 0.6s
 * per page after that. Starting it per scan would put the whole 3.2s in front of
 * someone holding a phone over a book, so it comes up at boot like the Claude
 * sessions do.
 *
 * The language model is `afr`. Tested on printed Afrikaans at 95% confidence with
 * diacritics intact - reen and wereld came back correctly accented, which matters,
 * because a stripped diacritic is a different word.
 */
let worker = null;
let starting = null;
let queue = Promise.resolve();

async function ready() {
  if (worker) return worker;
  starting ??= createWorker('afr').then((w) => {
    worker = w;
    starting = null;
    return w;
  });
  return starting;
}

/** Bring the worker up now, so the first scan does not pay for it. */
export function warmUp() {
  ready().catch((err) => console.warn('[ocr] warm-up failed:', err?.message ?? err));
}

/**
 * Read one image. Data URL or raw bytes.
 *
 * Serialised: one worker handles one page at a time, and two scans at once would
 * interleave inside it.
 */
export function read(image) {
  const job = queue.then(async () => {
    const w = await ready();
    // Timed and logged: OCR is the slowest thing in the app and the only way to
    // tell "still working" from "wedged" is a number in the log.
    const started = Date.now();
    const bytes = typeof image === 'string' ? Math.round((image.length * 3) / 4 / 1024) : 0;
    const { data } = await w.recognize(image);
    const took = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[ocr] ${bytes}KB -> ${took}s, ${Math.round(data.confidence ?? 0)}% confidence, ${(data.text ?? '').length} chars`);
    return {
      text: (data.text ?? '').trim(),
      confidence: data.confidence ?? 0,
    };
  });
  queue = job.then(
    () => {},
    () => {},
  );
  return job;
}

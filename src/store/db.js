import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const dataDir = path.join(root, 'data');

/**
 * Each learner owns a folder. Nothing is shared - not the word bank, not the
 * progress, not the stories - because two learners at different levels have nothing
 * useful to say about each other's vocabulary.
 */
function dirFor(profile) {
  const dir = path.join(dataDir, profile);
  fs.mkdirSync(path.join(dir, 'stories'), { recursive: true });
  return dir;
}

/** Read a JSON file, or return `fallback` if it is missing or unreadable. */
export function read(profile, file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dirFor(profile), file), 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write atomically, so a crash mid-write cannot corrupt weeks of progress. */
export function write(profile, file, value) {
  const target = path.join(dirFor(profile), file);
  fs.writeFileSync(`${target}.tmp`, JSON.stringify(value, null, 2));
  fs.renameSync(`${target}.tmp`, target);
}

export function readStory(profile, id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dirFor(profile), 'stories', `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function writeStory(profile, story) {
  const target = path.join(dirFor(profile), 'stories', `${story.id}.json`);
  fs.writeFileSync(`${target}.tmp`, JSON.stringify(story, null, 2));
  fs.renameSync(`${target}.tmp`, target);
}

export function listStories(profile) {
  const dir = path.join(dirFor(profile), 'stories');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readStory(profile, f.replace(/\.json$/, '')))
    .filter(Boolean);
}

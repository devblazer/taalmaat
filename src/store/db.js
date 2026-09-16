import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const dataDir = path.join(root, 'data');
export const storyDir = path.join(dataDir, 'stories');

fs.mkdirSync(storyDir, { recursive: true });

/** Read a JSON file, or return `fallback` if it is missing or unreadable. */
export function read(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write a JSON file atomically, so a crash mid-write cannot corrupt her progress. */
export function write(file, value) {
  const target = path.join(dataDir, file);
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}

export function readStory(id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(storyDir, `${id}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function writeStory(story) {
  const target = path.join(storyDir, `${story.id}.json`);
  fs.writeFileSync(`${target}.tmp`, JSON.stringify(story, null, 2));
  fs.renameSync(`${target}.tmp`, target);
}

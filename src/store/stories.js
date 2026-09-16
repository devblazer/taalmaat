import { readStory, writeStory, storyDir } from './db.js';
import fs from 'node:fs';

export { readStory, writeStory };

export function list() {
  return fs
    .readdirSync(storyDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readStory(f.replace(/\.json$/, '')))
    .filter(Boolean);
}

export function newId() {
  return `s${Date.now().toString(36)}`;
}

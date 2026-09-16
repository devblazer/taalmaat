import { read, write } from './db.js';

const FILE = 'progress.json';

const EMPTY = {
  phase: 'choosing',   // choosing | reading | exam | bridge | done
  storyId: null,
  pageIndex: 0,
  offers: null,        // the three stories last put in front of her
  exam: null,          // questions currently on screen, plus what she got wrong
  bridge: null,        // bridge sentences currently on screen
  history: [],         // { storyId, title, finishedAt }
};

export function load() { return { ...EMPTY, ...read(FILE, {}) }; }

export function save(next) {
  write(FILE, next);
  return next;
}

/** Shallow patch, so a route can move one field without restating the rest. */
export function update(patch) {
  return save({ ...load(), ...patch });
}

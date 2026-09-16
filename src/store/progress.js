import { read, write } from './db.js';

const FILE = 'progress.json';

const EMPTY = {
  phase: 'choosing',   // choosing | reading | exam | bridge | done
  source: null,        // 'story' (written for them) | 'book' (their own, imported)
  storyId: null,
  pageIndex: 0,
  offers: null,        // the three stories last put in front of them
  exam: null,          // questions currently on screen, plus what was wrong
  bridge: null,        // bridge sentences currently on screen
  history: [],         // { storyId, title, finishedAt }
};

/** Where one learner is, right now. */
export function progressFor(profile) {
  const load = () => ({ ...EMPTY, ...read(profile, FILE, {}) });

  return {
    load,
    save(next) {
      write(profile, FILE, next);
      return next;
    },
    /** Shallow patch, so a route can move one field without restating the rest. */
    update(patch) {
      const next = { ...load(), ...patch };
      write(profile, FILE, next);
      return next;
    },
  };
}

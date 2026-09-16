import { read, write } from './db.js';

const EMPTY = {
  phase: 'choosing',   // choosing | reading | exam | bridge | done
  storyId: null,
  pageIndex: 0,
  offers: null,        // the three stories last put in front of them
  exam: null,          // questions currently on screen, plus what was wrong
  bridge: null,        // bridge sentences currently on screen
  history: [],         // { storyId, title, finishedAt }
};

/**
 * Where one learner is, inside one activity.
 *
 * One file per activity. A story half-read and a book half-read are two different
 * places to be, and neither should overwrite the other - picking "my own book" on
 * Tuesday must not lose the story from Monday.
 */
export function progressFor(profile, activity) {
  const file = `progress-${activity}.json`;
  const load = () => ({ ...EMPTY, ...read(profile, file, {}) });

  return {
    load,
    save(next) {
      write(profile, file, next);
      return next;
    },
    /** Shallow patch, so a route can move one field without restating the rest. */
    update(patch) {
      const next = { ...load(), ...patch };
      write(profile, file, next);
      return next;
    },
  };
}

/** Just the position, without loading a session - for the activity picker. */
export function peek(profile, activity) {
  return { ...EMPTY, ...read(profile, `progress-${activity}.json`, {}) };
}

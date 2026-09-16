import { readStory, writeStory, listStories } from './db.js';

/** The pages one learner is working through, whether written for them or imported. */
export function storiesFor(profile) {
  return {
    read: (id) => readStory(profile, id),
    write: (story) => writeStory(profile, story),
    list: () => listStories(profile),
  };
}

export function newId() {
  return `s${Date.now().toString(36)}`;
}

/**
 * What a learner can be doing.
 *
 * An activity is a separate place to be, not a setting. Each one keeps its own
 * progress, its own page and its own position, so being halfway through a set-work
 * chapter does not get clobbered by picking a story on a different evening - and
 * neither one silently resumes when the other was wanted.
 *
 * The word bank is deliberately NOT split this way. Vocabulary is vocabulary: a word
 * met in a school text and a word met in a story are the same word, and the whole
 * point is that it comes back wherever it appears next.
 */
export const ACTIVITIES = [
  {
    id: 'story',
    name: 'A story for me',
    blurb: 'A new Afrikaans story, written for your level. Pick from three.',
    ready: true,
  },
  {
    id: 'book',
    name: 'My own book',
    blurb: 'Photograph a page from a book you are reading, and work through that.',
    ready: false,
    notReady: 'Not built yet — this is the next thing being added.',
  },
];

export function getActivity(id) {
  return ACTIVITIES.find((a) => a.id === id) ?? null;
}

/**
 * The learners.
 *
 * A profile is not just a name on a folder - it is the level everything is pitched
 * at. The learner description here is what every prompt is built from, so getting
 * the age and stage right is what stops a sixteen-year-old being handed a
 * seven-year-old's story or an eleven-year-old being examined like a matric class.
 *
 * To add someone, copy a block. `pronouns` is used in the prompts; set it to what
 * the person actually uses rather than guessing from the name.
 */
export const PROFILES = [
  {
    id: 'erin',
    name: 'Erin',
    age: 11,
    grade: 6,
    subject: 'Afrikaans First Additional Language',
    pronouns: { subj: 'she', obj: 'her', poss: 'her' },
    // What to assume she can already do, and what she cannot.
    reading: `
She can read simple narrative Afrikaans but has a thin vocabulary, because she
leaned on AI translation for two years instead of learning words. Short sentences,
ordinary everyday words, past-tense storytelling. Anything abstract or figurative
needs to be plain.`,
    // Roughly how long a generated page should be.
    pageWords: 200,
  },
  {
    id: 'summer',
    name: 'Summer',
    age: 16,
    grade: 11,
    subject: 'Afrikaans First Additional Language',
    pronouns: { subj: 'she', obj: 'her', poss: 'her' },
    reading: `
She can follow a page of ordinary Afrikaans prose and handle longer sentences,
subordinate clauses and past and future tenses. What is missing is breadth of
vocabulary and confidence with idiom, figurative language and less common words -
exactly the things a Grade 11 set text is full of. Do not simplify the grammar;
carry the level and let the vocabulary be the work.`,
    pageWords: 350,
  },
];

export function getProfile(id) {
  return PROFILES.find((p) => p.id === id) ?? null;
}

/** Just enough for the picker - no reading notes, no prompt text. */
export function listProfiles() {
  return PROFILES.map(({ id, name, age, grade }) => ({ id, name, age, grade }));
}

import { learnerBlock, contentBlock, pron } from './level.js';

export function offerPrompt({ profile, recentTitles = [] }) {
  const p = pron(profile);
  const avoid = recentTitles.length
    ? `\n${p.Subj} has already read these, so offer nothing like them:\n${recentTitles.map((t) => `- ${t}`).join('\n')}`
    : '';

  return `${learnerBlock(profile)}

${contentBlock(profile)}

Invent three different short stories ${p.subj} could choose between. Make them
genuinely different from each other - different settings, different kinds of trouble,
different moods. One of them should be funny.${avoid}

Give the title in Afrikaans and the teaser in English, because the teaser is how
${p.subj} picks and ${p.subj} should not need help to pick.

Reply with JSON only, no other text:
[
  { "title": "Afrikaans title", "teaser": "One sentence in English that makes them want to read it." },
  { "title": "...", "teaser": "..." },
  { "title": "...", "teaser": "..." }
]`;
}

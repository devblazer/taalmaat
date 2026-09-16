import { LEARNER, CONTENT_RULES } from './level.js';

export function offerPrompt({ recentTitles = [] }) {
  const avoid = recentTitles.length
    ? `\nShe has already read these, so offer nothing like them:\n${recentTitles.map((t) => `- ${t}`).join('\n')}`
    : '';

  return `${LEARNER}

${CONTENT_RULES}

Invent three different short stories she could choose between. Make them genuinely
different from each other - different settings, different kinds of trouble, different
moods. One of them should be funny.${avoid}

Give the title in Afrikaans and the teaser in English, because the teaser is how she
picks and she should not need help to pick.

Reply with JSON only, no other text:
[
  { "title": "Afrikaans title", "teaser": "One sentence in English that makes her want to read it." },
  { "title": "...", "teaser": "..." },
  { "title": "...", "teaser": "..." }
]`;
}

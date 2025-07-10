// Central configuration for pipeline orchestrator and related settings
// Extend this as needed for other pipeline-level tunables

export const GAME_THEMES = [
  'Theme: underwater',
  'Theme: outer space',
  'Theme: medieval',
  'Theme: jungle',
  'Theme: haunted',
  'Theme: futuristic',
  'Theme: sports',
  'Theme: puzzle',
  'Theme: racing',
  'Theme: stealth',
  'Theme: survival',
  'Theme: building',
  'Theme: animal',
  'Theme: food',
  'Theme: music',
  'Theme: weather',
  'Theme: time manipulation',
  'Theme: shrinking/growing',
  'Theme: gravity',
  'Theme: portals'
];

// Temperature for LLM used in idea generation (idea generator chain)
export const IDEA_GENERATOR_LLM_TEMPERATURE = 0.7;

export const PROGRESS_WEIGHTS = {
  planning: 0.3,
  coding: 0.7,
};

export const PLANNING_PHASE = {
  name: 'planning',
  label: 'Planning',
  description: 'Designing game'
};

export const CODING_PHASE = {
  name: 'coding',
  label: 'Coding',
  description: 'Generating code'
};

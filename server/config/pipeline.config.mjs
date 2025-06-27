// Central configuration for pipeline orchestrator and related settings
// Extend this as needed for other pipeline-level tunables

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

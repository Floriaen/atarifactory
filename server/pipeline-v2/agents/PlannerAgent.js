/**
 * PlannerAgent
 * Input: Game definition object (see GameDesignAgent output)
 * Output: Array<{ id: number, label: string }>
 *
 * Generates an ordered array of build steps for the game.
 */
async function PlannerAgent(gameDefinition) {
  const { mechanics = [], entities = [], title = '' } = gameDefinition;
  let plan = [];
  let stepId = 1;

  // Always start with canvas setup
  plan.push({ id: stepId++, label: 'Setup canvas and game loop' });

  if (mechanics.includes('move')) {
    plan.push({ id: stepId++, label: 'Add player and movement controls' });
  }
  if (mechanics.includes('jump')) {
    plan.push({ id: stepId++, label: 'Add jumping/platform logic' });
  }
  if (mechanics.includes('collect')) {
    plan.push({ id: stepId++, label: 'Add collectible items and scoring' });
  }
  if (mechanics.includes('avoid')) {
    plan.push({ id: stepId++, label: 'Add obstacles and collision logic' });
  }
  // Always end with win/lose condition
  plan.push({ id: stepId++, label: 'Implement win/lose condition and display result' });

  return plan;
}

module.exports = PlannerAgent; 
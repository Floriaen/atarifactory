/**
 * PlannerAgent
 * Input: Game definition object (see GameDesignAgent output)
 * Output: Array<{ id: number, label: string }>
 *
 * Generates an ordered array of build steps for the game.
 */
async function PlannerAgent(gameDefinition) {
  // Mock implementation for contract test
  return [
    { id: 1, label: 'Setup canvas and loop' },
    { id: 2, label: 'Add player and controls' },
    { id: 3, label: 'Add goal or win condition' }
  ];
}

module.exports = PlannerAgent; 
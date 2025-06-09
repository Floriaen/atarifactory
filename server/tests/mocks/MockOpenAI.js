/**
 * Mock LLM client for testing that simulates OpenAI responses.
 * Provides deterministic responses for testing purposes.
 */

class MockOpenAI {
  constructor() {
    this.currentAgent = null;
  }

  setAgent(agent) {
    this.currentAgent = agent;
  }

  async chatCompletion({ prompt, outputType }) {
    if (!this.currentAgent) {
      throw new Error('No agent set for mock LLM');
    }

    switch(this.currentAgent.name) {
      case 'GameDesignAgent':
        return {
          title: 'Test Game',
          description: 'A test game',
          mechanics: ['move', 'jump'],
          winCondition: 'Collect coins',
          entities: ['player', 'coin']
        };
      
      case 'PlannerAgent':
        return [
          { id: 1, label: 'Setup canvas' },
          { id: 2, label: 'Add player' }
        ];
      
      case 'StepBuilderAgent':
        if (prompt && prompt.includes('Nonexistent step')) {
          throw new Error('Invalid step provided');
        }
        return 'function update() { /* code */ }';
      
      default:
        throw new Error(`No mock response defined for agent: ${this.currentAgent.name}`);
    }
  }
}

module.exports = MockOpenAI; 
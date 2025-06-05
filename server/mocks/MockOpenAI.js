// NOTE: If you change any LLM agent contract, update this mock accordingly.
// This mock is used in tests to avoid real OpenAI API calls and ensure deterministic, fast, and cheap testing.

class MockOpenAI {
  chat = {
    completions: {
      create: async ({ messages }) => {
        const userPrompt = messages[messages.length - 1].content;
        if (userPrompt.includes('step-by-step plan')) {
          // PlannerAgent mock response
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    { id: 1, label: 'Setup canvas and loop' },
                    { id: 2, label: 'Add player and controls' },
                    { id: 3, label: 'Add coins and scoring' },
                    { id: 4, label: 'Add spikes and loss condition' },
                    { id: 5, label: 'Display win/lose text' }
                  ])
                }
              }
            ]
          };
        }
        // GameDesignAgent mock response (default)
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: 'Mock Game',
                  description: 'A mock game for testing.',
                  mechanics: ['move', 'jump'],
                  winCondition: 'Win!',
                  entities: ['player', 'goal']
                })
              }
            }
          ]
        };
      }
    }
  };
}

class MockSmartOpenAI {
  async chatCompletion({ prompt, outputType }) {
    if (outputType === 'json-array' && prompt.includes('step-by-step plan')) {
      // PlannerAgent mock response
      return [
        { id: 1, label: 'Setup canvas and loop' },
        { id: 2, label: 'Add player and controls' },
        { id: 3, label: 'Add coins and scoring' },
        { id: 4, label: 'Add spikes and loss condition' },
        { id: 5, label: 'Display win/lose text' }
      ];
    }
    if (outputType === 'json-object' && prompt.includes('game design')) {
      // GameDesignAgent mock response
      return {
        title: 'Mock Game',
        description: 'A mock game for testing.',
        mechanics: ['move', 'jump'],
        winCondition: 'Win!',
        entities: ['player', 'goal']
      };
    }
    if (outputType === 'string') {
      return 'mock string output';
    }
    if (outputType === 'json-object' && prompt.includes('feedback agent')) {
      // FeedbackAgent mock response
      return {
        retryTarget: 'fixer',
        suggestion: 'Mock: Try fixing the last step.'
      };
    }
    throw new Error('MockSmartOpenAI: No mock for this prompt/outputType');
  }
}

module.exports = { MockOpenAI, MockSmartOpenAI }; 
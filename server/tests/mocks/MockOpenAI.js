// NOTE: If you change any LLM agent contract, update this mock accordingly.
// This mock is used in tests to avoid real OpenAI API calls and ensure deterministic, fast, and cheap testing.

const { mergeCode } = require('../../utils/codeMerge');
const prettier = require('prettier');

class MockOpenAI {
  constructor() {
    this.agent = null;
  }

  setAgent(agentName) {
    this.agent = agentName;
  }

  // For OpenAI SDK compatibility
  chat = {
    completions: {
      create: async ({ messages }) => {
        const userPrompt = messages[messages.length - 1].content;
        const response = this._getMockResponse(userPrompt);
        return { 
          choices: [{ 
            message: { 
              content: typeof response === 'string' ? response : JSON.stringify(response)
            } 
          }] 
        };
      }
    }
  };

  // For SmartOpenAI compatibility
  async chatCompletion({ prompt, outputType }) {
    const response = this._getMockResponse(prompt, outputType);
    if (outputType === 'json-object' || outputType === 'json-array') {
      return response;
    }
    if (response instanceof Promise) {
      return response;
    }
    return typeof response === 'string' ? response : JSON.stringify(response);
  }

  _getMockResponse(prompt, outputType) {
    console.log('Agent :', this.agent);
    switch (this.agent) {
      case 'GameDesignAgent':
        return {
          title: 'Mock Game',
          description: 'A mock game for testing.',
          mechanics: ['move', 'jump'],
          winCondition: 'Win!',
          entities: ['player', 'goal']
        };
      case 'PlannerAgent':
        return [
          { id: 1, description: 'Setup canvas and loop' },
          { id: 2, description: 'Add player and controls' },
          { id: 3, description: 'Add coins and scoring' },
          { id: 4, description: 'Add spikes and loss condition' },
          { id: 5, description: 'Display win/lose text' }
        ];
      case 'StepBuilderAgent':
        // Check if the step is invalid (id: 999)
        if (prompt && prompt.includes('"id": 999')) {
          throw new Error('Invalid step: Step with id 999 does not exist');
        }
        // Return a valid code block for the step
        return '```javascript\nfunction update() {\n  // Player movement code\n  player.x += 5;\n}\n```';
      case 'ContextStepBuilderAgent':
        return (
          'function draw() { /* original drawing code */ }\n' +
          'let score = 0;\n' +
          'function increaseScore() { score++; }'
        );
      case 'BlockInserterAgent':
        // Parse the input to extract currentCode and stepCode
        const input = JSON.parse(prompt);
        const { currentCode, stepCode } = input;
        console.log('BlockInserterAgent input:', { currentCode, stepCode });
        
        // Use the actual mergeCode utility for proper merging
        return mergeCode(currentCode, stepCode)
          .then(mergedCode => {
            console.log('Merged code:', mergedCode);
            // Format the merged code
            try {
              return prettier.format(mergedCode, {
                parser: 'babel',
                semi: true,
                singleQuote: false,
                trailingComma: 'es5',
              });
            } catch (formatError) {
              return mergedCode;
            }
          });
      case 'StepFixerAgent':
        return 'function update() {\n  // Fixed player movement code\n  player.x += 5;\n}';
      case 'FeedbackAgent':
        return {
          retryTarget: 'fixer',
          suggestion: 'Mock: Try fixing the last step.'
        };
      case 'StaticCheckerAgent':
        console.log('StaticCheckerAgent prompt:', JSON.stringify(prompt));
        if (prompt.match(/^Analyze this code for static errors:\n\n$/)) {
          return [];
        }
        if (prompt.includes('function update() {')) {
          return ['Syntax error: Missing closing brace'];
        }
        if (prompt.includes('function update() {}') && prompt.includes('console.log(x);')) {
          return ['Undeclared variable: x'];
        }
        if (
          prompt.includes('function update() {}') &&
          prompt.split('function update() {}').length > 2
        ) {
          return ['Duplicate declaration: update'];
        }
        return ['No errors'];
      case 'SyntaxSanityAgent':
        return { valid: true };
      case 'RuntimePlayabilityAgent':
        return {
          canvasActive: true,
          inputResponsive: true,
          playerMoved: true,
          winConditionReachable: true
        };
      default:
        console.warn('MockOpenAI: Falling through to default case', { agent: this.agent, prompt, outputType });
        if (outputType === 'string') {
          return 'mock string output';
        }
        throw new Error('MockOpenAI: No mock for this agent or prompt');
    }
  }
}

module.exports = MockOpenAI; 
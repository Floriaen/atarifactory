import { BaseLLM } from '@langchain/core/language_models/llms';

// MalformedLLM returns an object without a 'content' property to simulate LLM failure
export class MalformedLLM extends BaseLLM {
  constructor() {
    super({});
  }
  async _call(prompt, options) {
    // Simulate malformed output: missing 'content' property
    return {};
  }
  async _generate(prompts, options) {
    // Malformed: returns generations with empty object (no .text or .content)
    return {
      generations: prompts.map(() => [{}]),
      llmOutput: {}
    };
  }
  _llmType() {
    return 'malformed';
  }
}

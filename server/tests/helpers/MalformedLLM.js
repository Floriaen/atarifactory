import { BaseLLM } from '@langchain/core/language_models/llms';

/**
 * Flexible mock LLM for negative-path testing.
 * Pass `mode` to control the type of malformed output.
 *
 * Modes:
 * - 'missingContent': returns an object with no .content property
 * - 'notJson': returns { content: 'not json' }
 * - 'missingLoop': returns { content: JSON.stringify({ notLoop: 'foo' }) }
 * - ...add more as needed
 */
export class FlexibleMalformedLLM extends BaseLLM {
  constructor(mode = 'missingContent') {
    super({});
    this.mode = mode;
  }

  async _call(prompt, options) {
    switch (this.mode) {
      case 'missingContent':
        return {};
      case 'notJson':
        return { content: 'not json' };
      case 'missingLoop':
        return { content: JSON.stringify({ notLoop: 'foo' }) };
      // Add more cases here as needed
      default:
        throw new Error(`Unknown FlexibleMalformedLLM mode: ${this.mode}`);
    }
  }

  async _generate(prompts, options) {
    switch (this.mode) {
      case 'missingContent':
        return { generations: prompts.map(() => [{}]), llmOutput: {} };
      case 'notJson':
        return { generations: prompts.map(() => [{ text: 'not json' }]), llmOutput: {} };
      case 'missingLoop':
        return { generations: prompts.map(() => [{ text: JSON.stringify({ notLoop: 'foo' }) }]), llmOutput: {} };
      // Add more cases here as needed
      default:
        throw new Error(`Unknown FlexibleMalformedLLM mode: ${this.mode}`);
    }
  }

  _llmType() {
    return `flexible-malformed:${this.mode}`;
  }
}

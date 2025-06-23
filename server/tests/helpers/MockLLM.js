// Minimal mock LLM for LangChain, subclassing BaseLLM.
import { BaseLLM } from '@langchain/core/language_models/llms';

export class MockLLM extends BaseLLM {
  constructor(contentString) {
    super({});
    this._contentString = contentString;
  }
  async _call(prompt, options) {
    // Always returns an object with .content, matching real LLM
    return { content: this._contentString };
  }
  async _generate(prompts, options) {
    // For each prompt, return a generation with the mock content as { text }, matching real LLM output
    return {
      generations: prompts.map(() => [{ text: this._contentString }]),
      llmOutput: {}
    };
  }
  _llmType() {
    return "mock";
  }
}

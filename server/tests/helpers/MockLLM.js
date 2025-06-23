// Minimal mock LLM for LangChain, subclassing BaseLLM.
import { BaseLLM } from '@langchain/core/language_models/llms';

export class MockLLM extends BaseLLM {
  constructor(contentString) {
    super({});
    this._contentString = contentString;
  }
  async _call() {
    // Always returns an object with .content, matching real LLM contract
    return { content: this._contentString };
  }
  async _callMalformed() {
    // Match the real LLM contract for LCEL chains
    return this._call();
  }
  async invoke() {
    // Match the real LLM contract for LCEL chains
    return this._call();
  }
  async _generate(prompts) {
    // For each prompt, return a generation with the mock content as { text }, matching real LLM output
    return {
      generations: prompts.map(() => [{ text: this._contentString }]),
      llmOutput: {}
    };
  }
  _llmType() {
    return 'mock';
  }
}

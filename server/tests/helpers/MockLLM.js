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
      llmOutput: {
        tokenUsage: {
          totalTokens: 100, // Mock token count for testing
          promptTokens: 50,
          completionTokens: 50
        }
      }
    };
  }
  _llmType() {
    return 'mock';
  }
  
  // Add withStructuredOutput method for modern chain compatibility
  withStructuredOutput(schema) {
    return new MockLLMWithStructuredOutput(this._contentString, schema);
  }
}

// Mock LLM with structured output support
class MockLLMWithStructuredOutput extends MockLLM {
  constructor(contentString, schema) {
    super(contentString);
    this.schema = schema;
  }
  
  async invoke(input) {
    // Parse the mock content as JSON and validate against schema if provided
    try {
      const parsed = JSON.parse(this._contentString);
      if (this.schema) {
        return this.schema.parse(parsed);
      }
      return parsed;
    } catch (error) {
      // If parsing fails, return the original content
      return { content: this._contentString };
    }
  }
  
  async _call() {
    return this.invoke();
  }
  
  // Override withConfig to properly handle callbacks with structured output
  withConfig(config) {
    const originalInvoke = this.invoke.bind(this);
    
    // Create a new instance that will trigger callbacks
    const enhancedMock = Object.create(this);
    enhancedMock.invoke = async function(input) {
      // Trigger handleLLMEnd callback manually since structured output bypasses normal flow
      if (config.callbacks) {
        config.callbacks.forEach(callback => {
          if (callback.handleLLMEnd) {
            callback.handleLLMEnd({
              llmOutput: {
                tokenUsage: {
                  totalTokens: 100,
                  promptTokens: 50, 
                  completionTokens: 50
                }
              }
            });
          }
        });
      }
      
      return originalInvoke(input);
    };
    
    return enhancedMock;
  }
  
  async _generate(prompts) {
    // Inherit token usage from parent class
    return super._generate(prompts);
  }
}

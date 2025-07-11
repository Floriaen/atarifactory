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

  async _call() {
    switch (this.mode) {
      case 'missingContent':
        return {};
      case 'notJson':
        return { content: 'not json' };
      case 'missingLoop':
        return { content: JSON.stringify({ notLoop: 'foo' }) };
      case 'missingMechanics':
        return { content: JSON.stringify({ notMechanics: 'foo' }) };
      // Add more cases here as needed
      default:
        throw new Error(`Unknown FlexibleMalformedLLM mode: ${this.mode}`);
    }
  }

  async _generate(prompts) {
    switch (this.mode) {
      case 'missingContent':
        return { generations: prompts.map(() => [{}]), llmOutput: {} };
      case 'notJson':
        return { generations: prompts.map(() => [{ text: 'not json' }]), llmOutput: {} };
      case 'missingLoop':
        return { generations: prompts.map(() => [{ text: JSON.stringify({ notLoop: 'foo' }) }]), llmOutput: {} };
      case 'missingMechanics':
        return { generations: prompts.map(() => [{ text: JSON.stringify({ notMechanics: 'foo' }) }]), llmOutput: {} };
      // Add more cases here as needed
      default:
        throw new Error(`Unknown FlexibleMalformedLLM mode: ${this.mode}`);
    }
  }

  _llmType() {
    return `flexible-malformed:${this.mode}`;
  }

  // Add withStructuredOutput method for modern chain compatibility
  withStructuredOutput(schema) {
    return new FlexibleMalformedLLMWithStructuredOutput(this.mode, schema);
  }
}

// FlexibleMalformedLLM with structured output support
class FlexibleMalformedLLMWithStructuredOutput extends FlexibleMalformedLLM {
  constructor(mode, schema) {
    super(mode);
    this.schema = schema;
  }
  
  async invoke() {
    const result = await this._call();
    
    // For malformed LLMs with structured output, we should try to parse and fail appropriately
    if (this.schema) {
      try {
        // If result has content, try to parse it as JSON and validate
        if (result.content) {
          try {
            const parsed = JSON.parse(result.content);
            return this.schema.parse(parsed);
          } catch (parseError) {
            // JSON parse error - schema validation will catch this
            throw new Error(`LLM output missing content`);
          }
        } else {
          // No content - throw appropriate error
          throw new Error(`LLM output missing content`);
        }
      } catch (schemaError) {
        throw new Error(`LLM output missing content`);
      }
    }
    
    // Without schema, just return the malformed result
    return result;
  }
}

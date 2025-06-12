// SmartOpenAI: A wrapper for OpenAI that handles output extraction and parsing.
// Supports outputType: 'json-array', 'json-object', 'string'.
// Handles code block extraction, JSON parsing, and error handling.

class SmartOpenAI {
  constructor(openai) {
    this.openai = openai;
  }

  /**
   * Calls OpenAI chat completion and parses output according to outputType.
   * @param {Object} options
   * @param {string} options.prompt - The user prompt.
   * @param {'json-array'|'json-object'|'string'} options.outputType - Expected output type.
   * @param {string} [options.model] - Model name (default: 'gpt-4o').
   * @param {number} [options.temperature] - Sampling temperature.
   * @param {number} [options.max_tokens] - Max tokens.
   * @returns {Promise<any>} Parsed output.
   */
  async chatCompletion({ prompt, outputType, model = 'gpt-4o', temperature = 0.2, max_tokens = 1024 }) {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ];
    /*
    console.log('\n=== LLM REQUEST ===');
    console.log('Model:', model);
    console.log('Temperature:', temperature);
    console.log('Max Tokens:', max_tokens);
    console.log('\nMessages:');
    messages.forEach(msg => {
      console.log(`\n[${msg.role.toUpperCase()}]`);
      console.log(msg.content);
    });
    console.log('\n=== END REQUEST ===\n');
*/
    const response = await this.openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens
    });

    const raw = response.choices[0].message.content;
    
    console.log('\n=== LLM RESPONSE ===');
    console.log('Raw output:');
    console.log(raw);
    console.log('\n=== END RESPONSE ===\n');

    if (outputType === 'string') {
      return raw;
    }
    if (outputType === 'json-array' || outputType === 'json-object') {
      // Extract JSON from code block or plain output
      let jsonStr = raw;
      // Remove code block if present
      const codeBlockMatch = raw.match(/```(?:json)?([\s\S]*?)```/i);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      // Find first JSON array or object
      const arrMatch = jsonStr.match(/\[([\s\S]*?)\]/m);
      const objMatch = jsonStr.match(/\{([\s\S]*?)\}/m);
      try {
        if (outputType === 'json-array' && arrMatch) {
          return JSON.parse('[' + arrMatch[1] + ']');
        }
        if (outputType === 'json-object' && objMatch) {
          return JSON.parse('{' + objMatch[1] + '}');
        }
        // Fallback: try to parse the whole string
        return JSON.parse(jsonStr);
      } catch (err) {
        throw new Error('SmartOpenAI: LLM output was not valid ' + outputType + '. Raw: ' + raw);
      }
    }
    throw new Error('SmartOpenAI: Unknown outputType: ' + outputType);
  }
}

module.exports = SmartOpenAI; 
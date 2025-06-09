const prettier = require('prettier');

/**
 * BlockInserterAgentLLM
 * Input: {
 *   currentCode: string,
 *   stepCode: string
 * },
 * Output: string (new currentCode after LLM-guided merge)
 *
 * Uses an LLM to merge/integrate stepCode into currentCode robustly.
 * llmClient must be passed in via dependency injection.
 */
async function BlockInserterAgentLLM({ currentCode, stepCode }, { llmClient, logger, traceId }) {
  logger.info('BlockInserterAgentLLM called', { traceId });
  const prompt = `You are a code integration assistant. Your job is to merge a new code block into an existing JavaScript game file.\n\n---\nCURRENT CODE:\n${currentCode}\n---\nNEW STEP CODE:\n${stepCode}\n---\nINSTRUCTIONS:\n- Integrate the new step code into the current code in the correct place.\n- Do NOT redeclare any variables, functions, or classes that already exist.\n- If a function or class already exists, extend or modify it as needed.\n- If the new code adds new logic to an existing function, insert it in the right place.\n- The result must be a single, runnable JavaScript file.\n- Do not wrap the output in markdown or code block markers.\n- Only output the merged code.\n`;
  try {
    const response = await llmClient.complete({
      prompt,
      max_tokens: 4096,
      temperature: 0.2,
      stop: null
    });
    let merged = response.data?.choices?.[0]?.text || response.choices?.[0]?.text || response.text || response;
    // Remove any accidental code block markers
    merged = merged.replace(/^```[a-z]*\n?|```$/gim, '').trim();
    const formatted = prettier.format(merged, { parser: 'babel' });
    return formatted;
  } catch (err) {
    logger.error('BlockInserterAgentLLM error', { traceId, error: err });
    // Fallback: naive append
    return currentCode + '\n' + stepCode;
  }
}

module.exports = BlockInserterAgentLLM; 
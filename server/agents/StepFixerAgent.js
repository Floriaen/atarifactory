/**
 * StepFixerAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - step: {id: number, label: string} - The current step being fixed
 * - errorList: Array<string> - List of errors to fix
 * Output: string (corrected stepCode)
 *
 * Fixes the code for the current step based on errors using LLM.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const fs = require('fs');
const path = require('path');
const { extractJsCodeBlocks } = require('../utils/formatter');

async function StepFixerAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode, step, errorList } = sharedState;
    if (!currentCode) {
      throw new Error('StepFixerAgent: currentCode is required in sharedState');
    }
    if (!step || !step.id || !step.label) {
      throw new Error('StepFixerAgent: step with id and label is required in sharedState');
    }
    if (!errorList || !Array.isArray(errorList)) {
      throw new Error('StepFixerAgent: errorList array is required in sharedState');
    }

    // Validate error messages
    errorList.forEach((error, index) => {
      if (typeof error !== 'string' || error.trim() === '') {
        throw new Error(`StepFixerAgent: Invalid error message at index ${index} - must be a non-empty string`);
      }
    });

    logger.info('StepFixerAgent called', { traceId, step, errorCount: errorList.length });

    if (!llmClient) {
      logger.error('StepFixerAgent: llmClient is required but was not provided', { traceId });
      throw new Error('StepFixerAgent: llmClient is required but was not provided');
    }

    const promptPath = path.join(__dirname, 'prompts', 'StepFixerAgent.prompt.md');
    const promptTemplate = fs.readFileSync(promptPath, 'utf8');
    const prompt = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{step}}', JSON.stringify(step, null, 2))
      .replace('{{errorList}}', JSON.stringify(errorList, null, 2));

    const correctedCode = await llmClient.chatCompletion({ prompt, outputType: 'string' });
    logger.info('StepFixerAgent LLM output received', { traceId, outputLength: correctedCode.length });

    // Validate corrected code
    if (!correctedCode || typeof correctedCode !== 'string' || correctedCode.trim() === '') {
      throw new Error('StepFixerAgent: LLM returned empty or invalid code');
    }

    // Use markdown parser to extract JS code blocks
    const cleanCode = extractJsCodeBlocks(correctedCode);
    if (!cleanCode || cleanCode.trim() === '') {
      throw new Error('StepFixerAgent: No valid JavaScript code blocks found in LLM output');
    }

    // Update sharedState
    sharedState.stepCode = cleanCode;
    sharedState.metadata.lastUpdate = new Date();
    sharedState.metadata.lastFix = {
      stepId: step.id,
      errorCount: errorList.length,
      timestamp: new Date()
    };

    logger.info('StepFixerAgent completed', { 
      traceId, 
      stepId: step.id,
      codeLength: cleanCode.length,
      errorCount: errorList.length
    });

    return cleanCode;
  } catch (err) {
    logger.error('StepFixerAgent error', { 
      traceId, 
      error: err, 
      step: sharedState.step,
      errorCount: sharedState.errorList?.length
    });
    throw err;
  }
}

module.exports = StepFixerAgent; 
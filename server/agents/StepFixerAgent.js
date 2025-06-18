/**
 * StepFixerAgent
 * Input: SharedState
 * Required fields:
 * - currentCode: string - The current game code
 * - currentStep: Step - The current step being processed
 * - errors: Array<string> - List of errors to fix
 * Output: string (fixed step code)
 *
 * Fixes the code for the current step based on errors using LLM.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function StepFixerAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { currentCode, currentStep, errors } = sharedState;
    if (!currentCode) {
      throw new Error('StepFixerAgent: currentCode is required in sharedState');
    }
    if (!currentStep) {
      throw new Error('StepFixerAgent: currentStep is required in sharedState');
    }
    if (!errors || !Array.isArray(errors)) {
      throw new Error('StepFixerAgent: errors array is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('StepFixerAgent: llmClient is required');
    }

    // Log each error for debugging
    errors.forEach((error, index) => {
      logger.debug(`Error ${index + 1}:`, { error });
    });

    logger.info('StepFixerAgent called', { traceId, currentStep, errorCount: errors.length });
    
    // Read the prompt template
    const promptPath = path.join(__dirname, 'prompts', 'StepFixerAgent.prompt.md');
    let promptTemplate = fs.readFileSync(promptPath, 'utf8');
    
    // Replace placeholders in the prompt
    promptTemplate = promptTemplate
      .replace('{{currentCode}}', currentCode)
      .replace('{{step}}', JSON.stringify(currentStep, null, 2))
      .replace('{{errorList}}', JSON.stringify(errors, null, 2));
    
    // Get fixed code from LLM
    const fixedCode = await llmClient.chatCompletion({ 
      prompt: promptTemplate, 
      outputType: 'string',
      temperature: 0.1 // Lower temperature for more deterministic fixes
    });
    
    // Validate that we got actual code back
    if (fixedCode && fixedCode.trim().length > 0) {
      sharedState.stepCode = fixedCode;
    } else {
      logger.error('LLM returned undefined/empty output for step fixer', { traceId, currentStep });
      sharedState.metadata = sharedState.metadata || {};
      sharedState.metadata.llmError = `LLM output was undefined or empty for step fixer: ${currentStep && currentStep.description}`;
      // Do NOT overwrite sharedState.stepCode
    }
    sharedState.metadata.lastUpdate = new Date();
    logger.info('StepFixerAgent output', { traceId, currentStep, errorCount: errors.length, fixedCodeLength: fixedCode ? fixedCode.length : 0 });
    return sharedState.stepCode;

  } catch (error) {
    logger.error('Error in StepFixerAgent:', error);
    throw error;
  }
}

module.exports = StepFixerAgent; 
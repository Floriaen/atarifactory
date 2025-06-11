const fs = require('fs');
const path = require('path');
/**
 * FeedbackAgent
 * Input: SharedState
 * Required fields:
 * - runtimePlayability: object - Runtime playability results
 * - stepId: string - Current step ID
 * Output: string (feedback message)
 *
 * Analyzes runtime logs and suggests actions based on playability results.
 */
// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

const logger = require('../utils/logger');

async function FeedbackAgent(sharedState, { logger, traceId, llmClient }) {
  try {
    // Extract and validate required fields
    const { runtimePlayability, stepId } = sharedState;
    if (!runtimePlayability) {
      throw new Error('FeedbackAgent: runtimePlayability is required in sharedState');
    }
    if (!stepId) {
      throw new Error('FeedbackAgent: stepId is required in sharedState');
    }
    if (!llmClient) {
      throw new Error('FeedbackAgent: llmClient is required');
    }

    logger.info('FeedbackAgent called', { traceId });
    
    // Get feedback from LLM
    const feedback = await llmClient.getFeedback(runtimePlayability, stepId);
    
    // Update sharedState
    sharedState.feedback = feedback;
    sharedState.metadata.lastUpdate = new Date();
    
    logger.info('FeedbackAgent output', { traceId, feedback });
    return feedback;
  } catch (error) {
    logger.error('Error in FeedbackAgent:', error);
    throw error;
  }
}

module.exports = FeedbackAgent; 
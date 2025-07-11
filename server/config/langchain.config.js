/**
 * Centralized Langchain configuration for the game-agent-v2 project
 * 
 * This module provides standardized configuration, LLM instances, and utilities
 * for all Langchain chains, ensuring consistency and maintainability.
 */

import { ChatOpenAI } from '@langchain/openai';

/**
 * Centralized configuration constants
 */
export const LANGCHAIN_CONFIG = {
  models: {
    default: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
    creative: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
    precise: process.env.OPENAI_MODEL || 'gpt-4-1106-preview'
  },
  temperature: {
    creative: 0.7,    // For creative tasks like game invention
    precise: 0.0,     // For structured tasks like planning
    balanced: 0.3     // For moderate creativity tasks
  },
  maxTokens: {
    default: 4000,
    large: 8000,      // For complex generation tasks
    small: 1000       // For simple classification tasks
  },
  timeout: 30000,     // 30 seconds default timeout
  retries: 3          // Number of retries for failed requests
};

/**
 * Standard LLM factory with consistent configuration
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model name (default, creative, precise)
 * @param {string} options.temperature - Temperature setting (creative, precise, balanced)
 * @param {string} options.maxTokens - Max tokens setting (default, large, small)
 * @param {number} options.timeout - Request timeout in milliseconds
 * @param {Array} options.callbacks - Langchain callbacks
 * @returns {ChatOpenAI} Configured LLM instance
 */
export function createStandardLLM(options = {}) {
  const config = {
    model: LANGCHAIN_CONFIG.models[options.model] || LANGCHAIN_CONFIG.models.default,
    temperature: LANGCHAIN_CONFIG.temperature[options.temperature] ?? LANGCHAIN_CONFIG.temperature.precise,
    maxTokens: LANGCHAIN_CONFIG.maxTokens[options.maxTokens] || LANGCHAIN_CONFIG.maxTokens.default,
    timeout: options.timeout || LANGCHAIN_CONFIG.timeout,
    openAIApiKey: process.env.OPENAI_API_KEY
  };

  return new ChatOpenAI(config);
}

/**
 * Creates a token counting callback for shared state
 * @param {Object} sharedState - Shared state object with tokenCount property
 * @param {string} chainName - Name of the chain for logging
 * @returns {Object} Langchain callback for token counting
 */
export function createTokenCountingCallback(sharedState, chainName = 'Unknown') {
  return {
    handleLLMEnd: (output) => {
      if (output.llmOutput?.tokenUsage && sharedState && typeof sharedState.tokenCount === 'number') {
        const tokens = output.llmOutput.tokenUsage.totalTokens;
        sharedState.tokenCount += tokens;
        console.debug(`[${chainName}] Token count - Added: ${tokens}, Total: ${sharedState.tokenCount}`);
      }
    },
    handleLLMError: (error) => {
      console.error(`[${chainName}] LLM Error:`, error);
    }
  };
}

/**
 * Standard chain configuration builder
 * @param {string} chainName - Name of the chain for logging and identification
 * @param {Object} options - Additional configuration options
 * @returns {Object} Standard chain configuration
 */
export function createChainConfig(chainName, options = {}) {
  return {
    runName: chainName,
    callbacks: options.callbacks || [],
    metadata: {
      chainName,
      createdAt: new Date().toISOString(),
      ...options.metadata
    }
  };
}

/**
 * Enhanced LLM factory with token counting and error handling
 * @param {Object} options - Configuration options
 * @param {Object} options.sharedState - Shared state for token counting
 * @param {string} options.chainName - Chain name for logging
 * @returns {ChatOpenAI} Enhanced LLM instance with callbacks
 */
export function createEnhancedLLM(options = {}) {
  const callbacks = [...(options.callbacks || [])];
  
  // Add token counting if sharedState is provided
  if (options.sharedState) {
    callbacks.push(createTokenCountingCallback(options.sharedState, options.chainName));
  }

  // Add standard error logging
  callbacks.push({
    handleLLMStart: (llm, prompts) => {
      console.debug(`[${options.chainName || 'LLM'}] Starting with ${prompts.length} prompt(s)`);
    },
    handleLLMEnd: (output) => {
      console.debug(`[${options.chainName || 'LLM'}] Completed successfully`);
    }
  });

  const llm = createStandardLLM(options);
  
  // Add callbacks to the LLM instance
  if (callbacks.length > 0) {
    return llm.withConfig({ callbacks });
  }
  
  return llm;
}

/**
 * Preset configurations for common chain types
 */
export const CHAIN_PRESETS = {
  creative: {
    model: 'creative',
    temperature: 'creative',
    maxTokens: 'large'
  },
  structured: {
    model: 'precise',
    temperature: 'precise',
    maxTokens: 'default'
  },
  planning: {
    model: 'precise',
    temperature: 'precise',
    maxTokens: 'large'
  },
  validation: {
    model: 'precise',
    temperature: 'precise',
    maxTokens: 'small'
  }
};

/**
 * Helper to get preset configuration
 * @param {string} presetName - Name of the preset (creative, structured, planning, validation)
 * @returns {Object} Preset configuration
 */
export function getPresetConfig(presetName) {
  return CHAIN_PRESETS[presetName] || CHAIN_PRESETS.structured;
}

/**
 * Standard error handler for chain operations
 * @param {Error} error - The error that occurred
 * @param {string} chainName - Name of the chain where error occurred
 * @param {Object} context - Additional context for debugging
 */
export function handleChainError(error, chainName, context = {}) {
  console.error(`[${chainName}] Chain execution failed:`, {
    error: error.message,
    stack: error.stack,
    context
  });
  
  // Rethrow with enhanced error message
  throw new Error(`${chainName} failed: ${error.message}`);
}
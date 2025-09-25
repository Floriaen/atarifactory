/**
 * Centralized Langchain configuration for the game-agent-v2 project
 * 
 * This module provides standardized configuration, LLM instances, and utilities
 * for all Langchain chains, ensuring consistency and maintainability.
 */

import { ChatOpenAI } from '@langchain/openai';
import { llmLogger } from '../utils/logger.js';

/**
 * Centralized configuration constants
 */
export const LANGCHAIN_CONFIG = {
  models: {
    default: process.env.OPENAI_MODEL,
    creative: process.env.OPENAI_MODEL,
    precise: process.env.OPENAI_MODEL
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
  const preset = options.preset ? getPresetConfig(options.preset) : null;
  const mergedOptions = preset ? { ...preset, ...options } : options;

  const resolvedModel = (() => {
    const aliasModels = {
      default: process.env.OPENAI_MODEL || LANGCHAIN_CONFIG.models.default,
      creative: process.env.OPENAI_MODEL || LANGCHAIN_CONFIG.models.creative,
      precise: process.env.OPENAI_MODEL || LANGCHAIN_CONFIG.models.precise
    };

    if (typeof mergedOptions.model === 'string') {
      const aliasValue = aliasModels[mergedOptions.model];
      if (aliasValue) {
        return aliasValue;
      }
      return mergedOptions.model;
    }

    return aliasModels.default;
  })();

  const resolvedTemperature = (() => {
    if (typeof mergedOptions.temperatureValue === 'number') {
      return mergedOptions.temperatureValue;
    }
    if (typeof mergedOptions.temperature === 'number') {
      return mergedOptions.temperature;
    }
    if (typeof mergedOptions.temperature === 'string' && mergedOptions.temperature in LANGCHAIN_CONFIG.temperature) {
      return LANGCHAIN_CONFIG.temperature[mergedOptions.temperature];
    }
    return LANGCHAIN_CONFIG.temperature.precise;
  })();

  const resolvedMaxTokens = (() => {
    if (typeof mergedOptions.maxTokensValue === 'number') {
      return mergedOptions.maxTokensValue;
    }
    if (typeof mergedOptions.maxTokens === 'number') {
      return mergedOptions.maxTokens;
    }
    if (typeof mergedOptions.maxTokens === 'string' && mergedOptions.maxTokens in LANGCHAIN_CONFIG.maxTokens) {
      return LANGCHAIN_CONFIG.maxTokens[mergedOptions.maxTokens];
    }
    return LANGCHAIN_CONFIG.maxTokens.default;
  })();

  const config = {
    model: resolvedModel,
    temperature: resolvedTemperature,
    maxTokens: resolvedMaxTokens,
    timeout: mergedOptions.timeout || LANGCHAIN_CONFIG.timeout,
    openAIApiKey: process.env.OPENAI_API_KEY
  };

  if (Array.isArray(mergedOptions.callbacks) && mergedOptions.callbacks.length > 0) {
    config.callbacks = mergedOptions.callbacks;
  }

  return new ChatOpenAI(config);
}

/**
 * Creates a token counting callback for shared state
 * @param {Object} sharedState - Shared state object with tokenCount property
 * @param {string} chainName - Name of the chain for logging
 * @param {string} traceId - Optional trace ID for request correlation
 * @returns {Object} Langchain callback for token counting
 */
export function createTokenCountingCallback(sharedState, chainName = 'Unknown', traceId = null) {
  return {
    handleLLMEnd: (output) => {
      try {
        const usage = output.llmOutput?.tokenUsage;
        if (usage && sharedState && typeof sharedState.tokenCount === 'number') {
          const prompt = Number(usage.promptTokens || 0);
          const completion = Number(usage.completionTokens || 0);
          const total = Number(usage.totalTokens || (prompt + completion));
          sharedState.promptTokens = (sharedState.promptTokens || 0) + prompt;
          sharedState.completionTokens = (sharedState.completionTokens || 0) + completion;
          sharedState.tokenCount += total;
          // Per-model bucket (best-effort using current model env)
          const model = process.env.OPENAI_MODEL || 'default';
          if (!sharedState.modelTotals) sharedState.modelTotals = {};
          if (!sharedState.modelTotals[model]) sharedState.modelTotals[model] = { prompt: 0, completion: 0, total: 0 };
          sharedState.modelTotals[model].prompt += prompt;
          sharedState.modelTotals[model].completion += completion;
          sharedState.modelTotals[model].total += total;
          llmLogger.logTokenUsage(chainName, total, sharedState.tokenCount, traceId);
        }
      } catch (e) {
        // swallow counting errors; do not disrupt chain
      }
    },
    handleLLMError: (error) => {
      llmLogger.logLLMError(chainName, error, traceId);
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
 * @param {string} options.traceId - Trace ID for request correlation
 * @returns {ChatOpenAI} Enhanced LLM instance with callbacks
 */
export function createEnhancedLLM(options = {}) {
  const callbacks = [...(options.callbacks || [])];
  
  // Add token counting if sharedState is provided
  if (options.sharedState) {
    callbacks.push(createTokenCountingCallback(options.sharedState, options.chainName, options.traceId));
  }

  // Add standard error logging
  callbacks.push({
    handleLLMStart: (llm, prompts) => {
      llmLogger.logLLMStart(options.chainName || 'LLM', prompts.length, options.traceId);
    },
    handleLLMEnd: (output) => {
      llmLogger.logLLMEnd(options.chainName || 'LLM', options.traceId);
    }
  });

  const { sharedState, chainName, traceId, callbacks: originalCallbacks, ...llmOptions } = options;
  if (callbacks.length > 0) {
    llmOptions.callbacks = callbacks;
  }

  return createStandardLLM(llmOptions);
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
 * @param {string} traceId - Optional trace ID for request correlation
 */
export function handleChainError(error, chainName, context = {}, traceId = null) {
  llmLogger.logLLMError(chainName, error, traceId);
  
  // Rethrow with enhanced error message
  throw new Error(`${chainName} failed: ${error.message}`);
}

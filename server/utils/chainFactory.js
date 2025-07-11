/**
 * Standardized chain factory utilities for consistent Langchain chain creation
 * 
 * This module provides a unified approach to creating chains with:
 * - Consistent configuration patterns
 * - Structured output support
 * - Token counting and logging
 * - Error handling
 */

import { promises as fs } from 'fs';
import path from 'path';
import { PromptTemplate } from '@langchain/core/prompts';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  createStandardLLM,
  createTokenCountingCallback,
  createChainConfig, 
  getPresetConfig,
  handleChainError 
} from '../config/langchain.config.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Standard chain factory options interface
 * @typedef {Object} ChainFactoryOptions
 * @property {string} chainName - Name of the chain for logging and identification
 * @property {string} promptFile - Path to the prompt file (relative to prompts directory)
 * @property {string[]} inputVariables - Variables for the prompt template
 * @property {Object} schema - Zod schema for structured output (optional)
 * @property {string} preset - Configuration preset (creative, structured, planning, validation)
 * @property {Object} llm - Custom LLM instance (optional, will create standard if not provided)
 * @property {Object} sharedState - Shared state for token counting (optional)
 * @property {Function} customInvoke - Custom invoke function (optional)
 * @property {boolean} enableLogging - Enable detailed logging (default: true)
 */

/**
 * Creates a standardized chain with consistent patterns
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} Configured chain instance
 */
export async function createStandardChain(options) {
  const {
    chainName,
    promptFile,
    inputVariables = [],
    schema,
    preset = 'structured',
    llm: customLLM,
    sharedState,
    customInvoke,
    enableLogging = true
  } = options;

  if (!chainName) {
    throw new Error('Chain name is required for standardized chain creation');
  }

  try {
    // Load prompt template
    const promptPath = path.join(__dirname, '../agents/prompts', promptFile);
    const promptString = await fs.readFile(promptPath, 'utf8');
    
    if (enableLogging) {
      console.debug(`[${chainName}] Loaded prompt from ${promptFile}`);
    }

    // Create prompt template
    const prompt = new PromptTemplate({
      template: promptString,
      inputVariables
    });

    // Create or use provided LLM
    let baseLLM = customLLM;
    if (!baseLLM) {
      const presetConfig = getPresetConfig(preset);
      baseLLM = createStandardLLM(presetConfig); // Get the base LLM without callbacks first
    }

    // Configure structured output if schema provided (before adding callbacks)
    const configuredLLM = schema ? baseLLM.withStructuredOutput(schema) : baseLLM;
    
    // Add callbacks after structured output configuration
    let finalLLM = configuredLLM;
    if (!customLLM && sharedState) {
      // Only add callbacks if we created the LLM ourselves
      const tokenCallback = createTokenCountingCallback(sharedState, chainName);
      finalLLM = configuredLLM.withConfig({ 
        callbacks: [tokenCallback] 
      });
    }

    // Build chain with standard configuration
    const chainConfig = createChainConfig(chainName, {
      callbacks: [{
        handleLLMEnd: (output) => {
          if (enableLogging) {
            console.debug(`[${chainName}] LLM response received`);
          }
        }
      }]
    });

    const baseChain = prompt.pipe(finalLLM).withConfig(chainConfig);

    // Return enhanced chain with custom invoke if provided
    if (customInvoke) {
      return {
        async invoke(input) {
          try {
            return await customInvoke(input, baseChain, { chainName, enableLogging });
          } catch (error) {
            handleChainError(error, chainName, { input });
          }
        }
      };
    }

    // Return standard chain
    return {
      async invoke(input) {
        try {
          if (enableLogging) {
            console.debug(`[${chainName}] Invoking with input:`, input);
          }
          const result = await baseChain.invoke(input);
          if (enableLogging) {
            console.debug(`[${chainName}] Successfully completed`);
          }
          return result;
        } catch (error) {
          handleChainError(error, chainName, { input });
        }
      }
    };

  } catch (error) {
    handleChainError(error, chainName, { promptFile, inputVariables });
  }
}

/**
 * Creates a JSON extraction chain with standardized patterns
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} JSON extraction chain
 */
export async function createJSONChain(options) {
  if (!options.schema) {
    throw new Error('Schema is required for JSON extraction chains');
  }

  return createStandardChain({
    preset: 'structured',
    ...options
  });
}

/**
 * Creates a creative chain with standardized patterns
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} Creative chain
 */
export async function createCreativeChain(options) {
  return createStandardChain({
    preset: 'creative',
    ...options
  });
}

/**
 * Creates a planning chain with standardized patterns
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} Planning chain
 */
export async function createPlanningChain(options) {
  return createStandardChain({
    preset: 'planning',
    ...options
  });
}

/**
 * Creates a validation chain with standardized patterns
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} Validation chain
 */
export async function createValidationChain(options) {
  return createStandardChain({
    preset: 'validation',
    ...options
  });
}

/**
 * Migrates an existing chain to use standardized patterns
 * @param {Function} legacyChainFactory - Existing chain factory function
 * @param {Object} migrationConfig - Migration configuration
 * @returns {Function} Migrated chain factory
 */
export function migrateChain(legacyChainFactory, migrationConfig) {
  return async function migratedChainFactory(llm, ...args) {
    console.warn(`[Migration] Using legacy chain factory for ${migrationConfig.chainName}. Consider updating to standardized factory.`);
    
    try {
      return await legacyChainFactory(llm, ...args);
    } catch (error) {
      handleChainError(error, migrationConfig.chainName, { migration: true });
    }
  };
}

/**
 * Utility to validate chain factory options
 * @param {ChainFactoryOptions} options - Options to validate
 * @throws {Error} If validation fails
 */
export function validateChainOptions(options) {
  const required = ['chainName', 'promptFile'];
  const missing = required.filter(key => !options[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required chain options: ${missing.join(', ')}`);
  }

  if (options.inputVariables && !Array.isArray(options.inputVariables)) {
    throw new Error('inputVariables must be an array');
  }

  if (options.preset && !['creative', 'structured', 'planning', 'validation'].includes(options.preset)) {
    throw new Error(`Invalid preset: ${options.preset}. Must be one of: creative, structured, planning, validation`);
  }
}

/**
 * Helper to create a chain with automatic preset detection based on name
 * @param {ChainFactoryOptions} options - Chain configuration options
 * @returns {Promise<Object>} Configured chain
 */
export async function createSmartChain(options) {
  // Auto-detect preset based on chain name
  if (!options.preset) {
    const name = options.chainName.toLowerCase();
    if (name.includes('inventor') || name.includes('creative') || name.includes('idea')) {
      options.preset = 'creative';
    } else if (name.includes('planner') || name.includes('plan')) {
      options.preset = 'planning';
    } else if (name.includes('validator') || name.includes('check') || name.includes('validate')) {
      options.preset = 'validation';
    } else {
      options.preset = 'structured';
    }
  }

  validateChainOptions(options);
  return createStandardChain(options);
}
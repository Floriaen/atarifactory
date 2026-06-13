/**
 * Example demonstrating the new standardized chain patterns
 * 
 * This file shows how to use the new centralized configuration
 * and standardized chain factories for consistent, maintainable code.
 */

import { createFeedbackChain } from '../agents/chains/coding/FeedbackChain.js';
import { createStandardLLM, CHAIN_PRESETS, createTokenCountingCallback } from '../config/langchain.config.js';
import { createSmartChain } from '../utils/chainFactory.js';
import { feedbackSchema, ideaGeneratorSchema } from '../schemas/langchain-schemas.js';

/**
 * Example 1: Using modernized existing chains with token counting
 */
async function exampleModernizedChains() {
  console.log('\n=== Example 1: Modernized Chains with Token Counting ===');
  
  // Create shared state for token counting
  const sharedState = { tokenCount: 0 };
  
  // Create chains with token counting
  const feedbackChain = await createFeedbackChain(undefined, { 
    sharedState,
    enableLogging: true 
  });
  
  console.log('Initial token count:', sharedState.tokenCount);
  
  // Example usage (commented out to avoid API calls in demo)
  /*
  const feedback = await feedbackChain.invoke({
    runtimeLogs: JSON.stringify({ canvasActive: false }),
    stepId: 'test-step'
  });
  console.log('After Feedback:', sharedState.tokenCount, 'tokens');
  */
  
  console.log('Chains created successfully with centralized configuration');
}

/**
 * Example 2: Using the new chain factory directly
 */
async function exampleStandardizedFactory() {
  console.log('\n=== Example 2: Standardized Chain Factory ===');
  
  // Create a new chain using the smart factory
  const customChain = await createSmartChain({
    chainName: 'CustomValidatorChain',
    promptFile: 'PlayabilityValidatorChain.prompt.md', // Reuse existing prompt
    inputVariables: ['mechanics', 'winCondition'],
    schema: feedbackSchema, // Could use any compatible schema
    sharedState: { tokenCount: 0 }
  });
  
  console.log('Custom chain created with auto-detected preset');
  console.log('Chain type: validation (auto-detected from name)');
}

/**
 * Example 3: Direct LLM configuration with presets
 */
async function exampleLLMConfiguration() {
  console.log('\n=== Example 3: LLM Configuration with Presets ===');
  
  // Create different LLM types using presets
  const creativeLLM = createStandardLLM(CHAIN_PRESETS.creative);
  const structuredLLM = createStandardLLM(CHAIN_PRESETS.structured);
  const planningLLM = createStandardLLM(CHAIN_PRESETS.planning);
  
  console.log('Creative LLM:', {
    temperature: 0.7,
    model: process.env.OPENAI_MODEL,
    maxTokens: 8000
  });
  
  console.log('Structured LLM:', {
    temperature: 0.0,
    model: process.env.OPENAI_MODEL,
    maxTokens: 4000
  });
  
  console.log('Planning LLM:', {
    temperature: 0.0,
    model: process.env.OPENAI_MODEL,
    maxTokens: 8000
  });
}

/**
 * Example 4: Advanced token counting and callbacks
 */
async function exampleAdvancedFeatures() {
  console.log('\n=== Example 4: Advanced Features ===');
  
  const sharedState = { tokenCount: 0 };
  
  // Create custom callback
  const customCallback = createTokenCountingCallback(sharedState, 'AdvancedExample');
  
  // Create LLM with multiple callbacks
  const llm = createStandardLLM({
    ...CHAIN_PRESETS.structured,
    callbacks: [
      customCallback,
      {
        handleLLMStart: () => console.log('🚀 LLM operation starting...'),
        handleLLMEnd: () => console.log('✅ LLM operation completed'),
        handleLLMError: (error) => console.log('❌ LLM operation failed:', error.message)
      }
    ]
  });
  
  console.log('Enhanced LLM created with multiple callbacks');
  console.log('Token counting and custom logging enabled');
}

/**
 * Example 5: Schema validation benefits
 */
async function exampleSchemaValidation() {
  console.log('\n=== Example 5: Schema Validation Benefits ===');
  
  try {
    // This demonstrates how schemas provide type safety
    const validIdea = ideaGeneratorSchema.parse({
      title: 'Space Adventure',
      pitch: 'An exciting space exploration game in 60 seconds'
    });
    console.log('✅ Valid idea:', validIdea);
    
    // This would throw a validation error
    /*
    const invalidIdea = ideaGeneratorSchema.parse({
      title: '', // Invalid: empty string
      pitch: 'A game description'
    });
    */
    
  } catch (error) {
    console.log('❌ Schema validation caught error:', error.message);
  }
  
  console.log('Schema validation provides runtime type safety');
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('🎯 Standardized Chain Patterns Demo');
  console.log('=====================================');
  
  await exampleModernizedChains();
  await exampleStandardizedFactory();
  await exampleLLMConfiguration();
  await exampleAdvancedFeatures();
  await exampleSchemaValidation();
  
  console.log('\n🎉 All examples completed successfully!');
  console.log('\nKey benefits of the new patterns:');
  console.log('• Consistent configuration across all chains');
  console.log('• Automatic token counting and logging');
  console.log('• Type safety with Zod schema validation');
  console.log('• Centralized error handling');
  console.log('• Backward compatibility with existing code');
  console.log('• Easy customization and extension');
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export {
  exampleModernizedChains,
  exampleStandardizedFactory,
  exampleLLMConfiguration,
  exampleAdvancedFeatures,
  exampleSchemaValidation,
  runExamples
};

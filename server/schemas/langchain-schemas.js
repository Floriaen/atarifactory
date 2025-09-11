/**
 * Zod schemas for Langchain structured output validation
 * 
 * These schemas define the expected output structure for each chain,
 * providing type safety and runtime validation for LLM responses.
 */

import { z } from 'zod';

// (removed) GameInventorChain schema — replaced by IdeaGeneratorChain

/**
 * PlannerChain output schema
 * Expected: Array of { id: number, description: string }
 * Note: Wrapped in object because OpenAI structured output requires root object
 */
export const plannerSchema = z.object({
  plan: z.array(
    z.object({
      id: z.number().positive('Plan step ID must be positive'),
      description: z.string().min(1, 'Plan step description is required')
    })
  ).min(1, 'At least one plan step is required')
});

/**
 * PlayabilityValidatorChain output schema
 * Expected: { winnable: boolean, suggestion: string }
 */
export const playabilityValidatorSchema = z.object({
  winnable: z.boolean().describe('Whether the game is winnable with given mechanics'),
  suggestion: z.string().describe('Suggestion for improvement, or "None needed" if winnable')
});

/**
 * FeedbackChain output schema
 * Expected: { retryTarget: 'fixer' | 'planner', suggestion: string }
 */
export const feedbackSchema = z.object({
  retryTarget: z.enum(['fixer', 'planner']).describe('Which component should retry the failed operation'),
  suggestion: z.string().min(1, 'Suggestion for improvement is required')
});

/**
 * PlayabilityAutoFixChain output schema
 * Expected: { gameDefinition: object, improvements: string[] }
 */
export const playabilityAutoFixSchema = z.object({
  gameDefinition: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    mechanics: z.array(z.string()).min(1),
    winCondition: z.string().min(1),
    entities: z.array(z.string()).min(1)
  }),
  improvements: z.array(z.string()).default([])
});

/**
 * Design phase schemas for more complex chains
 */

/**
 * IdeaGeneratorChain output schema
 * Expected: { title: string, pitch: string }
 */
export const ideaGeneratorSchema = z.object({
  title: z.string().min(1, 'Game title is required'),
  pitch: z.string().min(1, 'Game pitch is required')
});

/**
 * MechanicExtractorChain output schema
 * Expected: { mechanics: string[] }
 */
export const mechanicExtractorSchema = z.object({
  mechanics: z.array(z.string()).min(1, 'At least one mechanic is required')
});

/**
 * EntityListBuilderChain output schema
 * Expected: { entities: string[] }
 */
export const entityListBuilderSchema = z.object({
  entities: z.array(z.string()).min(1, 'At least one entity is required')
});

/**
 * WinConditionBuilderChain output schema
 * Expected: { winCondition: string }
 */
export const winConditionBuilderSchema = z.object({
  winCondition: z.string().min(1, 'Win condition is required')
});

/**
 * LoopClarifierChain output schema
 * Expected: { loop: string }
 */
export const loopClarifierSchema = z.object({
  loop: z.string().min(1, 'Game loop description is required')
});

/**
 * PlayabilityHeuristicChain output schema
 * Expected: { playabilityAssessment: string, strengths: string[], potentialIssues: string[], score: number }
 */
export const playabilityHeuristicSchema = z.object({
  playabilityAssessment: z.string().min(1, 'Playability assessment is required'),
  strengths: z.array(z.string()).default([]),
  potentialIssues: z.array(z.string()).default([]),
  score: z.number().min(0).max(10, 'Score must be between 0 and 10')
});

/**
 * FinalAssemblerChain output schema
 * Expected: { gameDef: object }
 */
export const finalAssemblerSchema = z.object({
  gameDef: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    mechanics: z.array(z.string()).min(1),
    winCondition: z.string().min(1),
    entities: z.array(z.string()).min(1)
  })
});

/**
 * Common validation helpers
 */

/**
 * Validates that a string is a valid JSON
 */
export const jsonStringSchema = z.string().refine(
  (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Must be valid JSON string' }
);

/**
 * Generic schema for any chain that returns a simple object
 */
export const genericObjectSchema = z.record(z.any());

/**
 * Helper function to create a schema with additional validation
 */
export function createSchemaWithValidation(baseSchema, validator) {
  return baseSchema.refine(validator.test, validator.message);
}

/**
 * SpriteDesignChain DSL schema (OpenAI structured outputs compatible)
 * Expected:
 * {
 *   gridSize: number (8..32, default 12),
 *   frames: [ { ops: string[] } ] (1..3 frames),
 *   meta: { entity: string }
 * }
 */
export const spriteDslSchema = z.object({
  gridSize: z.number().int().min(8).max(32).default(12),
  frames: z.array(z.object({ ops: z.array(z.string().min(1)) })).min(1).max(3),
  meta: z.object({ entity: z.string().min(1) })
});

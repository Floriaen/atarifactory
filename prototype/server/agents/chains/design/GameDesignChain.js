// Minimal integration for TDD - wires up the chain stubs
import fs from 'fs';
import path from 'path';

export const CHAIN_STATUS = {
  name: 'GameDesignChain',
  label: 'Game Design',
  description: 'Creating game mechanics and entities',
  category: 'planning'
};

const COT_LOG_PATH = path.join(process.cwd(), 'logs/GameDesignChain.cot.log.txt'); // Chain-of-Thought log

import { createIdeaGeneratorChain } from './IdeaGeneratorChain.js';
import { createLoopClarifierChain } from './LoopClarifierChain.js';
import { createMechanicExtractorChain } from './MechanicExtractorChain.js';
import { createWinConditionBuilderChain } from './WinConditionBuilderChain.js';
import { createEntityListBuilderChain } from './EntityListBuilderChain.js';
import { createPlayabilityHeuristicChain } from './PlayabilityHeuristicChain.js';
import { createFinalAssemblerChain } from './FinalAssemblerChain.js';
import { createInitialContext, mergeContext, contextToPrompt } from '../../../utils/designContext.js';

/**
 * Generic phase runner for a design step.
 * @param {Object}   opts
 * @param {Object}   opts.chain - The chain instance with .invoke(input)
 * @param {string}   opts.phase - Name of the phase (for logging/events)
 * @param {Object}   opts.input - Input to the chain
 * @param {Object}   opts.sharedState - Shared state object (for tokenCount, event emission)
 * @param {Function} opts.logCOT - Async function (phase, input, output)
 * @param {Function} opts.validate - Function (output) => boolean
 * @returns {Promise<Object>} - Output of the chain
 */
async function runDesignPhase({ chain, phase, input, sharedState, logCOT, validate }) {
  let output;
  try {
    output = await chain.invoke(input);
    await logCOT(phase, input, output);
    if (sharedState?.onStatusUpdate) {
       
      sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
    }
    if (!validate(output)) {
      await logCOT('Error', input, { error: `Invalid output from ${phase}`, output });
      throw new Error(`Invalid output from ${phase}`);
    }
    return output;
  } catch (err) {
    await logCOT('Error', input, { error: err.message, output });
    throw err;
  }
}

async function createGameDesignChain({
  llm,
  sharedState = undefined
}) {
  // Pre-create all chains since they are now async
  const ideaChain = await createIdeaGeneratorChain(llm, { sharedState });
  const loopChain = await createLoopClarifierChain(llm, { sharedState });
  const mechanicsChain = await createMechanicExtractorChain(llm, { sharedState });
  const winChain = await createWinConditionBuilderChain(llm, { sharedState });
  const entitiesChain = await createEntityListBuilderChain(llm, { sharedState });
  const playabilityChain = await createPlayabilityHeuristicChain(llm, { sharedState });
  const finalChain = await createFinalAssemblerChain(llm);

  return {
    async invoke(input = {}) {
      let context = createInitialContext(input);
      // Helper to log CoT step
      async function logCOT(step, stepInput, stepOutput) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          step,
          input: stepInput,
          output: stepOutput
        };
        try {
          // Ensure logs directory exists
          await fs.promises.mkdir(path.dirname(COT_LOG_PATH), { recursive: true });
          // Append log entry (creates file if missing)
          await fs.promises.appendFile(COT_LOG_PATH, JSON.stringify(logEntry) + '\n');
        } catch (e) {
          throw new Error(`COT logging failed: ${e.message}`);
        }
      }

      // IDEA PHASE
      const idea = await runDesignPhase({
        chain: ideaChain,
        phase: 'Idea',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.title && out.pitch
      });
      context = mergeContext(context, { title: idea.title, pitch: idea.pitch, constraints: idea.constraints });

      // LOOP PHASE
      const loop = await runDesignPhase({
        chain: loopChain,
        phase: 'Loop',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.loop
      });
      context = mergeContext(context, { loop: loop.loop });

      // MECHANICS PHASE
      const mechanics = await runDesignPhase({
        chain: mechanicsChain,
        phase: 'Mechanics',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && Array.isArray(out.mechanics)
      });
      context = mergeContext(context, { mechanics: mechanics.mechanics });

      // WIN CONDITION PHASE
      const win = await runDesignPhase({
        chain: winChain,
        phase: 'WinCondition',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.winCondition
      });
      context = mergeContext(context, { winCondition: win.winCondition });

      // ENTITIES PHASE
      const entities = await runDesignPhase({
        chain: entitiesChain,
        phase: 'Entities',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && Array.isArray(out.entities)
      });
      context = mergeContext(context, { entities: entities.entities });

      // PLAYABILITY PHASE
      const playability = await runDesignPhase({
        chain: playabilityChain,
        phase: 'Playability',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.playabilityAssessment && out.strengths && out.potentialIssues && out.score
      });

      // FINAL ASSEMBLY PHASE
      const final = await runDesignPhase({
        chain: finalChain,
        phase: 'FinalAssembly',
        input: { context },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.gameDef
      });

      // Optionally attach playability
      if (playability && final && final.gameDef) {
        final.gameDef.playability = playability;
      }

      // Return the gameDef object directly if input has name/title, else { gameDef: ... }
      if (input && (input.name || input.title)) {
        return final && final.gameDef ? final.gameDef : undefined;
      }
      return final && final.gameDef ? { gameDef: final.gameDef } : undefined;
    }
  }
}

export { createGameDesignChain, runDesignPhase };

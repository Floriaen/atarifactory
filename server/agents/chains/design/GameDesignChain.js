// Minimal integration for TDD - wires up the chain stubs
import fs from 'fs';
import path from 'path';

const COT_LOG_PATH = path.join(process.cwd(), 'logs/GameDesignChain.cot.log.txt'); // Chain-of-Thought log

import { createIdeaGeneratorChain } from './IdeaGeneratorChain.js';
import { createLoopClarifierChain } from './LoopClarifierChain.js';
import { createMechanicExtractorChain } from './MechanicExtractorChain.js';
import { createWinConditionBuilderChain } from './WinConditionBuilderChain.js';
import { createEntityListBuilderChain } from './EntityListBuilderChain.js';
import { createPlayabilityHeuristicChain } from './PlayabilityHeuristicChain.js';
import { createFinalAssemblerChain } from './FinalAssemblerChain.js';

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

function createGameDesignChain({
  llm,
  sharedState = undefined
}) {

  return {
    async invoke(input = {}) {
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
        chain: createIdeaGeneratorChain(llm, { sharedState }),
        phase: 'Idea',
        input,
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.title && out.pitch
      });

      // LOOP PHASE
      const loop = await runDesignPhase({
        chain: createLoopClarifierChain(llm, { sharedState }),
        phase: 'Loop',
        input: { ...input, ...idea },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.loop
      });

      // MECHANICS PHASE
      const mechanics = await runDesignPhase({
        chain: createMechanicExtractorChain(llm, { sharedState }),
        phase: 'Mechanics',
        input: { ...input, ...idea, ...loop },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && Array.isArray(out.mechanics)
      });

      // WIN CONDITION PHASE
      const win = await runDesignPhase({
        chain: createWinConditionBuilderChain(llm, { sharedState }),
        phase: 'WinCondition',
        input: { ...input, ...idea, ...loop, ...mechanics },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.winCondition
      });

      // ENTITIES PHASE
      const entities = await runDesignPhase({
        chain: createEntityListBuilderChain(llm, { sharedState }),
        phase: 'Entities',
        input: { ...input, ...idea, ...loop, ...mechanics, ...win },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && Array.isArray(out.entities)
      });

      // PLAYABILITY PHASE
      const playability = await runDesignPhase({
        chain: createPlayabilityHeuristicChain(llm, { sharedState }),
        phase: 'Playability',
        input: { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } },
        sharedState,
        logCOT,
        validate: (out) => out && typeof out === 'object' && out.playabilityAssessment && out.strengths && out.potentialIssues && out.score
      });

      // FINAL ASSEMBLY PHASE
      const final = await runDesignPhase({
        chain: createFinalAssemblerChain(llm),
        phase: 'FinalAssembly',
        input: {
          title: idea.title,
          pitch: idea.pitch,
          loop: loop.loop,
          mechanics: mechanics.mechanics,
          winCondition: win.winCondition,
          entities: entities.entities
        },
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
// Minimal integration for TDD - wires up the chain stubs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COT_LOG_PATH = path.join(__dirname, '../../../logs/GameDesignChain.cot.log.txt'); // Chain-of-Thought log

import { createIdeaGeneratorChain } from './IdeaGeneratorChain.mjs';
import { createLoopClarifierChain } from './LoopClarifierChain.mjs';
import { createMechanicExtractorChain } from './MechanicExtractorChain.mjs';
import { createWinConditionBuilderChain } from './WinConditionBuilderChain.mjs';
import { createEntityListBuilderChain } from './EntityListBuilderChain.mjs';
import { createPlayabilityHeuristicChain } from './PlayabilityHeuristicChain.mjs';
import { createFinalAssemblerChain } from './FinalAssemblerChain.mjs';

function createGameDesignChain({
  ideaLLM,
  loopLLM,
  mechanicLLM,
  winLLM,
  entityLLM,
  playabilityLLM,
  finalLLM
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
          await fs.promises.appendFile(COT_LOG_PATH, JSON.stringify(logEntry) + '\n');
        } catch (e) {
          // Fail silently if logging fails
        }
      }
      const idea = await createIdeaGeneratorChain(ideaLLM).invoke(input);
      console.debug('[DEBUG] IdeaGeneratorChain LLM output:', idea);
      await logCOT('IdeaGeneratorChain', input, idea);
      if (!idea || typeof idea !== 'object' || !idea.title || !idea.pitch) {
        await logCOT('Error', input, { error: 'Invalid output from IdeaGeneratorChain', idea });
        throw new Error('Invalid output from IdeaGeneratorChain');
      }
      const loop = await createLoopClarifierChain(loopLLM).invoke({ ...input, ...idea });
      console.debug('[DEBUG] LoopClarifierChain LLM output:', loop);
      await logCOT('LoopClarifierChain', { ...input, ...idea }, loop);
      if (!loop || typeof loop !== 'object' || !loop.loop) {
        await logCOT('Error', { ...input, ...idea }, { error: 'Invalid output from LoopClarifierChain', loop });
        throw new Error('Invalid output from LoopClarifierChain');
      }
      const mechanics = await createMechanicExtractorChain(mechanicLLM).invoke({ ...input, ...idea, ...loop });
      console.debug('[DEBUG] MechanicExtractorChain LLM output:', mechanics);
      await logCOT('MechanicExtractorChain', { ...input, ...idea, ...loop }, mechanics);
      if (!mechanics || typeof mechanics !== 'object' || !Array.isArray(mechanics.mechanics)) {
        await logCOT('Error', { ...input, ...idea, ...loop }, { error: 'Invalid output from MechanicExtractorChain', mechanics });
        throw new Error('Invalid output from MechanicExtractorChain');
      }
      const win = await createWinConditionBuilderChain(winLLM).invoke({ ...input, ...idea, ...loop, ...mechanics });
      console.debug('[DEBUG] WinConditionBuilderChain LLM output:', win);
      await logCOT('WinConditionBuilderChain', { ...input, ...idea, ...loop, ...mechanics }, win);
      if (!win || typeof win !== 'object' || !win.winCondition) {
        await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics }, { error: 'Invalid output from WinConditionBuilderChain', win });
        throw new Error('Invalid output from WinConditionBuilderChain');
      }
      const entities = await createEntityListBuilderChain(entityLLM).invoke({ ...input, ...idea, ...loop, ...mechanics, ...win });
      console.debug('[DEBUG] EntityListBuilderChain LLM output:', entities);
      await logCOT('EntityListBuilderChain', { ...input, ...idea, ...loop, ...mechanics, ...win }, entities);
      if (!entities || typeof entities !== 'object' || !Array.isArray(entities.entities)) {
        await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics, ...win }, { error: 'Invalid output from EntityListBuilderChain', entities });
        throw new Error('Invalid output from EntityListBuilderChain');
      }
      const playability = await createPlayabilityHeuristicChain(playabilityLLM).invoke({ gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } });
      console.debug('[DEBUG] PlayabilityHeuristicChain LLM output:', playability);
      await logCOT('PlayabilityHeuristicChain', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, playability);
      if (typeof playability !== 'string') {
        await logCOT('Error', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, { error: 'Invalid output from PlayabilityHeuristicChain', playability });
        throw new Error('Invalid output from PlayabilityHeuristicChain');
      }
      // Assemble final game definition
      const final = await createFinalAssemblerChain(finalLLM).invoke({
        title: idea.title,
        pitch: idea.pitch,
        loop: loop.loop,
        mechanics: mechanics.mechanics,
        winCondition: win.winCondition,
        entities: entities.entities
      });
      console.debug('[DEBUG] FinalAssemblerChain LLM output:', final);
      await logCOT('FinalAssemblerChain', {
        title: idea.title,
        pitch: idea.pitch,
        loop: loop.loop,
        mechanics: mechanics.mechanics,
        winCondition: win.winCondition,
        entities: entities.entities
      }, final);
      if (!final || typeof final !== 'object' || !final.gameDef) {
        await logCOT('Error', {
          title: idea.title,
          pitch: idea.pitch,
          loop: loop.loop,
          mechanics: mechanics.mechanics,
          winCondition: win.winCondition,
          entities: entities.entities
        }, { error: 'Invalid output from FinalAssemblerChain', final });
        throw new Error('Invalid output from FinalAssemblerChain');
      }

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

export { createGameDesignChain };

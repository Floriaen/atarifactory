// Minimal integration for TDD - wires up the chain stubs
import fs from 'fs';
import path from 'path';

const COT_LOG_PATH = path.join(process.cwd(), 'logs/GameDesignChain.cot.log.txt'); // Chain-of-Thought log

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
  finalLLM,
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
          // Fail silently if logging fails
        }
      }
      let idea;
      try {
        idea = await createIdeaGeneratorChain(ideaLLM, { sharedState }).invoke(input);
        console.debug('[DEBUG] IdeaGeneratorChain LLM output:', idea);
      } catch (err) {
        console.error('[IdeaGeneratorChain] JSON parse error:', err, '\nRaw LLM output:', typeof idea !== 'undefined' ? idea : '[no output]');
        throw err;
      }
      await logCOT('IdeaGeneratorChain', input, idea);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'Idea', status: 'done', output: idea, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!idea || typeof idea !== 'object' || !idea.title || !idea.pitch) {
        await logCOT('Error', input, { error: 'Invalid output from IdeaGeneratorChain', idea });
        throw new Error('Invalid output from IdeaGeneratorChain');
      }
      let loop;
      try {
        loop = await createLoopClarifierChain(loopLLM, { sharedState }).invoke({ ...input, ...idea });
        console.debug('[DEBUG] LoopClarifierChain LLM output:', loop);
      } catch (err) {
        console.error('[LoopClarifierChain] JSON parse error:', err, '\nRaw LLM output:', typeof loop !== 'undefined' ? loop : '[no output]');
        throw err;
      }
      await logCOT('LoopClarifierChain', { ...input, ...idea }, loop);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'Loop', status: 'done', output: loop, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!loop || typeof loop !== 'object' || !loop.loop) {
        await logCOT('Error', { ...input, ...idea }, { error: 'Invalid output from LoopClarifierChain', loop });
        throw new Error('Invalid output from LoopClarifierChain');
      }
      let mechanics;
      try {
        mechanics = await createMechanicExtractorChain(mechanicLLM, { sharedState }).invoke({ ...input, ...idea, ...loop });
        console.debug('[DEBUG] MechanicExtractorChain LLM output:', mechanics);
      } catch (err) {
        console.error('[MechanicExtractorChain] JSON parse error:', err, '\nRaw LLM output:', typeof mechanics !== 'undefined' ? mechanics : '[no output]');
        throw err;
      }
      await logCOT('MechanicExtractorChain', { ...input, ...idea, ...loop }, mechanics);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'Mechanics', status: 'done', output: mechanics, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!mechanics || typeof mechanics !== 'object' || !Array.isArray(mechanics.mechanics)) {
        await logCOT('Error', { ...input, ...idea, ...loop }, { error: 'Invalid output from MechanicExtractorChain', mechanics });
        throw new Error('Invalid output from MechanicExtractorChain');
      }
      let win;
      try {
        win = await createWinConditionBuilderChain(winLLM, { sharedState }).invoke({ ...input, ...idea, ...loop, ...mechanics });
        console.debug('[DEBUG] WinConditionBuilderChain LLM output:', win);
      } catch (err) {
        console.error('[WinConditionBuilderChain] JSON parse error:', err, '\nRaw LLM output:', typeof win !== 'undefined' ? win : '[no output]');
        throw err;
      }
      await logCOT('WinConditionBuilderChain', { ...input, ...idea, ...loop, ...mechanics }, win);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'WinCondition', status: 'done', output: win, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!win || typeof win !== 'object' || !win.winCondition) {
        await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics }, { error: 'Invalid output from WinConditionBuilderChain', win });
        throw new Error('Invalid output from WinConditionBuilderChain');
      }
      let entities;
      try {
        entities = await createEntityListBuilderChain(entityLLM, { sharedState }).invoke({ ...input, ...idea, ...loop, ...mechanics, ...win });
        console.debug('[DEBUG] EntityListBuilderChain LLM output:', entities);
      } catch (err) {
        console.error('[EntityListBuilderChain] JSON parse error:', err, '\nRaw LLM output:', typeof entities !== 'undefined' ? entities : '[no output]');
        throw err;
      }
      await logCOT('EntityListBuilderChain', { ...input, ...idea, ...loop, ...mechanics, ...win }, entities);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'Entities', status: 'done', output: entities, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!entities || typeof entities !== 'object' || !Array.isArray(entities.entities)) {
        await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics, ...win }, { error: 'Invalid output from EntityListBuilderChain', entities });
        throw new Error('Invalid output from EntityListBuilderChain');
      }
      let playability;
      try {
        playability = await createPlayabilityHeuristicChain(playabilityLLM, { sharedState }).invoke({ gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } });
        console.debug('[DEBUG] PlayabilityHeuristicChain LLM output:', playability);
      } catch (err) {
        console.error('[PlayabilityHeuristicChain] JSON parse error:', err, '\nRaw LLM output:', typeof playability !== 'undefined' ? playability : '[no output]');
        throw err;
      }
      await logCOT('PlayabilityHeuristicChain', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, playability);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'Playability', status: 'done', output: playability, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
      if (!playability || typeof playability !== 'object' || !playability.playabilityAssessment || !playability.strengths || !playability.potentialIssues || !playability.score) {
        await logCOT('Error', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, { error: 'Invalid output from PlayabilityHeuristicChain', playability });
        throw new Error('Invalid output from PlayabilityHeuristicChain');
      }
      // Assemble final game definition
      let final;
      try {
        final = await createFinalAssemblerChain(finalLLM).invoke({
          title: idea.title,
          pitch: idea.pitch,
          loop: loop.loop,
          mechanics: mechanics.mechanics,
          winCondition: win.winCondition,
          entities: entities.entities
        });
        console.debug('[DEBUG] FinalAssemblerChain LLM output:', final);
      } catch (err) {
        console.error('[FinalAssemblerChain] JSON parse error:', err, '\nRaw LLM output:', typeof final !== 'undefined' ? final : '[no output]');
        throw err;
      }
      await logCOT('FinalAssemblerChain', {
        title: idea.title,
        pitch: idea.pitch,
        loop: loop.loop,
        mechanics: mechanics.mechanics,
        winCondition: win.winCondition,
        entities: entities.entities
      }, final);
      if (sharedState && typeof sharedState.onStatusUpdate === 'function') {
        sharedState.onStatusUpdate('PlanningStep', { phase: 'FinalAssembly', status: 'done', output: final, tokenCount: sharedState.tokenCount });
        sharedState.onStatusUpdate('TokenCount', { tokenCount: sharedState.tokenCount });
      }
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
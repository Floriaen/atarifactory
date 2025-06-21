// Minimal integration for TDD - wires up the chain stubs
const { IdeaGeneratorChain } = require('./IdeaGeneratorChain');
const { LoopClarifierChain } = require('./LoopClarifierChain');
const { MechanicExtractorChain } = require('./MechanicExtractorChain');
const { WinConditionBuilderChain } = require('./WinConditionBuilderChain');
const { PlayabilityHeuristicChain } = require('./PlayabilityHeuristicChain');
const { EntityListBuilderChain } = require('./EntityListBuilderChain');
const { FinalAssemblerChain } = require('./FinalAssemblerChain');
const fs = require('fs');
const path = require('path');
const COT_LOG_PATH = path.join(__dirname, '../GameDesignChain.cot.log.txt');

const GameDesignChain = {
  async invoke(input = {}) {
    // Helper to log COT step
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
    const idea = await IdeaGeneratorChain.invoke(input);
    await logCOT('IdeaGeneratorChain', input, idea);
    if (!idea || typeof idea !== 'object' || !idea.title || !idea.pitch) {
      await logCOT('Error', input, { error: 'Invalid output from IdeaGeneratorChain', idea });
      throw new Error('Invalid output from IdeaGeneratorChain');
    }
    const loop = await LoopClarifierChain.invoke({ ...input, ...idea });
    await logCOT('LoopClarifierChain', { ...input, ...idea }, loop);
    if (!loop || typeof loop !== 'object' || !loop.loop) {
      await logCOT('Error', { ...input, ...idea }, { error: 'Invalid output from LoopClarifierChain', loop });
      throw new Error('Invalid output from LoopClarifierChain');
    }
    const mechanics = await MechanicExtractorChain.invoke({ ...input, ...idea, ...loop });
    await logCOT('MechanicExtractorChain', { ...input, ...idea, ...loop }, mechanics);
    if (!mechanics || typeof mechanics !== 'object' || !Array.isArray(mechanics.mechanics)) {
      await logCOT('Error', { ...input, ...idea, ...loop }, { error: 'Invalid output from MechanicExtractorChain', mechanics });
      throw new Error('Invalid output from MechanicExtractorChain');
    }
    const win = await WinConditionBuilderChain.invoke({ ...input, ...idea, ...loop, ...mechanics });
    await logCOT('WinConditionBuilderChain', { ...input, ...idea, ...loop, ...mechanics }, win);
    if (!win || typeof win !== 'object' || !win.winCondition) {
      await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics }, { error: 'Invalid output from WinConditionBuilderChain', win });
      throw new Error('Invalid output from WinConditionBuilderChain');
    }
    const entities = await EntityListBuilderChain.invoke({ ...input, ...idea, ...loop, ...mechanics, ...win });
    await logCOT('EntityListBuilderChain', { ...input, ...idea, ...loop, ...mechanics, ...win }, entities);
    if (!entities || typeof entities !== 'object' || !Array.isArray(entities.entities)) {
      await logCOT('Error', { ...input, ...idea, ...loop, ...mechanics, ...win }, { error: 'Invalid output from EntityListBuilderChain', entities });
      throw new Error('Invalid output from EntityListBuilderChain');
    }
    const playability = await PlayabilityHeuristicChain.invoke({ gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } });
    await logCOT('PlayabilityHeuristicChain', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, playability);
    if (typeof playability !== 'string') {
      await logCOT('Error', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, { error: 'Invalid output from PlayabilityHeuristicChain', playability });
      throw new Error('Invalid output from PlayabilityHeuristicChain');
    }
    const final = await FinalAssemblerChain.invoke({
      title: idea.title,
      pitch: idea.pitch,
      loop: loop.loop,
      mechanics: mechanics.mechanics,
      winCondition: win.winCondition,
      entities: entities.entities
    });
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
  },
};

function createGameDesignChain() {
  return GameDesignChain;
}

module.exports = { GameDesignChain, createGameDesignChain };


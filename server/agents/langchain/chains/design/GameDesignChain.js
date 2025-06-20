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
    const loop = await LoopClarifierChain.invoke({ ...input, ...idea });
    await logCOT('LoopClarifierChain', { ...input, ...idea }, loop);
    const mechanics = await MechanicExtractorChain.invoke({ ...input, ...idea, ...loop });
    await logCOT('MechanicExtractorChain', { ...input, ...idea, ...loop }, mechanics);
    const win = await WinConditionBuilderChain.invoke({ ...input, ...idea, ...loop, ...mechanics });
    await logCOT('WinConditionBuilderChain', { ...input, ...idea, ...loop, ...mechanics }, win);
    const entities = await EntityListBuilderChain.invoke({ ...input, ...idea, ...loop, ...mechanics, ...win });
    await logCOT('EntityListBuilderChain', { ...input, ...idea, ...loop, ...mechanics, ...win }, entities);
    const playability = await PlayabilityHeuristicChain.invoke({ gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } });
    await logCOT('PlayabilityHeuristicChain', { gameDef: { ...idea, ...loop, ...mechanics, ...win, ...entities } }, playability);
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


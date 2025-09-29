import logger from '../../utils/logger.js';
import { createPipelineTracker } from '../../utils/PipelineTracker.js';
import { ChatOpenAI } from '@langchain/openai';
import { createSpriteMaskGenerator } from '../chains/art/SpriteMaskGenerator.js';

export const ART_PHASE = {
  name: 'art',
  label: 'Art',
  description: 'Generating sprites'
};

// Simple, local normalizer for sprite keys used by the pipeline
function normalizeSpriteKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/**
 * Runs the Art pipeline: ensures a sprites.json pack exists for all entities.
 * - Requires: sharedState.gameDef.entities (array of names)
 * - Requires: sharedState.spritePackPath (output file path)
 * - Uses: sharedState.tokenCount for chainFactory token tracking
 */
export async function runArtPipeline(sharedState, onStatusUpdate) {
  const statusUpdate = onStatusUpdate || (() => {});
  const tracker = createPipelineTracker(ART_PHASE.name, ART_PHASE.label, ART_PHASE.description, statusUpdate);

  // Define steps: prepare pack, generate sprites (weighted by entity count)
  const entities = Array.isArray(sharedState?.gameDef?.entities) ? sharedState.gameDef.entities.map(String) : [];
  const totalEntities = entities.length;
  const perEntityWeight = totalEntities > 0 ? 0.8 / totalEntities : 0; // 80% spread across entities
  const steps = [
    { name: 'PreparePack', label: 'Art', description: 'Preparing sprite pack', weight: 0.2 }
  ];
  const isTestOrSkip = process.env.NODE_ENV === 'test' || process.env.MOCK_PIPELINE === '1' || process.env.SKIP_ART === '1';
  if (!isTestOrSkip) {
    for (const name of entities) {
      steps.push({ name: `Sprite:${normalizeSpriteKey(name)}`, label: 'Art', description: `Generating ${name}`, weight: perEntityWeight });
    }
  }
  tracker.addSteps(steps);

  // Step 1: Prepare in-memory pack on sharedState
  let pack;
  await tracker.executeStep(async () => {
    if (!sharedState.spritePack || typeof sharedState.spritePack !== 'object') {
      sharedState.spritePack = { items: {}, generatedAt: null };
    }
    pack = sharedState.spritePack;
    if (!pack.items) pack.items = {};
    return { ok: true };
  }, { name: 'PreparePack', label: 'Art', description: 'Preparing sprite pack' }, { sharedState });

  // Prepare LLM and agent (once)
  let spriteAgent = null;
  if (!isTestOrSkip) {
    const openaiModel = process.env.OPENAI_MODEL;
    if (!openaiModel) {
      throw new Error('OPENAI_MODEL environment variable must be set');
    }
    const llm = new ChatOpenAI({ model: openaiModel, temperature: 0 });
    spriteAgent = await createSpriteMaskGenerator(llm, { sharedState });
  }

  // Step 2..N: Generate per-entity
  const stats = { requested: totalEntities, generated: 0, cached: 0 };
  if (!isTestOrSkip) for (const [i, entity] of entities.entries()) {
    const stepInfo = { name: `Sprite:${entity}`, label: 'Art', description: `Generating ${entity}` };
    await tracker.executeStep(async () => {
      const key = normalizeSpriteKey(entity);
      if (!pack.items[key]) {
        const mask = await spriteAgent.generate(key, { gridSize: 12, traceId: sharedState.traceId });
        pack.items[key] = mask;
        stats.generated++;
      } else {
        stats.cached++;
      }
      return { key };
    }, stepInfo, { sharedState });
  }

  // Assign back to shared state and emit summary; controller is responsible for saving to disk
  sharedState.spritePack = pack;
  logger.info('Sprite pack summary', { ...stats });
  statusUpdate('SpritesSummary', { ...stats });

  return { stats, pack };
}

/**
 * Replay the final pipeline-v3 steps using a saved sharedState (debug_sharedState.json)
 * This allows debugging the last pipeline state instantly, without LLM calls.
 *
 * Usage: node server/debug/replayFinalStep.js
 */
const fs = require('fs');
const path = require('path');

// Load the latest debug_sharedState.json
const sharedStatePath = path.join(__dirname, '../../debug_sharedState.json');
if (!fs.existsSync(sharedStatePath)) {
  console.error('debug_sharedState.json not found. Run a pipeline generation first.');
  process.exit(1);
}

const sharedState = JSON.parse(fs.readFileSync(sharedStatePath, 'utf8'));

// Import agents (LLM-free steps only)
const BlockInserterAgent = require('../agents/BlockInserterAgent');
const StaticCheckerAgent = require('../agents/StaticCheckerAgent');
const SyntaxSanityAgent = require('../agents/SyntaxSanityAgent');
const RuntimePlayabilityAgent = require('../agents/RuntimePlayabilityAgent');

async function main() {
  console.log('=== Pipeline-v3 Debug Replay ===');
  console.log('Loaded sharedState from debug_sharedState.json');
  console.log('Current gameSource length:', sharedState.gameSource && sharedState.gameSource.length);

  // 1. BlockInserterAgent (if used)
  if (BlockInserterAgent) {
    sharedState.gameSource = await BlockInserterAgent(sharedState, { logger: console, traceId: 'debug-replay' });
    console.log('BlockInserterAgent complete.');
  }

  // 2. StaticCheckerAgent
  const errors = await StaticCheckerAgent(sharedState, { logger: console, traceId: 'debug-replay' });
  console.log('StaticCheckerAgent errors:', errors);

  // 3. SyntaxSanityAgent
  const syntaxResult = SyntaxSanityAgent(sharedState, { logger: console, traceId: 'debug-replay' });
  console.log('SyntaxSanityAgent result:', syntaxResult);

  // 4. RuntimePlayabilityAgent
  try {
    await RuntimePlayabilityAgent(sharedState, { logger: console, traceId: 'debug-replay' });
    console.log('RuntimePlayabilityAgent complete.');
  } catch (err) {
    console.error('RuntimePlayabilityAgent error:', err);
  }

  // Save the replayed state for inspection
  fs.writeFileSync(path.join(__dirname, '../../debug_sharedState.replay.json'), JSON.stringify(sharedState, null, 2));
  console.log('Replay complete. Updated state written to debug_sharedState.replay.json');
}

main().catch((err) => {
  console.error('Replay failed:', err);
  process.exit(1);
});

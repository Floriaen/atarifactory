import { createIncrementalCodingChain } from '../../agents/chains/IncrementalCodingChain.js';
import { ChatOpenAI } from '@langchain/openai';

// Only run if explicitly enabled and API key is present
const RUN_OPENAI = process.env.RUN_OPENAI_INTEGRATIONS === '1';
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const maybeTest = RUN_OPENAI && hasOpenAIKey ? test : test.skip;

maybeTest('StepBuilder generates complete game code', async () => {
  const llm = new ChatOpenAI({ 
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.1
  });
  const chain = await createIncrementalCodingChain(llm);

  const minimalPlan = [{ id: 1, description: 'Draw a player and an exit on the canvas' }];
  const minimalStep = { id: 1, description: 'Draw player at starting position and exit at opposite corner' };
  const initialSource = '';

  const input = {
    gameSource: initialSource,
    plan: JSON.stringify(minimalPlan),
    step: JSON.stringify(minimalStep)
  };

  const output = await chain.invoke(input);

  console.log('Generated output:\n', output);

  // Verify basic game structure is present
  expect(output).toContain('canvas');
  expect(output).toContain('ctx');
  expect(output.length).toBeGreaterThan(50); // Should be substantial code, not truncated
  
  // Should NOT manually set canvas dimensions
  const manualCanvasSizing = /canvas\.(width|height)\s*=\s*\d+/;
  if (manualCanvasSizing.test(output)) {
    throw new Error(`Manual canvas sizing found - dimensions should be set automatically by template. Found: ${output.match(manualCanvasSizing)[0]}`);
  }
  
  // Should use canvas.width/height for responsive positioning
  const responsivePattern = /(canvas\.width|canvas\.height)/;
  
  if (!responsivePattern.test(output)) {
    console.warn('No responsive canvas positioning found - this may result in poor layout across different screen sizes');
  }
}, 30000); // 30 second timeout for real LLM calls

const { createContextStepBuilderChain } = require('../../agents/chains/ContextStepBuilderChain.js');
const { ChatOpenAI } = require('@langchain/openai');

test('StepBuilder generates only canvas-relative code', async () => {
  const llm = new ChatOpenAI({ model: process.env.OPENAI_MODEL || 'gpt-4.1', temperature: 0 });
  const chain = await createContextStepBuilderChain(llm);

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

  // Allow only 'canvas.width = 360;' and 'canvas.height = 640;'. Forbid any other use of canvas.width or canvas.height.
  const allowedWidthLine = /^\s*canvas\.width\s*=\s*360\s*;\s*$/;
  const allowedHeightLine = /^\s*canvas\.height\s*=\s*640\s*;\s*$/;
  const forbiddenRelativePattern = /(canvas\.width|canvas\.height)/;

  const lines = output.split('\n');
  for (const line of lines) {
    if (forbiddenRelativePattern.test(line)) {
      if (!allowedWidthLine.test(line) && !allowedHeightLine.test(line)) {
        throw new Error(`Canvas-relative value found (should use only fixed pixels except for size assignment): ${line}`);
      }
    }
  }
});

const { LoopClarifierChain } = require('../../../agents/langchain/chains/design/LoopClarifierChain');

describe('LoopClarifierChain', () => {
  it('generates a gameplay loop description from title/pitch', async () => {
    const input = { title: 'Laser Leap', pitch: 'Dodge lasers and leap between platforms.' };
    // This will fail until the chain is implemented or mocked
    const result = await LoopClarifierChain.invoke(input);
    expect(result).toHaveProperty('loop');
    expect(typeof result.loop).toBe('string');
  });
});

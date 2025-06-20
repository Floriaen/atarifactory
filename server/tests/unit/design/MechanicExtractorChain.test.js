const { MechanicExtractorChain } = require('../../../agents/langchain/chains/design/MechanicExtractorChain');

describe('MechanicExtractorChain', () => {
  it('extracts mechanics from loop description', async () => {
    const input = { title: 'Laser Leap', loop: 'Player jumps between platforms and dodges lasers.' };
    // This will fail until the chain is implemented or mocked
    const result = await MechanicExtractorChain.invoke(input);
    expect(result).toHaveProperty('mechanics');
    expect(Array.isArray(result.mechanics)).toBe(true);
  });
});

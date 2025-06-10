const { createSharedState } = require('../../types/SharedState');

describe('SharedState', () => {
  test('createSharedState returns an object with all required fields', () => {
    const state = createSharedState();
    
    expect(state).toHaveProperty('gameDef', null);
    expect(state).toHaveProperty('plan', []);
    expect(state).toHaveProperty('currentStep', null);
    expect(state).toHaveProperty('currentCode', '');
    expect(state).toHaveProperty('errors', []);
    expect(state).toHaveProperty('runtimeResults', {});
    expect(state).toHaveProperty('metadata');
  });

  test('metadata contains startTime and lastUpdate', () => {
    const state = createSharedState();
    
    expect(state.metadata).toHaveProperty('startTime');
    expect(state.metadata).toHaveProperty('lastUpdate');
    expect(state.metadata.startTime).toBeInstanceOf(Date);
    expect(state.metadata.lastUpdate).toBeInstanceOf(Date);
  });

  test('each call creates a new independent state object', () => {
    const state1 = createSharedState();
    const state2 = createSharedState();
    
    expect(state1).not.toBe(state2);
    expect(state1.plan).not.toBe(state2.plan);
    expect(state1.errors).not.toBe(state2.errors);
    expect(state1.runtimeResults).not.toBe(state2.runtimeResults);
  });
}); 
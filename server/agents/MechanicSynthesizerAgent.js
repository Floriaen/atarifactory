// IMPORTANT: This agent must receive llmClient via dependency injection.
// Never import or instantiate OpenAI/SmartOpenAI directly in this file.
// See 'LLM Client & Dependency Injection Guidelines' in README.md.

function MechanicSynthesizerAgent(gameSpec) {
  const genre = (gameSpec.genre || '').toLowerCase();
  switch (genre) {
    case 'shooter':
      return {
        mechanics: ['move', 'shoot', 'dodge'],
        winCondition: 'destroy all enemies or survive 60 seconds',
      };
    case 'platformer':
      return {
        mechanics: ['move', 'jump', 'collect'],
        winCondition: 'reach the end of the level or collect all coins',
      };
    case 'arcade':
      return {
        mechanics: ['bounce', 'reverse', 'score'],
        winCondition: 'score reaches 100 or survive 2 minutes',
      };
    default:
      return {
        mechanics: ['move', 'score'],
        winCondition: 'get the highest score possible',
      };
  }
}

module.exports = MechanicSynthesizerAgent; 
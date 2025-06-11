# What About the Future?

## LLMs With Web Access or Plugins
Some LLMs (like GPT-4 with browsing, or models with retrieval plugins) can check the latest docs and adapt to new APIs.

In the future, you could prompt the LLM:
> "Check the latest Phaser 3 documentation and generate a game using only supported APIs."

This would make explicit instructions less necessary.

## Self-Validation and Testing
Future LLMs may be able to run/test the code they generate, or check it against live documentation, and fix issues automatically.

## Automatic Prompt Updating
You could automate prompt updates by scraping the latest docs and feeding them to the LLM as context.

# LLM Future Improvements

- **Refactor all LLM prompts out of code:**
  - Move every LLM prompt string from code files into separate `.txt` files in `server/agents/prompts/`.
  - Read and fill these prompt templates at runtime, as done for `PlannerAgent`.
  - This keeps code clean, makes prompt engineering easier, and allows for prompt versioning.

## Future Improvements

- Consider switching the codebase to ESM (add "type": "module" to package.json) for better compatibility with modern JS tools and libraries, and to simplify usage of ESM-only dependencies. 

- Refactor SharedState to use proper class-based approach:
  - Convert `createSharedState()` function to a proper `SharedState` class
  - Add methods for state management and validation
  - Improve type safety and encapsulation
  - Make the state structure more explicit and maintainable 
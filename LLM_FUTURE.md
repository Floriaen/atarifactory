# What About the Future?

## LLMs With Web Access or Plugins
Some LLMs (like GPT-4 with browsing, or models with retrieval plugins) can check the latest docs and adapt to new APIs.

In the future, you could prompt the LLM:
> “Check the latest Phaser 3 documentation and generate a game using only supported APIs.”

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
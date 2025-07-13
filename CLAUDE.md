# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Testing
```bash
# Run all tests (unit, integration, e2e) - must pass 100%
npm test

# Run specific test types
npm run test:unit
npm run test:integration  
npm run test:e2e

# Run single test file
npx vitest run path/to/test.js

# Run with real LLM (requires OPENAI_API_KEY)
OPENAI_API_KEY=your-key npm test

# Run with verbose logging
TEST_LOGS=1 npm test
```

### Development
```bash
# Start server
npm run start:server

# Start frontend
npm run start:frontend

# Linting
npm run lint
npm run lint:fix
```

## Architecture Overview

**AtariFactory** is an AI-powered game generation platform using a sophisticated LangChain-based pipeline to create complete playable browser games.

### Core Pipeline Flow
```
GameInventorChain → GameDesignChain → PlayabilityValidatorChain → 
PlannerChain → ContextStepBuilderChain (×N) → FeedbackChain → StaticCheckerChain
```

### Key Architectural Patterns

**chainFactory Pattern (MANDATORY)**: All chains use standardized creation via `createStandardChain()` from `server/utils/chainFactory.js`.

**Structured Output**: Every chain uses Zod schemas defined in `server/schemas/langchain-schemas.js` for type-safe LLM responses.

**Three-Phase Pipeline**:
1. **Design Phase**: AI chains generate game concepts, mechanics, entities, win conditions
2. **Planning Phase**: Game definition broken into ordered implementation steps  
3. **Coding Phase**: Step-by-step code generation with validation and feedback

**Dependency Injection**: LLM clients and dependencies are injected, not hardcoded. Uses MockLLM for fast testing.

### Critical File Safety Rules

**🔒 NEVER MODIFY without explicit permission:**
- `server/utils/chainFactory.js` - Core chain creation utilities
- `server/schemas/langchain-schemas.js` - Zod validation schemas
- `server/config/langchain.config.js` - LLM configuration and presets
- `package.json` - Dependencies and scripts

**⚠️ MODIFY WITH EXTREME CARE:**
- `server/agents/pipeline/` - Pipeline orchestration files
- `server/tests/helpers/MockLLM.js` - Test infrastructure

**✅ SAFE TO MODIFY (with proper testing):**
- Individual chain files in `server/agents/chains/`
- Test files in `server/tests/`
- Prompt files in `server/agents/prompts/`
- Documentation files

### Chain Development Pattern

**For adding new chains:**
1. Define Zod schema in `langchain-schemas.js`
2. Create prompt file in `server/agents/prompts/`
3. Implement chain using `createStandardChain()` pattern
4. Add comprehensive tests (unit + integration)
5. Follow async/await patterns throughout

**Example chain structure:**
```javascript
import { createStandardChain } from '../../../utils/chainFactory.js';
import { myChainSchema } from '../../../schemas/langchain-schemas.js';

async function createMyChain(llm, options = {}) {
  return await createStandardChain({
    chainName: 'MyChain',
    promptFile: 'my-chain.md',
    inputVariables: ['input'],
    schema: myChainSchema,
    preset: 'structured', // or 'creative', 'planning', 'validation'
    llm,
    sharedState: options.sharedState
  });
}
```

### Testing Requirements

All changes must maintain **100% test pass rate (52 tests)**. Required test types:
- **Happy Path**: Verify expected functionality
- **Input Validation**: Test missing/invalid inputs  
- **Schema Validation**: Test malformed LLM output handling
- **Token Counting**: Verify sharedState integration

Uses **MockLLM** for fast, deterministic testing with structured output support.

### Technology Stack

- **ESM Modules**: Full ES module support with `"type": "module"`
- **LangChain v0.3+**: Modern structured output with `.withStructuredOutput()` and Zod validation
- **Vitest**: Testing framework with MockLLM support
- **Express**: Backend API serving generated games
- **Responsive Canvas**: Games automatically adapt to viewport size (480×773 typical)

### Environment Variables

Required in `server/.env`:
```bash
OPENAI_API_KEY=your-openai-api-key    # Required for LLM functionality
OPENAI_MODEL=gpt-4                    # Optional, defaults to gpt-3.5-turbo
TEST_LOGS=1                           # Optional, enables verbose test logging
```

### Game Generation Details

Generated games are complete HTML/CSS/JS applications stored in `server/games/[uuid]/` with:
- `index.html` - Game container with responsive canvas and control bar
- `game.js` - Generated game logic using canvas API
- `controlBar.js/css` - Mobile-friendly touch controls

Canvas dimensions are automatically set by the game template's resize function. Game code should use `canvas.width` and `canvas.height` for responsive positioning.

### Documentation Structure

Main documentation for AI agents is in `docs/README.md`. Additional resources:
- `docs/examples/adding-new-chain.md` - Complete chain implementation walkthrough
- `docs/current/development/ai-agent-guidelines.md` - Safety rules and patterns
- `docs/current/reference/codebase-map.md` - File navigation guide

### Recovery Procedures

If changes break tests:
1. Run `git status` to see changes
2. Run `npm test` to identify failures
3. Revert problematic changes with `git checkout -- <file>`
4. Make smaller, incremental changes
5. Always verify with `npm test && npm run lint` before finishing
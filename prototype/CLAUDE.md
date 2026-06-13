# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AtariFactory** is an AI-powered game generation platform that creates complete, playable browser games from simple concepts using a sophisticated LangChain-based pipeline with structured output validation and comprehensive testing.

## Essential Commands

### Testing
```bash
npm test                    # Run all tests (unit, integration, e2e)
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run end-to-end tests only
TEST_LOGS=1 npm test       # Run tests with verbose logging
```

### Development
```bash
npm install                # Install dependencies
npm run start:server       # Start backend server (port 3001)
npm run start:frontend     # Start frontend dev server (in separate terminal)
npm run lint               # Check code style
npm run lint:fix           # Auto-fix linting issues
```

### Special Test Modes
```bash
# Run single test file
npm run test:unit -- server/tests/unit/PlannerChain.test.js

# Run with real LLM (requires OPENAI_API_KEY)
OPENAI_API_KEY=your-key npm test
```

## Architecture Overview

### High-Level Pipeline Flow
The system orchestrates a multi-phase pipeline:
1. **Design Phase**: AI chains generate game concepts, mechanics, and validate playability
2. **Planning Phase**: Game definition broken into ordered implementation steps
3. **Art Phase**: Sprite generation using custom DSL compiler
4. **Coding Phase**: Incremental code generation with validation and feedback loops

### Critical Pipeline Components
- **controller.js** (`server/controller.js`): Main orchestrator that coordinates all pipelines
- **pipeline.js** (`server/agents/pipeline/pipeline.js`): Modular pipeline composition with unified progress tracking
- **chainFactory** (`server/utils/chainFactory.js`): Standardized chain creation utilities
- **langchain-schemas** (`server/schemas/langchain-schemas.js`): Zod validation schemas for all chains

### Chain Organization
All chains follow the `XChain` naming convention and are organized by domain:
- `server/agents/chains/design/` - Game design and planning chains (GameDesignChain, PlannerChain, etc.)
- `server/agents/chains/coding/` - Code generation and validation chains (IncrementalCodingChain, StaticCheckerChain, etc.)
- `server/agents/chains/art/` - Sprite generation chains
- `server/agents/prompts/` - Prompt templates organized by domain (design/, coding/, art/)

### Key Technologies
- **ESM Modules**: Full ES module support (`"type": "module"`)
- **LangChain v0.3+**: Structured output with Zod schema validation
- **Vitest**: Testing framework with MockLLM support
- **Express**: Backend server with SSE for streaming responses
- **Winston**: Structured logging with environment-based verbosity

## Critical Development Patterns

### chainFactory Pattern (MANDATORY)
All new chains MUST use the standardized chainFactory pattern:

```javascript
import { createStandardChain } from '../../../utils/chainFactory.js';
import { myChainSchema } from '../../../schemas/langchain-schemas.js';

async function createMyChain(llm, options = {}) {
  return await createStandardChain({
    chainName: 'MyChain',
    promptFile: 'domain/MyChain.prompt.md',
    inputVariables: ['input'],
    schema: myChainSchema,
    preset: 'structured', // or 'creative', 'planning', 'validation'
    llm,
    sharedState: options.sharedState
  });
}
```

### Schema-First Development
Always define Zod schemas in `server/schemas/langchain-schemas.js` for structured output:
```javascript
export const myChainSchema = z.object({
  result: z.string().min(1, 'Result is required'),
  confidence: z.number().min(0).max(1)
});
```

### Shared State Pattern
The `sharedState` object is passed through the entire pipeline for state management:
- `sharedState.tokenCount` - Token usage tracking
- `sharedState.gameDef` - Game definition
- `sharedState.gameSource` - Generated code
- `sharedState.spritePack` - Sprite data
- `sharedState.onStatusUpdate` - Progress callback

### Testing with MockLLM
All chains must be tested with MockLLM for fast, deterministic testing:
```javascript
import { MockLLM } from '../../helpers/MockLLM.js';

const mockLLM = new MockLLM();
mockLLM.mockResponse('ChainName', { /* structured output */ });
```

## File Modification Restrictions

### 🔒 NEVER MODIFY (without explicit user request)
- `server/utils/chainFactory.js` - Core chain creation utilities
- `server/schemas/langchain-schemas.js` - Zod validation schemas
- `server/config/langchain.config.js` - LLM configuration
- `package.json` - Dependencies and scripts
- `vitest.config.js` - Test configuration

### ⚠️ MODIFY WITH EXTREME CARE
- `server/agents/pipeline/` - Pipeline orchestration files
- `server/tests/helpers/MockLLM.js` - Test infrastructure
- `server/controller.js` - Main orchestration logic

### ✅ SAFE TO MODIFY (with proper testing)
- Individual chain files in `server/agents/chains/`
- Test files when adding coverage
- Prompt files in `server/agents/prompts/`
- Documentation files

## Environment Configuration

Create `server/.env` for local development:
```bash
# Required
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini              # Default: gpt-3.5-turbo

# Logging
LOG_LEVEL=info                         # debug|info|warn|error
TEST_LOGS=1                            # Enable verbose test logging

# Testing & Development
MOCK_PIPELINE=1      # Skip ALL LLM calls, test infrastructure only
MINIMAL_GAME=1       # Skip design phase, only run coding pipeline

# Debug & Tracing
ENABLE_DEBUG=1       # Enable /debug endpoints
ENABLE_DEV_TRACE=1   # Capture full LLM prompts/responses
```

## Testing Requirements

Before submitting any changes:
1. **Run tests**: `npm test` - MUST achieve 100% pass rate
2. **Run linting**: `npm run lint` - MUST pass without errors
3. **Add tests**: Create/update tests for all modifications
4. **Verify token counting**: Ensure sharedState.tokenCount is tracked

### Required Tests for Chain Modifications
1. **Happy Path Test**: Verify expected functionality
2. **Input Validation Test**: Test missing/invalid inputs
3. **Schema Validation Test**: Test malformed LLM output handling
4. **Token Counting Test**: Verify sharedState token tracking

## Adding New Chains

See `docs/examples/adding-new-chain.md` for complete walkthrough. Quick steps:
1. Define Zod schema in `server/schemas/langchain-schemas.js`
2. Create prompt template in `server/agents/prompts/domain/ChainName.prompt.md`
3. Implement chain using chainFactory in `server/agents/chains/domain/ChainName.js`
4. Add comprehensive tests in `server/tests/unit/domain/ChainName.test.js`
5. Integrate into pipeline if needed

## Common Tasks

### Finding Chain Implementations
- Design chains: `server/agents/chains/design/`
- Coding chains: `server/agents/chains/coding/`
- Art chains: `server/agents/chains/art/`

### Finding Tests
- Unit tests: `server/tests/unit/`
- Integration tests: `server/tests/integration/`
- E2E tests: `server/tests/e2e/`

### Understanding the Pipeline
1. Start with `server/controller.js` - main orchestration
2. Review `server/agents/pipeline/pipeline.js` - modular composition
3. Check specific pipelines: `planningPipeline.js`, `codingPipeline.js`, `artPipeline.js`

## Logging

Logs are output to:
- Console (colorized)
- `server/logs/pipeline-v2.log` (structured JSON)

Log levels:
- `LOG_LEVEL=debug` - Full debugging (chain execution, token usage)
- `LOG_LEVEL=info` - Essential information (default)
- `LOG_LEVEL=warn` - Warnings only
- `LOG_LEVEL=error` - Errors only

## Debugging

### LLM Logs Viewer (Dev Mode)
```bash
ENABLE_DEBUG=1 ENABLE_DEV_TRACE=1 OPENAI_API_KEY=key npm run start:server
# Open http://localhost:3001/debug/llm/
```

### Common Issues
- **Tests failing**: Check MockLLM mock responses match schema
- **Token counting off**: Ensure sharedState is passed to chain creation
- **Schema validation errors**: Verify Zod schema matches LLM output structure
- **Import errors**: Ensure ESM syntax (`import`/`export`) is used consistently

## Documentation

**Primary AI Agent Documentation**: `docs/README.md`

**Key Resources**:
- `docs/current/architecture/pipeline-v3-design.md` - Pipeline architecture
- `docs/current/development/ai-agent-guidelines.md` - Development patterns
- `docs/examples/adding-new-chain.md` - Complete implementation example
- `README.md` - User-facing documentation

## Project Status

✅ **Production Ready** - 52 tests passing (100% success rate)
- ESM migration complete
- Modern chainFactory patterns implemented
- Structured output with Zod schemas
- Comprehensive test coverage with MockLLM
- AI agent-optimized documentation
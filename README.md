# AtariFactory

![CI](https://github.com/Floriaen/atarifactory/actions/workflows/ci.yml/badge.svg)

**AI-powered game development platform that generates playable mobile Atari-like games**

AtariFactory uses advanced AI chains to automatically generate complete, playable browser games from simple concepts. Built with modern LangChain patterns, structured output validation, and comprehensive testing.

## 🚀 Quick Start

**For AI Agents (Claude, GPT, etc.):** See **[docs/README.md](docs/README.md)** for AI agent-specific development guidelines and navigation.

**For Human Developers:**
```bash
# Install dependencies
npm install

# Run tests (should show 100% pass rate)
npm test

# Set up environment (optional)
echo "LOG_LEVEL=info" > server/.env  # Controls logging verbosity

# Start the server
npm run start:server

# Start the frontend (in another terminal)
npm run start:frontend
```

## 🏗️ Architecture

This project follows modern development principles:

- **ESM Modules**: Full ES module support with `"type": "module"`
- **LangChain v0.3+**: Structured output with Zod schema validation
- **chainFactory Pattern**: Standardized chain creation utilities
- **Dependency Injection**: All LLM clients and dependencies injected, not hardcoded
- **Winston Logging**: Structured logging with environment-based verbosity control
- **Comprehensive Testing**: 100% test pass rate with MockLLM support
- **Clean Architecture**: Business logic decoupled from frameworks

---

## 🎮 Game Generation Pipeline

The system uses a sophisticated AI pipeline to generate complete games:

### High-Level Pipeline Flow

```
GameInventorChain
      ↓
GameDesignChain
      ↓
PlayabilityValidatorChain
      ↓
PlayabilityHeuristicChain
      ↓
PlayabilityAutoFixChain (optional)
      ↓
PlannerChain
      ↓
ContextStepBuilderChain (×N)
      ↓
FeedbackChain
      ↓
StaticCheckerChain
```

### Chain Roles
- **GameInventorChain:** Generates a new game idea (`name`, `description`).
- **GameDesignChain:** Designs mechanics, entities, and win condition for the idea.
- **PlayabilityValidatorChain:** Checks if the game design is playable.
- **PlayabilityHeuristicChain:** Provides a score for the game's playability.
- **PlayabilityAutoFixChain:** Attempts to fix unplayable game designs.
- **PlannerChain:** Breaks down the design into an ordered plan of implementation steps.
- **ContextStepBuilderChain:** Iteratively implements each plan step, always working with the full game source code.
- **FeedbackChain:** Provides suggestions or triggers retries if issues are detected.
- **StaticCheckerChain:** Lints and checks for forbidden patterns or errors.

> **Naming Update:** All new chains follow the `XChain` naming convention (e.g., `GameDesignChain`, not `GameDesignAgent`).

**Langchain** is a core dependency for pipeline composition, prompt templating, and LLM orchestration.

**For detailed architecture:** See [docs/current/architecture/pipeline-v3-design.md](docs/current/architecture/pipeline-v3-design.md)

## 🔧 Development

### Environment Configuration

Create `server/.env` with your configuration:

```bash
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional  
OPENAI_MODEL=gpt-4                    # Defaults to gpt-3.5-turbo
LOG_LEVEL=info                        # debug|info|warn|error (default: info)
TEST_LOGS=1                           # Enable verbose test logging
```

### Logging Levels

- `LOG_LEVEL=debug` - Full debugging (chain execution, token usage, LLM operations)
- `LOG_LEVEL=info` - Essential information (default - pipeline progress, errors)
- `LOG_LEVEL=warn` - Warnings only
- `LOG_LEVEL=error` - Errors only

Logs are output to console (colorized) and `server/logs/pipeline-v2.log` (structured JSON).

### Development Commands

**For AI Agents:** See [docs/README.md](docs/README.md) for AI agent-specific guidelines and safety rules.

**For Extending the Pipeline:**
- See [docs/examples/adding-new-chain.md](docs/examples/adding-new-chain.md) for complete implementation walkthrough
- Follow [docs/current/development/ai-agent-guidelines.md](docs/current/development/ai-agent-guidelines.md) for patterns and safety
- All chains use chainFactory pattern with Zod schema validation
- Comprehensive testing required (unit + integration)

**Key Development Principles:**
- Use `createStandardChain()` from chainFactory for all new chains
- Define Zod schemas in `server/schemas/langchain-schemas.js`
- Follow async/await patterns throughout
- Maintain 100% test pass rate

## Linting

To check code style and errors, run:

    npx eslint 'server/**/*.js'

To auto-fix issues:

    npx eslint 'server/**/*.js' --fix 

## 🧪 Testing

**Test Status:** ✅ **All tests passing** (52 tests, 100% success rate)

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration 
npm run test:e2e

# Run with verbose logging
TEST_LOGS=1 npm test

# Run with real LLM (requires OPENAI_API_KEY)
OPENAI_API_KEY=your-key npm test
```

**Testing Features:**
- **MockLLM**: Fast, deterministic testing with structured output support
- **Comprehensive Coverage**: Unit, integration, and e2e tests
- **Real LLM Testing**: Optional integration with actual OpenAI API
- **Token Counting Tests**: Verify cost tracking functionality

## Running the Server

- Navigate to the `server` directory:

  ```bash
  cd server
  ```

- Start the server:

  ```bash
  node index.js
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run start:server
  ```

## Running Tests

- Tests are located in the `server/tests` directory. Design/planning chain tests are in `server/tests/unit/design/`.

- To run tests, navigate to the `server` directory and run:

  ```bash
  npm test
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run test:server
  ```

- The Vitest configuration is located in the root directory and loads environment variables from `server/.env`.

- End-to-end tests (`e2e`) are currently excluded from the default test runs.

> **All tests currently pass. The codebase is ready for production testing.**

## Running the Frontend

- Navigate to the `frontend` directory:

  ```bash
  cd frontend
  ```

- Install dependencies if not already done:

  ```bash
  npm install
  ```

- Start the frontend development server:

  ```bash
  npm run dev
  ```

- Alternatively, from the root directory, you can run:

  ```bash
  npm run start:frontend
  ```

## Environment Variables

- Environment variables for the server are stored in `server/.env`.

- Ensure to set `OPENAI_API_KEY` in `server/.env` for tests and server functionality that require it.


## ⚙️ Configuration

**Environment Variables:**
```bash
# Required for LLM functionality
OPENAI_API_KEY=your-openai-api-key

# Optional testing
TEST_LOGS=1          # Enable verbose test logging
OPENAI_MODEL=gpt-4   # Specify model for real LLM tests
```

**Key Features:**
- **Token Counting**: Built-in cost tracking for all LLM calls
- **Structured Output**: Automatic Zod schema validation
- **Comprehensive Logging**: Detailed execution tracking
- **Environment Flexibility**: Easy switching between mock and real LLMs

## 📚 Documentation

**Main Documentation:** [docs/README.md](docs/README.md) - AI agent entry point

**Key Documentation:**
- [docs/current/architecture/](docs/current/architecture/) - System design and specifications
- [docs/current/development/](docs/current/development/) - Development guidelines and patterns
- [docs/examples/](docs/examples/) - Complete implementation examples
- [docs/current/reference/](docs/current/reference/) - API references and code navigation

**Quick Links:**
- [AI Agent Guidelines](docs/current/development/ai-agent-guidelines.md)
- [Adding New Chain Example](docs/examples/adding-new-chain.md)
- [Codebase Map](docs/current/reference/codebase-map.md)
- [Architecture Overview](docs/current/architecture/pipeline-v3-design.md) 

## 🚀 Project Status

**Current State:** ✅ **Production Ready**
- **Architecture:** Modern LangChain-based pipeline with structured output  
- **Testing:** 52 tests passing (100% success rate)
- **Code Quality:** ESLint compliant, comprehensive error handling
- **Documentation:** Complete AI agent-focused documentation
- **Dependencies:** Up-to-date with latest LangChain v0.3+ and Zod validation

**Recent Improvements:**
- ✅ Complete ESM migration
- ✅ Modern chainFactory patterns implemented
- ✅ Structured output with Zod schemas
- ✅ Comprehensive test coverage with MockLLM
- ✅ AI agent-optimized documentation

---

*AtariFactory is actively maintained and ready for AI-powered game generation.*
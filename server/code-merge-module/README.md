# Architecture Principles

This project follows CLEAN architecture principles:

- Business logic (agents, pipeline) is decoupled from frameworks and infrastructure.
- All dependencies (LLM clients, loggers, etc.) are injected, not hardcoded.
- Controllers/orchestrators handle I/O and dependency wiring.
- Tests use mocks and dependency injection for fast, reliable feedback.
- Code is organized for modularity, testability, and future-proofing.
- **Single Responsibility:** Each module/agent does one thing and does it well.

All contributors and tools must follow these guidelines.

# Code Merging Module: Development Plan

## Goal
Create a robust, testable, and reusable JavaScript module for merging LLM-generated code into existing codebases. The module will leverage [aiCoder](https://github.com/mmiscool/aiCoder) as the core AST-based merging engine for precise, reliable integration of new code. The module should be easy to unit test (programmatically) and inspect (visually).

## Use of aiCoder
- **aiCoder** is an open-source tool that uses ASTs to perform surgical, non-destructive merges of new code into existing JavaScript files.
- We will use aiCoder as the backend for our merging logic, wrapping its API in our module for programmatic and pipeline use.
- This allows us to:
  - Avoid reinventing complex AST merge logic
  - Benefit from a battle-tested, community-maintained tool
  - Focus on integration, testing, and extension (e.g., LLM-assisted fallback)
- See: [aiCoder GitHub](https://github.com/mmiscool/aiCoder)

## File-Based aiCoder Integration (CLI Workflow)
- Since aiCoder does not currently expose a robust Node.js API, we will use its CLI for merging:
  1. Write `currentCode` and `stepCode` to temporary files.
  2. Invoke the aiCoder CLI to merge the files (e.g., `aicoder merge file1.js file2.js -o merged.js`).
  3. Read the merged result from the output file.
  4. Clean up temporary files.
- This approach ensures we get aiCoder's advanced merging (including function/class merging) even without a direct API.
- **Benefits:**
  - Full power of aiCoder's AST merging
  - No need to maintain complex merge logic
- **Caveats:**
  - Slightly slower due to file I/O and process spawning
  - Requires aiCoder CLI to be installed and available in the environment

## Requirements
- Accepts: `currentCode` (string), `stepCode` (string)
- Outputs: `mergedCode` (string)
- Uses aiCoder for AST-based merging (functions, variables, classes) via CLI
- Optionally: LLM-assisted merging for complex/ambiguous cases
- Handles duplicate declarations, context, and order
- Exposes a clean API for use in the pipeline
- Fully unit-testable (input/output)
- Easy to run visual/manual tests (e.g., via a demo script or web UI)

## Development Phases
1. **Scaffold the module directory and entry point**
2. **Integrate aiCoder as the core merging engine (via CLI, file-based)**
3. **Wrap aiCoder CLI with a clean API for our pipeline**
4. **Add test suite (Jest or similar) with sample merge cases**
5. **Add visual/manual test harness (simple CLI or web page)**
6. **(Optional) Integrate LLM-assisted merging for fallback/complex merges**
7. **Document API and usage**
8. **Integrate into main pipeline once stable**

## Test Strategy
- Unit tests for all merge scenarios:
  - Function extension/merge
  - Variable deduplication
  - Class extension
  - Top-level statement insertion
  - Edge cases (conflicts, order, comments)
- Visual/manual test harness for before/after inspection
- Fuzz tests with random code snippets (optional)
- Tests will focus on both aiCoder's behavior and our integration/wrapping logic

## Integration Steps
- Import the module in the pipeline controller
- Replace existing BlockInserterAgent logic with the new module
- Ensure all pipeline tests pass
- Document migration and usage

---

*This plan will be updated as development progresses. See [aiCoder on GitHub](https://github.com/mmiscool/aiCoder) for more details on the merging engine.* 
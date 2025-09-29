# Codebase Navigation Map for AI Agents

## Overview

This document provides a comprehensive map of the atarifactory codebase, helping AI agents quickly locate relevant files for specific tasks.

## 🗺️ High-Level Directory Structure

```
server/
├── agents/                    # AI chain implementations
│   ├── chains/               # Individual chain logic
│   ├── pipeline/             # Pipeline orchestration
│   └── prompts/              # LLM prompt templates
├── config/                   # Configuration files
├── schemas/                  # Zod validation schemas
├── tests/                    # Test suites
├── types/                    # Type definitions
└── utils/                    # Utility functions
```

## 🔧 Core Infrastructure Files

### **🔒 CRITICAL - Never Modify Without Permission**

| File | Purpose | When to Touch |
|------|---------|---------------|
| `server/utils/chainFactory.js` | Core chain creation utilities | Only for chainFactory improvements |
| `server/schemas/langchain-schemas.js` | Zod validation schemas | Only when adding new chain schemas |
| `server/config/langchain.config.js` | LLM configuration and presets | Only for LLM config changes |
| `package.json` | Project dependencies and scripts | Only for dependency updates |

### **⚠️ Infrastructure - Modify with Extreme Care**

| File | Purpose | Modification Guidelines |
|------|---------|------------------------|
| `server/agents/pipeline/pipeline.js` | Main pipeline orchestration | Only for pipeline flow changes |
| `server/agents/pipeline/planningPipeline.js` | Planning phase coordination | Only for planning pipeline changes |
| `server/agents/pipeline/codingPipeline.js` | Coding phase coordination | Only for coding pipeline changes |
| `server/tests/helpers/MockLLM.js` | Test LLM implementation | Only for test infrastructure improvements |
| `server/types/SharedState.js` | Shared state type definition | Only for state structure changes |

## 🎯 Task-Based File Location Guide

### **Need to Add a New Chain?**

**Files to Create/Modify:**
1. **Schema**: `server/schemas/langchain-schemas.js` - Add Zod schema
2. **Chain**: `server/agents/chains/[category]/YourChain.js` - Implement chain
3. **Prompt**: `server/agents/prompts/[category]/your-chain.md` - Create prompt
4. **Tests**: `server/tests/unit/[category]/YourChain.test.js` - Add tests

**Reference Examples:**
- `server/agents/chains/design/IdeaGeneratorChain.js` - Creative chain example
- `server/agents/chains/design/PlannerChain.js` - Structured array output
- (removed) GameInventorChain — consolidated into IdeaGeneratorChain

### **Need to Modify Existing Chain Behavior?**

**Chain Categories & Locations:**

#### **Design Chains** (`server/agents/chains/design/`)
- `IdeaGeneratorChain.js` - Generates creative game ideas
- `LoopClarifierChain.js` - Clarifies game loop mechanics
- `MechanicExtractorChain.js` - Extracts mechanics from descriptions
- `WinConditionBuilderChain.js` - Creates win conditions
- `EntityListBuilderChain.js` - Builds entity lists
- `PlayabilityHeuristicChain.js` - Evaluates game playability
- `FinalAssemblerChain.js` - Assembles final game definition

#### **Main Chains** (`server/agents/chains/`)
- Idea generation handled by `design/IdeaGeneratorChain.js`
- `PlannerChain.js` - Breaks design into implementation steps
- `coding/IncrementalCodingChain.js` - Implements individual plan steps
- `coding/FeedbackChain.js` - Provides improvement feedback
- `PlayabilityValidatorChain.js` - Validates game playability
- `coding/ControlBarTransformerAgent.js` - Transforms input to control bar
- `coding/StaticCheckerChain.js` - Lints and validates code
- `coding/SyntaxSanityChain.js` - Ensures syntax sanity (stub)
- `coding/RuntimePlayabilityChain.js` - Stubbed runtime validation
- `art/SpriteMaskGenerator.js` - Sprite design agent (LLM→DSL→mask)

#### **Pipeline Integration** (`server/agents/chains/design/`)
- `GameDesignChain.js` - **SPECIAL**: Orchestrates all design chains

### **Need to Debug Issues?**

**Log Files & Debug Info:**
- `server/logs/` - Runtime logs (if they exist)
- Test output with `npm test -- --reporter=verbose`
- Error stack traces point to specific files

**Common Debugging Locations:**
- Chain implementation files - for logic issues
- Schema files - for validation errors
- Test files - for test failures
- MockLLM - for test infrastructure issues

### **Need to Add/Modify Tests?**

**Test Structure:**
```
server/tests/
├── unit/                     # Unit tests for individual components
│   ├── coding/              # Coding chain tests
│   ├── design/              # Design chain tests
│   └── [other-categories]/  # Other component tests
├── integration/             # Integration tests
└── helpers/                 # Test utilities
    ├── MockLLM.js          # Mock LLM for testing
    └── MalformedLLM.js     # Malformed response testing
```

**Test Naming Pattern:**
- Unit tests: `[ComponentName].test.js`
- Integration tests: `[ComponentName].integration.test.js`
- OpenAI tests: `[ComponentName].openai.test.js`

## 📁 Directory Deep Dive

### **`server/agents/chains/`**
| File | Purpose | Input | Output | Modification Safety |
|------|---------|-------|--------|-------------------|
| `design/IdeaGeneratorChain.js` | Creative ideas | Constraints | `{title, pitch}` | ✅ Safe |
| `PlannerChain.js` | Implementation planning | Game definition | Array of plan steps | ✅ Safe |
| `IncrementalCodingChain.js` | Code generation | Plan step + context | Updated game code | ⚠️ Careful |
| `coding/FeedbackChain.js` | Improvement suggestions | Error/failure info | Feedback object | ✅ Safe |
| `PlayabilityValidatorChain.js` | Playability validation | Game definition | Validation result | ✅ Safe |
| `coding/ControlBarTransformerAgent.js` | Input transformation | Game source code | Transformed code | ✅ Safe |

### **`server/agents/chains/design/`**
| File | Purpose | Input | Output | Modification Safety |
|------|---------|-------|--------|-------------------|
| `GameDesignChain.js` | **Orchestrator** | Game idea | Complete design | ⚠️ Careful - affects all design |
| `IdeaGeneratorChain.js` | Creative ideas | Constraints | `{title, pitch}` | ✅ Safe |
| `LoopClarifierChain.js` | Game loop logic | Title + pitch | Loop description | ✅ Safe |
| `MechanicExtractorChain.js` | Mechanics extraction | Loop description | Mechanics array | ✅ Safe |
| `WinConditionBuilderChain.js` | Win conditions | Mechanics | Win condition | ✅ Safe |
| `EntityListBuilderChain.js` | Entity identification | Mechanics + context | Entities array | ✅ Safe |
| `PlayabilityHeuristicChain.js` | Playability scoring | Game definition | Playability score | ✅ Safe |
| `FinalAssemblerChain.js` | Design assembly | All design parts | Final game definition | ✅ Safe |

### **`server/agents/prompts/`**
Prompt templates organized by chain category:
- `design/` - Design chain prompts
- `design/IdeaGeneratorChain.prompt.md` - Idea generator prompt
- `PlannerChain.prompt.md` - Planning prompt
- etc.

**Prompt Modification**: ✅ Generally safe, but test thoroughly

### **`server/agents/pipeline/`**
| File | Purpose | Modification Safety |
|------|---------|-------------------|
| `planningPipeline.js` | Runs design/planning chains | ⚠️ Careful |
| `artPipeline.js` | Ensures sprite pack via SpriteMaskGenerator | ✅ Safe (isolated) |
| `codingPipeline.js` | Runs codegen and transforms | ⚠️ Careful |

### **`server/config/`**
| File | Purpose | Modification Safety |
|------|---------|-------------------|
| `langchain.config.js` | LLM settings and presets | 🔒 Critical |
| `pipeline.config.js` | Pipeline configuration | ⚠️ Careful |

### **`server/schemas/`**
| File | Purpose | Modification Safety |
|------|---------|-------------------|
| `langchain-schemas.js` | All Zod validation schemas | 🔒 Critical |

## 🔍 "If You Need To..." Quick Reference

### **Add Creative Functionality**
→ Look at `IdeaGeneratorChain.js`

### **Modify Game Logic Generation**
→ Look at `IncrementalCodingChain.js` and related tests

### **Modify Sprite Generation**
→ Look at `agents/chains/art/SpriteMaskGenerator.js` and `agents/pipeline/artPipeline.js`

### **Change Validation Logic**
→ Look at `PlayabilityValidatorChain.js` and `PlayabilityHeuristicChain.js`

### **Modify Planning Logic**
→ Look at `PlannerChain.js` and `GameDesignChain.js`

### **Add New Input/Output Schema**
→ Modify `server/schemas/langchain-schemas.js`

### **Change Pipeline Flow**
→ Look at `server/agents/pipeline/` files (⚠️ High risk)

### **Add New LLM Configuration**
→ Look at `server/config/langchain.config.js` (🔒 Critical)

### **Debug Test Failures**
→ Look at `server/tests/unit/` and `server/tests/integration/`

### **Modify Prompt Templates**
→ Look at `server/agents/prompts/` (✅ Generally safe)

## 🚨 Red Flags - When to Stop and Ask

**Stop and ask for guidance if you need to:**
- Modify files marked with 🔒 (Critical)
- Change pipeline orchestration logic
- Add new dependencies to package.json
- Modify test infrastructure (MockLLM, test helpers)
- Change core chainFactory patterns
- Modify SharedState structure

**These changes affect system-wide functionality and require careful coordination.**

---

## 📋 File Modification Checklist

Before modifying any file:
- [ ] Check its safety level in this guide
- [ ] Understand its purpose and dependencies
- [ ] Read existing code and tests
- [ ] Plan minimal changes
- [ ] Know how to test your changes
- [ ] Understand rollback procedures

**Remember**: When in doubt, make smaller changes and ask for guidance!

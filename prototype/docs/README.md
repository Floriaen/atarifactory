# AtariFactory Documentation - AI Agent Developer Guide

> **Primary Audience**: AI Agents (like Claude, GPT, etc.) working on the atarifactory codebase

## 🤖 Quick Start for AI Agents

**Before making ANY changes to the codebase:**
1. ✅ Read this README completely
2. ✅ Check `current/development/ai-agent-guidelines.md` (when available)
3. ✅ Run `npm test` to ensure 100% pass rate
4. ✅ Understand which files are safe to modify

## 📋 Documentation Structure

### **Current Documentation** (Active & Maintained)
```
current/
├── architecture/          # System design and specifications
├── development/           # AI agent development guidelines  
├── reference/            # API references and code maps
├── planning/             # Future roadmap and features
└── guides/               # Strategy and best practices
```

### **Examples** (Practical Walkthroughs)
```
examples/                 # Step-by-step modification examples
├── adding-new-chain.md   # How to add a new chain
├── modifying-chain.md    # How to modify existing chains
└── debugging-issues.md   # Common problems and solutions
```

### **Archives** (Historical Reference)
```
archive/
├── deprecated/           # Outdated documentation
├── completed-plans/      # Finished implementation plans
├── migrations/           # Historical migration records
└── research/             # Experimental findings and POCs
```

## 🏗️ System Overview

**AtariFactory** is an AI-powered game generation platform that creates playable browser games using a Langchain-based pipeline.

### **Core Architecture:**
1. **Design Phase**: AI chains generate game concepts and mechanics
2. **Planning Phase**: Game definition broken into implementation steps
3. **Coding Phase**: Step-by-step code generation with validation

### **Key Technologies:**
- **LangChain v0.3+** with structured output and Zod validation
- **ESM Modules** throughout the codebase
- **chainFactory Pattern** for standardized chain creation
- **Vitest** for testing with MockLLM support

## 🚨 Critical Files - MODIFICATION RESTRICTIONS

### **🔒 NEVER MODIFY without explicit user request:**
- `server/utils/chainFactory.js` - Core chain creation utilities
- `server/schemas/langchain-schemas.js` - Zod validation schemas
- `server/config/langchain.config.js` - LLM configuration
- `package.json` - Project dependencies and scripts

### **⚠️ MODIFY WITH EXTREME CARE:**
- `server/agents/pipeline/` - Pipeline orchestration
- `server/tests/helpers/MockLLM.js` - Test infrastructure
- Any file in `server/agents/chains/` - Chain implementations

### **✅ SAFE TO MODIFY (with proper testing):**
- Individual chain files when improving specific functionality
- Test files when adding test coverage
- Documentation files
- Prompt files in `server/agents/prompts/`

## 🔧 Common Tasks & Where to Look

### **Need to add a new chain?**
→ See `examples/adding-new-chain.md` (when available)
→ Reference `current/development/guidelines/chain-template.md`

### **Need to modify existing chain behavior?**
→ See `examples/modifying-chain.md` (when available)
→ Check `current/reference/codebase-map.md` for file locations

### **Need to understand the system architecture?**
→ Start with `current/architecture/pipeline-v3-design.md`
→ Review `current/architecture/design-chain-specs.md`

### **Need to debug an issue?**
→ Check `examples/debugging-issues.md` (when available)
→ Follow `current/development/guidelines/debugging-protocol.md`

### **Need to add tests?**
→ Reference `current/development/testing-patterns.md` (when available)
→ Use MockLLM patterns from existing tests

## ✅ Required Verification Steps

**Before submitting any changes:**
1. **Run tests**: `npm test` - must achieve 100% pass rate
2. **Run linting**: `npm run lint` - must pass without errors
3. **Test your changes**: Create/update tests for modifications
4. **Check dependencies**: Ensure no new dependencies without approval

## 📚 Essential Reading Order

**For new AI agents:**
1. This README (you're here!)
2. `current/architecture/pipeline-v3-design.md` - System overview
3. `current/development/guidelines/` - Development standards
4. `current/reference/codebase-map.md` - File navigation (when available)

**For specific tasks:**
1. Check `examples/` for relevant walkthroughs
2. Reference `current/development/` for patterns and guidelines
3. Consult `current/architecture/` for system understanding

## 🚀 Project Status

**Current State**: ✅ Stable, modern architecture with comprehensive testing
- **ESM Migration**: ✅ Complete
- **LangChain v0.3+**: ✅ Fully implemented with structured output
- **chainFactory Pattern**: ✅ All chains modernized
- **Test Coverage**: ✅ 100% pass rate with MockLLM support

**Architecture**: Modern Langchain-based pipeline with Zod validation and chainFactory patterns.

---

## 📋 Documentation Status

This documentation is currently being reorganized for optimal AI agent developer experience. Some referenced files may not exist yet but are planned for creation.

**Last Updated**: 2025-01-13
**Target Audience**: AI Agents working on atarifactory codebase
**Maintained By**: AI Agent collaboration with project maintainers
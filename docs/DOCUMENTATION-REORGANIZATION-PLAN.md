# Documentation Reorganization Plan

## Overview

This document outlines the comprehensive plan to reorganize the atarifactory documentation for optimal AI agent developer experience. The current documentation structure has evolved organically and contains a mix of current, deprecated, and historical content that needs systematic organization.

## Current State Analysis

### Issues Identified:
1. **Scattered Structure**: Active documentation mixed with deprecated content
2. **No Clear Entry Point**: Missing main navigation for AI agents
3. **Inconsistent Naming**: Files use different naming conventions
4. **Content Overlap**: Multiple documents covering similar topics
5. **Missing AI Agent Focus**: Documentation not optimized for AI developers

### Current File Inventory (31 files):

**Main Directory (11 files):**
- ✅ `LLM_FUTURE.md` - Active roadmap
- ✅ `design-planning-improvement - SPECS.md` - Active architecture
- ❌ `game-generation-specifications.md` - DEPRECATED
- ✅ `game-playability-strategies.md` - Active guidance
- ❌ `pipeline-events-migration.md` - Completed plan
- ✅ `pipeline-events.md` - Active specification
- ❌ `pipeline-progress-bar-plan.md` - Implementation plan
- ✅ `pipeline-progress-bar.md` - Active specification
- ✅ `pipeline-v3-design.md` - CORE ARCHITECTURE
- ✅ `structured-output-parsing.md` - Active reference
- ❌ `testing-strategy.md` - DEPRECATED

**Subdirectories:**
- `archives/` (12 files) - Historical content
- `coding-agent-guidelines/` (2 files) - Active guidelines
- `plan/` (1 file) - Future planning
- `poc/` (1 file) - Research
- `refactoring/` (4 files) - Mixed status

## Proposed New Structure

```
docs/
├── README.md                           # 🤖 MAIN ENTRY POINT FOR AI AGENTS
├── current/                            # Active documentation only
│   ├── architecture/
│   │   ├── pipeline-v3-design.md     # Core system architecture
│   │   ├── design-chain-specs.md     # Chain specifications (renamed)
│   │   ├── pipeline-events.md        # Event system reference
│   │   └── pipeline-progress.md      # Progress system (consolidated)
│   ├── development/
│   │   ├── guidelines/                # AI agent development guidelines
│   │   │   ├── chain-template.md
│   │   │   └── debugging-protocol.md
│   │   ├── ai-agent-guidelines.md    # NEW: How AI agents should work
│   │   ├── structured-output-parsing.md
│   │   └── code-patterns.md          # NEW: Established patterns
│   ├── reference/
│   │   ├── codebase-map.md           # NEW: File-by-file guide
│   │   ├── chain-api.md              # NEW: Complete API reference
│   │   └── configuration.md          # NEW: All config options
│   ├── planning/
│   │   ├── roadmap.md                # LLM_FUTURE.md renamed/updated
│   │   └── future-features.md        # plan/ content
│   └── guides/
│       ├── playability-strategies.md # Game design guidance
│       └── troubleshooting.md        # NEW: Common issues
├── archive/                           # Historical preservation
│   ├── deprecated/                    # Clearly outdated content
│   │   ├── game-generation-specifications.md
│   │   ├── testing-strategy.md
│   │   └── pipeline-events-migration.md
│   ├── completed-plans/               # Finished implementation plans
│   │   ├── pipeline-progress-bar-plan.md
│   │   └── refactoring/ (selected files)
│   ├── migrations/                    # Migration history
│   │   └── archives/ (current content)
│   └── research/                      # POC and experimental content
│       └── poc/ (current content)
└── examples/                          # NEW: Practical examples
    ├── adding-new-chain.md           # Complete walkthrough
    ├── modifying-existing-chain.md   # Common modification
    └── debugging-issues.md           # Problem-solving examples
```

## Implementation Phases

### Phase 1: Foundation Setup (30 minutes)
**Actions:**
1. Create new directory structure
2. Create placeholder README.md with navigation
3. Set up archive directories

**Commands:**
```bash
mkdir -p docs/current/{architecture,development/guidelines,reference,planning,guides}
mkdir -p docs/archive/{deprecated,completed-plans,migrations,research}
mkdir -p docs/examples
```

### Phase 2: Archive Management (30 minutes)
**Actions:**
1. Move deprecated files to `archive/deprecated/`
2. Move completed plans to `archive/completed-plans/`
3. Move current `archives/` to `archive/migrations/`
4. Move `poc/` to `archive/research/`

**Deprecated Files to Archive:**
- `game-generation-specifications.md` → `archive/deprecated/`
- `testing-strategy.md` → `archive/deprecated/`
- `pipeline-events-migration.md` → `archive/deprecated/`
- `pipeline-progress-bar-plan.md` → `archive/completed-plans/`

### Phase 3: Active Content Organization (45 minutes)
**Actions:**
1. Move active files to appropriate `current/` subdirectories
2. Rename files for consistency
3. Consolidate overlapping content
4. Update internal references

**File Moves:**
- `pipeline-v3-design.md` → `current/architecture/`
- `design-planning-improvement - SPECS.md` → `current/architecture/design-chain-specs.md`
- `structured-output-parsing.md` → `current/development/`
- `coding-agent-guidelines/` → `current/development/guidelines/`
- `pipeline-events.md` → `current/architecture/`
- `pipeline-progress-bar.md` → `current/architecture/pipeline-progress.md`
- `game-playability-strategies.md` → `current/guides/playability-strategies.md`
- `LLM_FUTURE.md` → `current/planning/roadmap.md`
- `plan/control-bar-enforcer-agent.md` → `current/planning/future-features.md`

### Phase 4: New AI Agent Documentation (60 minutes)
**Create new files:**
1. `README.md` - Main AI agent entry point
2. `current/development/ai-agent-guidelines.md` - How AI agents should work
3. `current/reference/codebase-map.md` - File navigation guide
4. `examples/adding-new-chain.md` - Complete example walkthrough

## Success Criteria

### Immediate (Post-reorganization):
- [ ] Clear separation between current and historical documentation
- [ ] All active files in logical, discoverable locations
- [ ] No broken internal links
- [ ] Consistent file naming conventions

### Short-term (Next week):
- [ ] AI agents can find relevant documentation in <2 minutes
- [ ] Main README provides clear navigation to all content
- [ ] All current patterns documented with examples
- [ ] Safe modification procedures established

### Long-term (Next month):
- [ ] AI agents can successfully modify codebase using documentation alone
- [ ] Zero questions about basic patterns or file locations
- [ ] Documentation is self-maintaining through clear update procedures

## Risk Mitigation

### Preservation Strategy:
- **Nothing will be deleted** - all content moved to archive
- **Git history preserved** - all moves tracked in version control
- **Reference updates** - internal links updated to prevent breakage

### Rollback Plan:
- All moves tracked in git commits
- Archive structure allows easy restoration
- Internal link updates can be reverted if needed

## Timeline

**Total Estimated Time: 2.5-3 hours**

**Week 1:**
- Day 1: Phase 1 & 2 (Foundation + Archive) - 1 hour
- Day 2: Phase 3 (Content Organization) - 45 minutes  
- Day 3: Phase 4 (New Documentation) - 1 hour

**Approval Required:**
- [ ] Approve overall reorganization approach
- [ ] Confirm files safe to archive
- [ ] Validate new directory structure
- [ ] Approve timeline and implementation phases

## Next Steps

1. **Review and approve this plan**
2. **Execute Phase 1: Foundation Setup**
3. **Execute Phase 2: Archive Management**
4. **Execute Phase 3: Content Organization**
5. **Execute Phase 4: New AI Agent Documentation**
6. **Test navigation and update any broken references**

---

*This plan prioritizes AI agent developer experience while preserving all historical context and ensuring no information is lost during reorganization.*
# pipeline-v2

This directory contains the next-generation, agent-based, LLM-driven game generation pipeline. It is developed incrementally according to the specifications in `docs/game-generation-specifications.md` and the iterative development plan in `docs/pipeline-iterative-development-plan.md`.

- All agents are modular and stateless.
- Utilities and tests are colocated for clarity and maintainability.
- This pipeline is developed in isolation from legacy code for clean, incremental progress.

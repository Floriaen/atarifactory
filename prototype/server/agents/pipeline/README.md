# Pipeline Directory

This directory contains orchestrator modules that compose multiple LangChain chains into higher-level pipelines.

- Place pipeline composition logic here (e.g., planningPipeline.js, developmentPipeline.js, etc.)
- Keep atomic chain logic in the sibling `chains/` directory.
- Prompts should be managed in a dedicated `prompts/` directory or colocated with chains.

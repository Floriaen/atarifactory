# Progress Utilities

This directory contains all pipeline progress-related utilities and managers.

- `weightedProgress.js`: Pure functions for progress calculations (e.g., weighted progress, clamped local progress).
- `ProgressionManager.mjs`: Orchestrates unified pipeline progress and event emission using weightedProgress utilities.

## Usage

Import pure utilities for stateless progress math, and use ProgressionManager for orchestrating complex progress flows in pipelines.

## Rationale

Progress utilities are grouped here for discoverability, maintainability, and to avoid cluttering the root `utils/` directory with unrelated helpers.

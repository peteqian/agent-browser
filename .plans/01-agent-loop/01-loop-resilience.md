# Loop Resilience

Status: ACTIVE. Terminal result shaping is done; next scoped resilience item is per-action timeout.

## Goal

Make the decision loop recover from common autonomous browsing failures without hiding errors.

## Features

- [x] Preserve explicit terminal `done.data` instead of forcing generic runs into `{ jobs: [] }`.
- Per-step timeout around context preparation, LLM decision, and action execution.
- Per-action timeout so a silent CDP call cannot hang the whole agent.
- Consecutive failure tracking with a clear final error state.
- Optional final recovery response after repeated failures.
- Interrupt-safe pause, resume, and stop controls for CLI/MCP callers.

## Completed

- 2026-04-30: Fixed terminal result shaping in `src/agent/loop.ts`; explicit `done.data` now wins, collected jobs are only returned when present, and generic tasks return `null` data when no explicit payload exists.

## Runtime Resilience

The agent should guard initial actions, model decisions, steps, and individual tool calls. Resilience should be implemented locally without requiring hosted browser infrastructure.

## Acceptance Criteria

- [x] CLI callers receive explicit terminal action data without job-specific default leakage.
- A hung action returns a typed failure result.
- Agent history records timeout and failure context.
- CLI and MCP callers receive a deterministic terminal result.

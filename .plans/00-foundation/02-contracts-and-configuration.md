# Contracts And Configuration

Status: PARTIAL. Typed terminal output is done; load this file only when changing public contracts or runtime options.

## Goal

Make core agent behavior configurable without increasing API ambiguity.

## Contract Work

- [x] Add generic terminal data typing to `AgentResult<TData>`.
- Audit `src/agent/contracts.ts` for stable public shapes.
- [x] Add config types only when they are consumed by at least one public entry point. `AgentOptions<TData>.outputSchema` is consumed by `runAgent` and documented in README/examples.
- Keep implementation-only details local to feature modules.
- Prefer discriminated unions for action results and browser lifecycle events.

## Configuration Work

- Define a single `AgentOptions` expansion path for loop controls.
- Define browser runtime options for local-only behavior: profile path, downloads path, permissions, headless, viewport, timeouts, and recording paths.
- Define action execution options: per-action timeout, max actions per step, allowed domains, prohibited domains.
- Define prompt/context options: screenshots, DOM attributes, max DOM text length, message compaction limits.

## Acceptance Criteria

- [x] Public options are documented in README or examples for typed terminal output.
- Defaults are safe for local development.
- No option implies cloud hosting or external telemetry.

## Completed

- 2026-04-30: Added `AgentResult<TData>`, `AgentOptions<TData>.outputSchema`, README docs, and `examples/typed-output.ts` for zod-validated terminal data.

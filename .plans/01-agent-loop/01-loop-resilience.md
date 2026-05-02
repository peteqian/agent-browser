# Loop Resilience

Status: DONE. Core loop resilience items are implemented and covered by focused tests.

## Goal

Make the decision loop recover from common autonomous browsing failures without hiding errors.

## Features

- [x] Preserve explicit terminal `done.data` instead of forcing generic runs into `{ jobs: [] }`.
- [x] Model-decision timeout at the `runAgent` layer.
- [x] Per-step timeout around context preparation and action execution.
- [x] Per-action timeout so a silent CDP call cannot hang the whole agent.
- [x] Consecutive failure tracking with a clear final error state.
- [x] Optional final recovery response after repeated failures.
- [x] Loop detection for repeated action/page fingerprints.
- [x] Interrupt-safe pause, resume, and stop controls for CLI/MCP callers.

## Completed

- 2026-04-30: Fixed terminal result shaping in `src/agent/loop.ts`; explicit `done.data` now wins, collected jobs are only returned when present, and generic tasks return `null` data when no explicit payload exists.
- 2026-04-30: Added `AgentOptions.actionTimeoutMs` and wrapped action execution in `src/agent/loop.ts` so hung actions return failed action results, flow through `onStep`, and remain visible in action history. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentOptions.decisionTimeoutMs` and wrapped model decisions in `src/agent/loop.ts` so hung deciding models return deterministic failed `AgentResult`s. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentOptions.maxFailures` and consecutive single-action failure tracking in `src/agent/loop.ts`, returning a deterministic failed `AgentResult` after the configured cap. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentOptions.finalResponseAfterFailure` so repeated failures can trigger one final model recovery response that accepts only terminal `done` output, falling back to the deterministic max-failures result otherwise. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentOptions.stepTimeoutMs` and wrapped step context preparation in `src/agent/loop.ts` so page stabilization, serialization, pending-request collection, and tab listing cannot hang before model decision. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentOptions.loopDetectionEnabled` and `AgentOptions.loopDetectionWindow` with lightweight action/page fingerprints in `src/agent/loop.ts`, stopping deterministic repeated loops. Added focused Bun tests in `src/agent/loop.test.ts`.
- 2026-04-30: Added `AgentControl` and `AgentController` for interrupt-safe pause, resume, and stop behavior in `src/agent/loop.ts`, exported through `src/index.ts`. Added focused Bun tests in `src/agent/loop.test.ts`.

## Runtime Resilience

The agent should guard initial actions, model decisions, steps, and individual tool calls. Resilience should be implemented locally without requiring hosted browser infrastructure.

## Acceptance Criteria

- [x] CLI callers receive explicit terminal action data without job-specific default leakage.
- [x] A hung action returns a typed failure result.
- [x] A hung model decision returns a deterministic terminal failure.
- [x] Hung step context preparation returns a deterministic terminal failure.
- [x] Agent history records timeout and failure context.
- [x] Repeated single-action failures stop with a clear final error state.
- [x] Optional final recovery response can produce a terminal result after repeated failures.
- [x] Repeated action/page loops stop with a clear final error state.
- [x] CLI and MCP callers receive a deterministic terminal result.

# Changelog

## Unreleased

### Breaking

- `AgentResult` now carries a `reason: TerminalReason` field. Consumers should branch on `reason` instead of pattern-matching `summary`. `success` is preserved as a boolean alias for `reason === "completed"`.
- Public exports trimmed. Implementation details (`CDPClient`, `launchBrowser`, `BrowserProfile`, `serializePage`, `formatSnapshotForLLM`, `executeAction`, `actionSchemas`, `Action`, `ActionName`, `ActionResult`, `buildDecisionPrompt`, `SYSTEM_PROMPT`, DOM types) moved to the `@browser-agent/core/internal` subpath. The internal subpath has no stability guarantee.
- `DecideFn` signature changed to `(input, signal) => Promise<Decision>`. Built-in adapters forward the signal to the SDK so timed-out HTTP calls actually cancel.
- Removed job-search-specific contract types (`FoundJob`, `DistilledTrajectory`, `Extractor`, `TrajectoryStep`) and the `onFoundJobs` / `onDistilledTrajectory` callbacks. Consumers should define these locally and adopt `outputSchema` for typed terminal payloads.

### Added

- `createDecide({ provider, ... })` consolidates per-provider factory selection. Replaces duplicated switches in CLI and MCP entry points. Supported providers: `codex`, `openai`, `anthropic`.
- `AgentEvent` discriminated union and `onEvent` callback. Emits `decision`, `action`, and `terminal` events in order. `onStep` retained as a thin shim.
- `DecisionTelemetry` and `TokenUsage` types. `Decision.telemetry` is filled by built-in OpenAI and Anthropic adapters (latency, model, token counts including cached). Codex CLI adapter leaves it undefined.
- Cancellation: full `AbortSignal` propagation. `AgentController` for cooperative pause/resume/stop. Action signal threading is best-effort (page-method calls do not all accept signals).
- Resilience layer: `stepTimeoutMs`, `decisionTimeoutMs`, `actionTimeoutMs`, `maxFailures`, `finalResponseAfterFailure`, `loopDetectionEnabled`, `loopDetectionWindow`.
- Multi-action failure detection: a step where every action fails increments the consecutive-failure counter (previously only single-action steps did).

### Fixed

- Multi-action failure counter no longer skips multi-action plans.
- Codex CLI subprocess is killed when the agent aborts.

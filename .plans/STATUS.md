# Plan Status

Read this file first. It is the compact routing table for the deeper plan files.

## Status Legend

- `DONE`: implemented and verified. Skip unless auditing, fixing a regression, or changing the completed behavior.
- `PARTIAL`: some work is implemented, but important planned work remains. Read only the completed notes and the section relevant to the current task.
- `ACTIVE`: the recommended next area of implementation. Read before making changes in that area.
- `BACKLOG`: planned but not started. Skip unless the user explicitly asks for that feature area.
- `STABLE`: foundational direction or constraints that are not expected to change often. Read only when changing scope, non-goals, or package boundaries.
- `ROUTING`: index or sequencing material. Use it to decide which detailed file to open next.

## Current Focus

- `01-agent-loop/01-loop-resilience.md`: continue resilience work after terminal data fixes. Next scoped item is per-action timeout.
- `04-interfaces/01-cli.md`: CLI now has `--verbose`; future work should keep diagnostics JSONL on stderr.
- `05-quality/01-testing-strategy.md`: add focused tests when runtime behavior becomes stable enough for automation.

## Done

- Terminal result shaping no longer forces generic tasks into `{ jobs: [] }`.
- `done.data` is preserved as final `AgentResult.data`.
- `AgentResult<TData>` and `AgentOptions<TData>.outputSchema` support zod-validated typed terminal output.
- Schema-enabled runs no longer cast collected job fallback data to arbitrary output types.
- CLI supports `--verbose` / `-v` JSONL diagnostics with raw model output and per-step data on stderr.
- Chrome launch polling no longer accumulates `exit` listeners while waiting for the DevTools endpoint.

## Skip Unless Relevant

- `00-foundation/01-scope-and-boundaries.md`: stable unless changing package direction or non-goals.
- `00-foundation/02-contracts-and-configuration.md`: load when changing public contracts or options.
- `03-dom-and-actions/03-extraction-and-structured-output.md`: load when changing extraction or typed final output.
- `04-interfaces/03-public-api-and-examples.md`: load when changing exports or examples.
- `05-quality/03-rollout-sequence.md`: load when choosing the next implementation slice.

## Backlog

- Per-action timeout and typed timeout failures.
- Model-decision timeout at the `runAgent` layer.
- Loop detection and page fingerprints.
- DOM snapshot enrichment budgets.
- Action registry for built-ins and custom actions.
- Message compaction.
- Local watchdogs.
- Local artifacts and replay exports.

## Non-Goals

- Hosted browser product.
- Third-party hosted browser API integration.
- Proxy marketplace or rotation services.
- Managed CAPTCHA solving.
- Telemetry that leaves the user's machine by default.

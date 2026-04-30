# Rollout Sequence

Status: ROUTING. Use `../STATUS.md` first; load this file only when choosing the next implementation slice.

## Goal

Implement expansion in thin vertical slices.

## Sequence

1. Stabilize contracts and options. In progress: terminal result data now preserves explicit `done.data`, removes job-specific default leakage, and supports zod-validated typed output.
2. Add action timeouts and typed action failures.
3. Add loop detection and page fingerprints.
4. Add DOM snapshot enrichment budgets.
5. Add action registry for built-ins.
6. Add message compaction.
7. Add local watchdogs one at a time.
8. Add structured extraction outputs.
9. Expand CLI and MCP around shared runtime.
10. Add local artifacts and replay exports.

## Stop Criteria

- A feature requires hosted cloud infrastructure.
- A feature requires broad backward compatibility for an unshipped API.
- A feature increases public API surface without a current consumer.

## Verification

- Run `bun run typecheck` after TypeScript edits.
- Run relevant examples after runtime changes.
- Document manual verification for browser-dependent behavior.

## Completed Verification

- 2026-04-30: `bun run typecheck` passed after terminal data and launch polling fixes.
- 2026-04-30: CLI smoke test against `https://example.com` returned `data.heading` and did not emit the previous Chrome listener warning.
- 2026-04-30: `bun run typecheck` and CLI smoke test passed after adding `AgentResult<TData>` and `outputSchema` validation.

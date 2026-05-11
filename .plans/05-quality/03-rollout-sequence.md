# Rollout Sequence

Status: ROUTING. Use `../STATUS.md` first; load this file only when choosing the next implementation slice.

## Goal

Implement expansion in thin vertical slices.

## Sequence

Use `../HIGH-VALUE-FEATURES.md` for the canonical dependency hierarchy. Implement in thin slices in this order:

1. Preserve local-first scope and public contract boundaries.
2. Add browser runtime reliability: navigation, crash/dead-websocket, popup/dialog, download, storage, and permission watchdogs.
3. Add DOM snapshot enrichment: CDP DOMSnapshot, accessibility labels, selector maps, CSS-pixel coordinates, iframe/shadow summaries, and prompt budgets.
4. Upgrade action semantics: safer click/type/upload, new-tab detection, coordinate scaling, and page-specific action filtering.
5. Upgrade extraction: clean markdown, structure-aware chunking, schema extraction, extraction LLM hook, and pagination dedupe.
6. Improve agent reasoning: loop nudges, opt-in strict loop stop, message compaction, run memory, max-step `done` forcing, and optional final judge.
7. Expand interfaces only around stable runtime features: MCP session cleanup/artifacts, CLI ergonomics, and examples.
8. Add quality gates throughout: fixture-page browser tests, local JSONL diagnostics, performance budgets, and privacy/redaction checks.

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

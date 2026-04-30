# Testing Strategy

Status: ACTIVE. Smoke verification exists; focused automated tests remain next quality work.

## Goal

Add confidence around contracts and local browser behavior without requiring hosted services.

## Tests

- Unit tests for action normalization and loop detection.
- Unit tests for DOM serialization budgets.
- Contract tests for public exported types where practical.
- Integration smoke tests for local Chrome launch and navigation.
- MCP startup smoke test.

## Rules

- Tests must not depend on external hosted browser APIs.
- Network tests should be opt-in or use local fixtures when possible.
- Typecheck remains mandatory after meaningful TypeScript edits.

## Acceptance Criteria

- `bun run typecheck` passes.
- New feature layers include focused tests or documented manual verification.

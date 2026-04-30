# Extraction And Structured Output

Status: PARTIAL. Typed terminal output is done; extraction improvements remain backlog.

## Goal

Support content extraction and typed final outputs for downstream jobseeker workflows.

## Features

- Markdown/text page extraction with length budgets.
- [x] Optional schema-guided terminal output using zod schemas.
- [x] Structured final output contract in `AgentResult<TData>`.
- Page extraction action separate from final done action.

## Completed

- 2026-04-30: `runAgent` now accepts `outputSchema`; explicit `done.data` is validated before being returned, and schema-enabled runs no longer cast job fallback data to arbitrary output types.

## Design Notes

- Keep extraction local and model-agnostic.
- Avoid adding a provider abstraction unless multiple providers are actively used.
- Preserve raw page URL/title/timestamp with extracted content.

## Acceptance Criteria

- [x] Callers can request typed output for job/search/application flows.
- Extraction failures are recoverable action results.

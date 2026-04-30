# CLI

Status: PARTIAL. Verbose JSONL diagnostics are done; load this file for CLI option or UX changes.

## Goal

Make local agent runs practical from the command line.

## Features

- Run a task with configurable URL, headless mode, profile, max steps, and artifact path.
- Print step summaries without leaking sensitive data.
- Save trajectory JSON when requested.
- Exit non-zero on terminal failure.

## Acceptance Criteria

- `bun run cli` remains the development entry point.
- CLI options map to public `AgentOptions` instead of private internals.

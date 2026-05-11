# MCP

Status: PARTIAL. Core session and direct browser tools exist; cleanup, artifact listing, and timeout hardening remain.

## Goal

Expose browser-agent capabilities to MCP clients without stdout/logging interference.

## Features

- Tool to run an autonomous browser task.
- Direct browser tools for navigate, click, type, screenshot, and extract.
- Session-scoped state for follow-up operations.
- Explicit artifact paths in results.

## Completed

- MCP server exposes session launch/close, tab management, direct browser actions, extraction, screenshots, PDFs, and autonomous `run_agent`.
- MCP direct tools share the same action/browser runtime as the agent loop.

## Rules

- Logs go to stderr.
- MCP responses are typed and deterministic.
- No cloud-hosted browser assumptions.

## Acceptance Criteria

- `bun run mcp` starts cleanly.
- [x] MCP direct tools and agent tools share the same action/browser runtime.
- Sessions have cleanup/timeouts that prevent stale browser processes.
- Artifact-producing tools return explicit local paths.

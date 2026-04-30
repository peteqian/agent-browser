# MCP

Status: BACKLOG. Skip unless changing MCP tools, sessions, or server behavior.

## Goal

Expose browser-agent capabilities to MCP clients without stdout/logging interference.

## Features

- Tool to run an autonomous browser task.
- Direct browser tools for navigate, click, type, screenshot, and extract.
- Session-scoped state for follow-up operations.
- Explicit artifact paths in results.

## Rules

- Logs go to stderr.
- MCP responses are typed and deterministic.
- No cloud-hosted browser assumptions.

## Acceptance Criteria

- `bun run mcp` starts cleanly.
- MCP direct tools and agent tools share the same action/browser runtime.

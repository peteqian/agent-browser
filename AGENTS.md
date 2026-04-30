# Browser-Agent AI Manual

This package is the TypeScript browser automation agent for the jobseeker workspace. It uses raw Chrome DevTools Protocol plus an LLM decision loop, and exposes both CLI and MCP entry points.

## First Read

- Treat this file as the canonical AI manual for `@jobseeker/browser-agent`.
- `CLAUDE.md` is a symlink to this file.
- Keep human-facing usage notes in `README.md` and AI-facing implementation rules here.
- Prefer small, direct edits that preserve the package boundary.

## Contract Ownership

- `@jobseeker/browser-agent` owns the server-facing browser-agent contract types.
- If another package consumes data produced by the agent loop or replay pipeline, those shared types should live here and be exported from `src/index.ts`.
- Do not redefine browser-agent contract shapes in downstream packages like `apps/server`.
- Keep implementation-only types local unless another package needs them.

Current contract source of truth:

- `src/agent/contracts.ts`

Examples of types that belong here:

- `FoundJob`
- `TrajectoryStep`
- `Extractor`
- `DistilledTrajectory`
- `DecisionInput`
- `RawAction`
- `Decision`
- `StepInfo`
- `AgentResult`
- `AgentOptions`

When adding or changing shared contract types:

- Update `src/agent/contracts.ts` first.
- Export public shared types from `src/index.ts`.
- Update downstream imports to use `@jobseeker/browser-agent` instead of local copies.
- Preserve public contract stability unless the change is intentional.

## Architecture Map

- `src/agent/` LLM decision loop, prompts, contracts, and decision adapters.
- `src/actions/` browser action types and execution.
- `src/browser/` browser sessions, profiles, and runtime watchdogs.
- `src/cdp/` raw Chrome DevTools Protocol launch, discovery, client, and Chrome args.
- `src/dom/` DOM serialization and DOM-facing types.
- `src/mcp/` MCP server integration.
- `bin/cli.ts` command-line entry point.
- `bin/mcp.ts` MCP server entry point.
- `examples/` runnable usage examples.

## Development Commands

- `bun run typecheck` checks TypeScript without emitting files.
- `bun run cli` runs the browser-agent CLI.
- `bun run mcp` runs the MCP server.
- `bun run example:goto` runs the basic navigation example.
- `bun run example:agent` runs the agent loop example.

Run `bun run typecheck` after meaningful TypeScript edits.

## Refactor Guidance

- When moving `browser-agent` into its own repository or package boundary, preserve these types as part of the public package API.
- Prefer importing shared agent contracts from `@jobseeker/browser-agent` instead of local server modules.
- If a type is only internal to one implementation detail and not consumed across package boundaries, keep it local instead of exporting it.
- Avoid backward-compatibility shims unless persisted data, shipped behavior, external consumers, or explicit requirements make them necessary.

## Troubleshooting Pointers

- For Chrome/CDP connection issues, inspect `src/cdp/` launch and discovery code first.
- For MCP startup issues, inspect `src/mcp/server.ts` and `bin/mcp.ts`.
- For contract import failures in another package, verify the type is exported from `src/index.ts` and consumed from `@jobseeker/browser-agent`.

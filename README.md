# @jobseeker/browser-agent

TypeScript browser automation agent using raw Chrome DevTools Protocol plus an LLM decision loop, inspired by `browser-use`.

## Quick AI Manual

AI agents should read `AGENTS.md` first. `CLAUDE.md` is a symlink to the same file.

That file is the canonical AI manual for contract ownership, architecture, and editing rules in this package.

## Quick Human Manual

Use this package when you need browser automation that can inspect pages, choose actions, execute them through CDP, and expose the workflow through a CLI or MCP server.

Common commands:

- `bun run typecheck` checks TypeScript without emitting files.
- `bun run cli` runs the browser-agent CLI from `bin/cli.ts`.
- `bun run mcp` runs the MCP server from `bin/mcp.ts`.
- `bun run example:goto` runs the basic navigation example.
- `bun run example:agent` runs the agent loop example.
- `bun run example:typed-output` runs an agent example with zod-validated terminal data.
- `bun run example:openai` runs the agent loop against the OpenAI provider.
- Add `--verbose` to `bun run cli -- ...` or `browser-agent ...` to print JSONL diagnostics, including raw model output, to stderr.

Providers:

- `--provider codex` (default) — OpenAI Codex CLI via `CODEX_BIN`.
- `--provider openai` — OpenAI Chat Completions API. Set `OPENAI_API_KEY` in env (preferred over `--api-key`, which appears in process listings).
- `--provider anthropic` — Anthropic Messages API. Set `ANTHROPIC_API_KEY` in env.
- `--base-url` overrides the SDK base URL (e.g., for compatible providers or local servers).
- `--model <id>` overrides the per-provider default model.

Main entry points:

- `src/index.ts` public package exports.
- `bin/cli.ts` command-line entry point.
- `bin/mcp.ts` MCP server entry point.
- `examples/` runnable usage examples.

Typed terminal output:

```ts
import { z } from "zod";
import { runAgent } from "@jobseeker/browser-agent";

const Result = z.object({ heading: z.string() });

const result = await runAgent({
  task: "Report the page heading via done(data=...).",
  outputSchema: Result,
  // provide startUrl, launch, and decide...
});

if (result.data) {
  result.data.heading;
}
```

Troubleshooting:

- If Chrome/CDP connection fails, check the launch/discovery code in `src/cdp/` and confirm a compatible Chrome process can start.
- If MCP startup fails, check `src/mcp/server.ts` and the `browser-agent-mcp` bin entry.
- If contract imports fail in another package, import shared types from `@jobseeker/browser-agent` instead of redefining them locally.
- After code changes, run `bun run typecheck` before handing work off.

## Development Notes

- Package name: `@jobseeker/browser-agent`
- Package type: ESM
- Package status: private
- Primary dependencies: `@modelcontextprotocol/sdk`, `devtools-protocol`, `ws`, `zod`

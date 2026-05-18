# agent-browser

TypeScript browser-automation. Raw Chrome DevTools Protocol + an LLM decision loop.

This monorepo ships two npm packages:

| Package                                         | Path            | Purpose                                                                                                            |
| ----------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`@peteqian/browser-agent-sdk`](./packages/sdk) | `packages/sdk/` | Library core. `Page`, `BrowserSession`, `Agent`, `runAgent`, actions, DOM, LLM adapters. Import this in your code. |
| [`@peteqian/browser-agent`](./packages/cli)     | `packages/cli/` | CLI binary `browser-agent` and MCP server `browser-agent-mcp`. Future: HTTP API server.                            |

Library consumers depend on `-sdk`. CLI / MCP users install the unsuffixed package.

## Development

```bash
bun install
bun run build       # turbo build (sdk first, then cli)
bun run typecheck
bun run test
bun run lint
bun run fmt:check
```

Per-package work:

```bash
bun --cwd packages/sdk run dev
bun --cwd packages/cli run dev:cli
bun --cwd packages/cli run dev:mcp
```

## Releases

[Changesets](https://github.com/changesets/changesets) drives versioning. SDK and CLI are version-linked while the SDK surface is pre-1.0.

```bash
bun run changeset           # author a changeset
bun run version-packages    # bump versions + changelogs
bun run release             # build + publish
```

## License

MIT.

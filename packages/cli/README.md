# @peteqian/browser-agent

CLI and MCP server for [`@peteqian/browser-agent-sdk`](../browser-agent).

## Install

```bash
npm install -g @peteqian/browser-agent
```

## CLI

```bash
browser-agent "Find the top result on Hacker News and print its title."
browser-agent "..." --provider openai --model gpt-4.1-mini
browser-agent --probe --provider claude
```

Run `browser-agent --help` for the full flag list.

## MCP server

Spawn `browser-agent-mcp` as a stdio MCP server. Drop into `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-agent": {
      "command": "npx",
      "args": ["-y", "-p", "@peteqian/browser-agent", "browser-agent-mcp"]
    }
  }
}
```

## Programmatic

```ts
import { createMcpServer, runStdioServer } from "@peteqian/browser-agent";
```

For library use (in-process automation), import `@peteqian/browser-agent-sdk` instead.

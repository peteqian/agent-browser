# Scope And Boundaries

Status: STABLE. Skip unless changing package direction, hosted-browser non-goals, or package ownership boundaries.

## Goal

Expand this package into a capable local browser automation agent while preserving a small package boundary and avoiding cloud-hosted browser features.

## Keep

- Raw Chrome DevTools Protocol control.
- TypeScript-first public contracts.
- CLI and MCP entry points.
- Local Chrome launch and remote CDP connection support.
- Shared agent contracts owned in `src/agent/contracts.ts` and exported from `src/index.ts`.

## Add Carefully

- Tool/action registry.
- Better DOM snapshot enrichment.
- Local browser watchdogs.
- Agent loop resilience features.
- Message compaction and trajectory summarization.
- Structured output support.
- Optional local recording artifacts.

## Explicitly Exclude

- Hosted cloud browser sessions.
- Third-party hosted browser authentication or SDK calls.
- Proxy marketplace or rotation services.
- Managed CAPTCHA solving.
- Hosted persistent filesystem or memory.
- Telemetry that leaves the user's machine by default.

## Boundary Rule

If a feature needs a server-owned contract, define it here first and export it from `src/index.ts`. Downstream packages should not duplicate browser-agent contract shapes.

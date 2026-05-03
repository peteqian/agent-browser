/**
 * Public consumer surface for `@browser-agent/core`.
 *
 * Implementation details (raw CDP, profile mgmt, DOM serializer, action
 * executor, prompt internals) live behind `@browser-agent/core/internal`
 * — that subpath has no stability guarantee.
 */

export { BrowserSession, Page } from "./browser/session";

export { AgentController, runAgent } from "./agent/loop";
export { createCodexCliDecide } from "./agent/codexCliDecide";
export type {
  AgentControl,
  AgentEvent,
  AgentOptions,
  AgentResult,
  DecideFn,
  Decision,
  DecisionInput,
  OnEventCallback,
  RawAction,
  StepInfo,
  TerminalReason,
} from "./agent/contracts";

export { createOpenAIDecide, createAnthropicDecide, createDecide } from "./llm";
export type {
  CreateDecideOptions,
  DecisionTelemetry,
  LLMAdapterOptions,
  ProviderId,
  TokenUsage,
} from "./llm";

export { createServer as createMcpServer, runStdioServer } from "./mcp/server";

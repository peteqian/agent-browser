import type { Decision, DecisionInput } from "../agent/contracts";
import { createCodexCliDecide } from "../agent/codexCliDecide";
import { createAnthropicDecide } from "./anthropic";
import { createOpenAIDecide } from "./openai";

export type ProviderId = "codex" | "openai" | "anthropic";

export interface CreateDecideOptions {
  provider: ProviderId;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  /** Codex-only: passed as `model_reasoning_effort` to the codex binary. */
  effort?: string;
  /** Codex-only: invoked with the raw stdout for each decision. */
  onCodexRaw?: (raw: string, step: number) => void;
}

/** Default model per provider. Single source of truth for CLI/MCP/embedders. */
const DEFAULT_MODEL: Record<ProviderId, string> = {
  codex: "gpt-5.3-codex",
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
};

/**
 * Build a `DecideFn` for the given provider. Collapses the per-provider
 * factory call into a single entry point so CLI, MCP, and embedders all
 * share the same defaults and option shape.
 */
export function createDecide(
  options: CreateDecideOptions,
): (input: DecisionInput, signal?: AbortSignal) => Promise<Decision> {
  const model = options.model ?? DEFAULT_MODEL[options.provider];

  switch (options.provider) {
    case "openai":
      return createOpenAIDecide({
        model,
        apiKey: options.apiKey,
        baseURL: options.baseURL,
      });
    case "anthropic":
      return createAnthropicDecide({
        model,
        apiKey: options.apiKey,
        baseURL: options.baseURL,
      });
    case "codex":
      return createCodexCliDecide({
        model,
        effort: options.effort,
        onRaw: options.onCodexRaw,
      });
  }
}

import type { Decision, DecisionInput } from "../agent/contracts";

/** Common options for built-in LLM adapters. */
export interface LLMAdapterOptions {
  /** API key for the provider. Falls back to env vars if omitted. */
  apiKey?: string;
  /** Base URL for the API (e.g. OpenRouter, local server). */
  baseURL?: string;
  /** Model identifier. */
  model: string;
  /** Sampling temperature (default: 0.2). */
  temperature?: number;
  /** Max completion tokens (default: 4096). */
  maxTokens?: number;
}

/** Factory signature for creating a decide function. */
export type DecideFactory = (
  options: LLMAdapterOptions,
) => (input: DecisionInput) => Promise<Decision>;

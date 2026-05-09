import OpenAI from "openai";

import { buildDecisionUserPrompt } from "../agent/loop";
import { SYSTEM_PROMPT } from "../agent/prompts";
import type { Decision, DecisionInput } from "../agent/contracts";
import type { LLMAdapterOptions } from "./types";
import { buildTelemetry } from "./telemetry";
import { decisionJsonSchema, validateDecision } from "./decisionSchema";

/**
 * Create a decide adapter backed by the OpenAI Chat Completions API.
 *
 * Targets OpenAI proper. Other providers (OpenRouter, Groq, Together, Ollama)
 * may work via `baseURL` if they support `response_format: json_schema` and
 * `max_completion_tokens`, but compatibility is not guaranteed and varies by
 * model.
 *
 * Uses `response_format: { type: "json_schema" }` for reliable structured
 * output. The model receives the system prompt plus the per-step observation
 * and must return a valid Decision object.
 */
export function createOpenAIDecide(
  options: LLMAdapterOptions,
): (input: DecisionInput, signal?: AbortSignal) => Promise<Decision> {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    maxRetries: 2,
  });

  const model = options.model;
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 4096;

  return async (input: DecisionInput, signal?: AbortSignal): Promise<Decision> => {
    const userContent = buildDecisionUserPrompt(input);
    const startedAt = Date.now();

    const response = await client.chat.completions.create(
      {
        model,
        temperature,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "decision",
            description: "Browser agent decision for the current step",
            schema: decisionJsonSchema as unknown as Record<string, unknown>,
          },
        },
      },
      { signal },
    );

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI response missing content");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
    }

    const decision = validateDecision(parsed);
    decision.telemetry = buildTelemetry(
      startedAt,
      model,
      response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            cachedInputTokens: response.usage.prompt_tokens_details?.cached_tokens,
          }
        : undefined,
    );
    return decision;
  };
}

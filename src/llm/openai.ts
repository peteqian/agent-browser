import OpenAI from "openai";

import { buildDecisionPrompt } from "../agent/loop";
import { SYSTEM_PROMPT } from "../agent/prompts";
import type { Decision, DecisionInput } from "../agent/contracts";
import type { LLMAdapterOptions } from "./types";

/**
 * JSON Schema describing the Decision shape for structured output.
 *
 * Kept relaxed (no strict mode) because `params` has a dynamic shape
 * that depends on the action name.
 */
const decisionJsonSchema = {
  type: "object",
  properties: {
    thought: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          params: { type: "object" },
        },
        required: ["name", "params"],
      },
    },
    done: { type: "boolean" },
    success: { type: "boolean" },
    summary: { type: "string" },
  },
  required: ["actions", "done"],
} as const;

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
    const userContent = buildDecisionPrompt(input);

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

    return validateDecision(parsed);
  };
}

function validateDecision(raw: unknown): Decision {
  if (!raw || typeof raw !== "object") {
    throw new Error("Decision is not an object");
  }

  const d = raw as Record<string, unknown>;

  if (!Array.isArray(d.actions)) {
    throw new Error("Decision.actions must be an array");
  }

  const actions = d.actions.map((a: unknown) => {
    if (!a || typeof a !== "object") {
      throw new Error("Decision action is not an object");
    }
    const action = a as Record<string, unknown>;
    if (typeof action.name !== "string") {
      throw new Error("Decision action missing name");
    }
    return { name: action.name, params: action.params ?? {} };
  });

  if (typeof d.done !== "boolean") {
    throw new Error("Decision.done must be a boolean");
  }

  return {
    thought: typeof d.thought === "string" ? d.thought : undefined,
    actions,
    done: d.done,
    success: typeof d.success === "boolean" ? d.success : undefined,
    summary: typeof d.summary === "string" ? d.summary : undefined,
  };
}

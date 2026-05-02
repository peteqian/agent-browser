import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

import { buildDecisionPrompt } from "../agent/loop";
import { SYSTEM_PROMPT } from "../agent/prompts";
import type { Decision, DecisionInput } from "../agent/contracts";
import type { LLMAdapterOptions } from "./types";

/**
 * JSON Schema describing the Decision shape for structured output.
 *
 * Kept relaxed because `params` has a dynamic shape that depends on the
 * action name.
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
 * Create a decide adapter backed by the Anthropic Messages API.
 *
 * Uses the official `@anthropic-ai/sdk` with native structured output
 * (`jsonSchemaOutputFormat`) for reliable Decision parsing.
 */
export function createAnthropicDecide(
  options: LLMAdapterOptions,
): (input: DecisionInput, signal?: AbortSignal) => Promise<Decision> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic adapter requires apiKey or ANTHROPIC_API_KEY env var");
  }

  const client = new Anthropic({
    apiKey,
    baseURL: options.baseURL,
    maxRetries: 2,
  });

  const model = options.model;
  const maxTokens = options.maxTokens ?? 4096;

  return async (input: DecisionInput, signal?: AbortSignal): Promise<Decision> => {
    const userContent = buildDecisionPrompt(input);

    const message = await client.messages.parse(
      {
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        output_config: {
          format: jsonSchemaOutputFormat(
            decisionJsonSchema as unknown as Parameters<typeof jsonSchemaOutputFormat>[0],
          ),
        },
      },
      { signal },
    );

    const raw = message.parsed_output;
    if (!raw) {
      throw new Error("Anthropic response missing parsed_output");
    }

    return validateDecision(raw);
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

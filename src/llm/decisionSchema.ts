import type { Decision } from "../agent/contracts";

/**
 * JSON Schema describing the Decision shape for structured-output APIs
 * (OpenAI `response_format: json_schema`, Anthropic `output_config`).
 *
 * Kept relaxed (no strict mode) because `params` has a dynamic shape that
 * depends on the action name.
 */
export const decisionJsonSchema = {
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
 * Validate a parsed structured-output payload as a Decision. Used by
 * adapters whose SDK returns already-parsed JSON (OpenAI, Anthropic).
 *
 * Throws with a specific message describing which field violated the
 * contract so adapter errors stay actionable.
 */
export function validateDecision(raw: unknown): Decision {
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

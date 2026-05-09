import type { Decision, DecisionInput } from "./contracts";

/**
 * Builds the per-step prompt body for freeform-text adapters (CLI binaries
 * and Agent SDKs). Includes an explicit JSON shape directive because these
 * transports cannot enforce structured output the way the OpenAI/Anthropic
 * SDKs can via response_format / tool calls.
 *
 * Does NOT prepend the system prompt. Callers either inline it themselves
 * or pass it through the SDK's dedicated systemPrompt option.
 */
export function buildFreeformDecisionPrompt(input: DecisionInput): string {
  const historyBlock =
    input.history.length === 0
      ? "(none)"
      : input.history.map((h, idx) => `${idx + 1}. ${h.action} => ${h.result}`).join("\n");

  return `Task: ${input.task}
Step: ${input.step}
Active tab: ${input.activeTab}
Open tabs: ${input.tabs.join(", ")}
Actions:
${input.actionCatalog ?? "(default actions)"}

Recent action history:
${historyBlock}

Observation:
${input.observation}

Return exactly one JSON object (no markdown) with this shape:
{"name":"<action_name>","params":{...}}

Do not return any text outside JSON.`;
}

/**
 * Parses freeform-text model output into a Decision. Tolerates markdown
 * code fences and surrounding prose by extracting the first balanced JSON
 * object from the text.
 */
export function parseDecision(raw: string): Decision {
  const cleaned = stripCodeFences(raw);
  let parsed: { name?: unknown; params?: unknown } | null = null;
  try {
    parsed = JSON.parse(cleaned) as { name?: unknown; params?: unknown };
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (extracted) {
      parsed = JSON.parse(extracted) as { name?: unknown; params?: unknown };
    }
  }
  if (!parsed || typeof parsed.name !== "string") {
    throw new Error("Decision response missing action name");
  }

  const name = parsed.name;
  const params = (parsed.params ?? {}) as Record<string, unknown>;
  const done = name === "done";

  return {
    actions: [{ name, params }],
    done,
    summary: done ? String(params.summary ?? "") : undefined,
    success: done ? Boolean(params.success) : undefined,
  };
}

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

function extractFirstJsonObject(text: string): string | null {
  const source = stripCodeFences(text);
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const ch = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

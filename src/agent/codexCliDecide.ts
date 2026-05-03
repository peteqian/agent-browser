import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import type { Decision, DecisionInput } from "./contracts";
import { SYSTEM_PROMPT } from "./prompts";

interface CodexCliOptions {
  binaryPath?: string;
  model: string;
  effort?: string;
  cwd?: string;
  codexHome?: string;
  codexAuthHome?: string;
  onRaw?: (raw: string, step: number) => void;
}

// Codex CLI adapter for standalone runAgent callers (CLI/MCP/examples) that do
// not have the Codex SDK available. The explorer service uses the SDK directly
// via apps/server/src/lib/codex.ts::createCodexThread.
export function createCodexCliDecide(
  options: CodexCliOptions,
): (input: DecisionInput, signal?: AbortSignal) => Promise<Decision> {
  return async (input, signal) => {
    const prompt = buildLegacyPrompt(input);
    const raw = await callCodex({
      binaryPath: options.binaryPath,
      model: options.model,
      prompt,
      effort: options.effort,
      cwd: options.cwd,
      codexHome: options.codexHome,
      codexAuthHome: options.codexAuthHome,
      signal,
    });
    options.onRaw?.(raw, input.step);

    const legacy = parseLegacyDecision(raw);
    return {
      actions: [{ name: legacy.name, params: legacy.params }],
      done: legacy.name === "done",
      summary:
        legacy.name === "done"
          ? String((legacy.params as { summary?: unknown }).summary ?? "")
          : undefined,
      success:
        legacy.name === "done"
          ? Boolean((legacy.params as { success?: unknown }).success)
          : undefined,
    };
  };
}

function buildLegacyPrompt(input: DecisionInput): string {
  const historyBlock =
    input.history.length === 0
      ? "(none)"
      : input.history.map((h, idx) => `${idx + 1}. ${h.action} => ${h.result}`).join("\n");

  return `${SYSTEM_PROMPT}

Task: ${input.task}
Step: ${input.step}
Active tab: ${input.activeTab}
Open tabs: ${input.tabs.join(", ")}

Recent action history:
${historyBlock}

Observation:
${input.observation}

Return exactly one JSON object (no markdown) with this shape:
{"name":"<action_name>","params":{...}}

Do not return any text outside JSON.`;
}

interface LegacyDecision {
  name: string;
  params: unknown;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

function extractFirstJsonObject(text: string): string | null {
  const source = cleanJsonResponse(text);
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

function parseLegacyDecision(text: string): LegacyDecision {
  const cleaned = cleanJsonResponse(text);
  let parsed: { name?: string; params?: unknown } | null = null;
  try {
    parsed = JSON.parse(cleaned) as { name?: string; params?: unknown };
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (extracted) {
      parsed = JSON.parse(extracted) as { name?: string; params?: unknown };
    }
  }
  if (!parsed || !parsed.name || typeof parsed.name !== "string") {
    throw new Error("Model response missing action name");
  }
  return { name: parsed.name, params: parsed.params ?? {} };
}

function ensureCodexAuthInHome(codexHome: string, sourceHome?: string): void {
  mkdirSync(codexHome, { recursive: true });
  const homeDir = process.env.HOME;
  if (!homeDir) return;
  const normalizedSourceHome = sourceHome?.trim();
  const candidates: Array<{ src: string; dest: string }> = [
    ...(normalizedSourceHome
      ? [
          {
            src: path.join(normalizedSourceHome, "auth.json"),
            dest: path.join(codexHome, "auth.json"),
          },
          {
            src: path.join(normalizedSourceHome, "config.toml"),
            dest: path.join(codexHome, "config.toml"),
          },
        ]
      : []),
    { src: path.join(homeDir, ".codex", "auth.json"), dest: path.join(codexHome, "auth.json") },
    {
      src: path.join(homeDir, ".codex", "config.toml"),
      dest: path.join(codexHome, "config.toml"),
    },
    {
      src: path.join(homeDir, ".config", "codex", "auth.json"),
      dest: path.join(codexHome, "auth.json"),
    },
    {
      src: path.join(homeDir, ".config", "codex", "config.toml"),
      dest: path.join(codexHome, "config.toml"),
    },
  ];
  for (const { src, dest } of candidates) {
    if (!existsSync(src) || existsSync(dest)) continue;
    copyFileSync(src, dest);
  }
}

function collectStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

function waitForExit(proc: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null) {
      resolve(proc.exitCode);
      return;
    }
    proc.on("close", (code) => resolve(code ?? null));
  });
}

async function callCodex(request: {
  binaryPath?: string;
  model: string;
  prompt: string;
  effort?: string;
  cwd?: string;
  codexHome?: string;
  codexAuthHome?: string;
  signal?: AbortSignal;
}): Promise<string> {
  const binPath = request.binaryPath?.trim() || process.env.CODEX_BIN || "codex";
  const args = [
    "exec",
    "--ephemeral",
    "-s",
    "read-only",
    "--skip-git-repo-check",
    "--model",
    request.model,
  ];
  if (request.effort) {
    args.push("--config", `model_reasoning_effort="${request.effort}"`);
  }
  args.push("-");

  if (request.codexHome) {
    ensureCodexAuthInHome(request.codexHome, request.codexAuthHome);
  }

  if (request.signal?.aborted) {
    throw new Error("Codex call aborted before spawn");
  }

  const proc = spawn(binPath, args, {
    stdio: ["pipe", "pipe", "pipe"],
    ...(request.cwd ? { cwd: request.cwd } : {}),
    ...(request.codexHome ? { env: { ...process.env, CODEX_HOME: request.codexHome } } : {}),
  });

  const onAbort = () => proc.kill();
  request.signal?.addEventListener("abort", onAbort, { once: true });

  proc.stdin!.write(request.prompt);
  proc.stdin!.end();

  const stdoutPromise = collectStream(proc.stdout!);
  const stderrPromise = collectStream(proc.stderr!);
  const timeoutMs = 120_000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      proc.kill();
      reject(new Error(`Codex timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const stdout = await Promise.race([stdoutPromise, timeoutPromise]);
    const exitCode = await waitForExit(proc);
    const stderr = await stderrPromise;
    if (request.signal?.aborted) {
      throw new Error("Codex call aborted");
    }
    if (exitCode !== 0) {
      throw new Error(`Codex exited with code ${exitCode}: ${stderr}`);
    }
    return stdout;
  } finally {
    request.signal?.removeEventListener("abort", onAbort);
  }
}

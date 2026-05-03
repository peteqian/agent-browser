import { executeAction, type ActionResult } from "../actions/execute";
import { actionSchemas, type Action, type ActionName } from "../actions/types";
import { BrowserSession, type Page } from "../browser/session";
import { formatSnapshotForLLM, serializePage } from "../dom/serialize";
import type {
  AgentControl,
  AgentEvent,
  AgentOptions,
  AgentResult,
  Decision,
  DecisionInput,
} from "./contracts";
import { SYSTEM_PROMPT } from "./prompts";

const DEFAULT_ACTION_TIMEOUT_MS = 30_000;
const DEFAULT_DECISION_TIMEOUT_MS = 120_000;
const DEFAULT_STEP_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_LOOP_DETECTION_WINDOW = 4;

export class AgentController implements AgentControl {
  private abortController = new AbortController();
  private paused = false;
  private pauseWaiters = new Set<() => void>();
  private reason: string | undefined;

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get stopReason(): string | undefined {
    return this.reason;
  }

  pause(): void {
    if (this.signal.aborted) return;
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    for (const resolve of this.pauseWaiters) {
      resolve();
    }
    this.pauseWaiters.clear();
  }

  stop(reason?: string): void {
    this.reason = reason;
    this.resume();
    this.abortController.abort(reason);
  }

  async waitIfPaused(): Promise<void> {
    if (!this.paused || this.signal.aborted) return;
    await new Promise<void>((resolve) => {
      this.pauseWaiters.add(resolve);
    });
  }
}

/**
 * Formats the per-step observation payload given to the deciding model.
 *
 * Keeping prompt assembly centralized makes the CLI, server, and future
 * adapters share the same decision contract.
 */
export function buildDecisionPrompt(input: DecisionInput): string {
  const historyBlock =
    input.history.length === 0
      ? "(none)"
      : input.history.map((h, idx) => `${idx + 1}. ${h.action} => ${h.result}`).join("\n");

  return `${SYSTEM_PROMPT}

Task: ${input.task}
Step: ${input.step}/${input.maxSteps}
Active tab: ${input.activeTab}
Open tabs: ${input.tabs.join(", ")}

Recent action history:
${historyBlock}

Observation:
${input.observation}

Respond with the structured decision described in the system prompt.`;
}

/**
 * Runs the core browser-agent loop until completion, abort, or step-budget
 * exhaustion.
 *
 * The loop owns the session lifecycle when no caller-provided page/session is
 * given; otherwise it leaves cleanup to the caller.
 */
export async function runAgent<TData = unknown>(
  options: AgentOptions<TData>,
): Promise<AgentResult<TData>> {
  const result = await runAgentInner<TData>(options);
  await emitEvent(options, { type: "terminal", result });
  return result;
}

async function emitEvent<TData>(
  options: AgentOptions<TData>,
  event: AgentEvent<TData>,
): Promise<void> {
  if (!options.onEvent) return;
  await options.onEvent(event);
}

async function runAgentInner<TData = unknown>(
  options: AgentOptions<TData>,
): Promise<AgentResult<TData>> {
  const maxSteps = options.maxSteps ?? 40;
  const stepTimeoutMs = coerceStepTimeoutMs(options.stepTimeoutMs);
  const actionTimeoutMs = coerceActionTimeoutMs(options.actionTimeoutMs);
  const decisionTimeoutMs = coerceDecisionTimeoutMs(options.decisionTimeoutMs);
  const maxFailures = coerceMaxFailures(options.maxFailures);
  const finalResponseAfterFailure = options.finalResponseAfterFailure ?? true;
  const loopDetectionEnabled = options.loopDetectionEnabled ?? true;
  const loopDetectionWindow = coerceLoopDetectionWindow(options.loopDetectionWindow);

  const ownsSession = !options.session && !options.page;
  const session =
    options.session ??
    (ownsSession ? await BrowserSession.launch(options.launch ?? {}) : undefined);
  let page = options.page ?? (session ? await session.newPage() : undefined);

  if (!page) {
    throw new Error("No page available — provide options.page or options.session.");
  }

  if (options.startUrl) {
    await page.goto(options.startUrl);
  }

  const actionHistory: Array<{ action: string; result: string }> = [];
  const loopFingerprints: string[] = [];
  let consecutiveFailures = 0;

  try {
    for (let step = 1; step <= maxSteps; step++) {
      const beforeStepInterrupt = await checkInterrupt(options, step - 1);
      if (beforeStepInterrupt) return beforeStepInterrupt;

      let context: StepContext;
      try {
        context = await withRejectingTimeout(
          buildStepContext(page, session),
          stepTimeoutMs,
          `Step context preparation timed out after ${stepTimeoutMs}ms`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          reason: "step_timeout",
          summary: message,
          data: null,
          steps: step,
        };
      }

      const { snapshot, observation, tabs } = context;

      let decision: Decision;
      try {
        decision = await withDecideTimeout(
          options.decide,
          {
            task: options.task,
            step,
            maxSteps,
            observation,
            tabs,
            activeTab: page.targetId,
            history: actionHistory.slice(-8),
          },
          decisionTimeoutMs,
          `Model decision timed out after ${decisionTimeoutMs}ms`,
          combineSignals(options.signal, options.control?.signal),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isTimeout = message.includes("Model decision timed out");
        return {
          success: false,
          reason: isTimeout ? "decision_timeout" : "decide_error",
          summary: `Model decision failed: ${message}`,
          data: null,
          steps: step,
        };
      }

      await emitEvent(options, { type: "decision", step, decision });

      const actions = decision.actions ?? [];
      const actionResults: Array<{ ok: boolean; message: string }> = [];
      let terminal = false;
      let terminalResult: AgentResult<TData> | null = null;

      for (const rawAction of actions) {
        const beforeActionInterrupt = await checkInterrupt(options, step);
        if (beforeActionInterrupt) return beforeActionInterrupt;

        const action = parseAction(rawAction.name, rawAction.params);
        if (!action) {
          actionResults.push({ ok: false, message: "Invalid action payload" });
          actionHistory.push({
            action: rawAction.name,
            result: "Invalid action payload",
          });
          continue;
        }

        const result = await executeActionWithTimeout(
          page,
          action,
          session,
          actionTimeoutMs,
          combineSignals(options.signal, options.control?.signal),
        );
        actionResults.push({ ok: result.ok, message: result.message });
        if (result.activeTargetId && session) {
          page = session.getPage(result.activeTargetId);
        }

        const stepInfo = {
          step,
          url: snapshot.url,
          action,
          result: { ok: result.ok, message: result.message },
        };
        options.onStep?.(stepInfo);
        await emitEvent(options, { type: "action", ...stepInfo });

        actionHistory.push({
          action: `${action.name}(${JSON.stringify(action.params)})`,
          result: result.longTermMemory ?? result.message,
        });

        if (action.name === "done") {
          const terminalData = buildTerminalData(action.params.data, options.outputSchema);
          terminal = true;
          if (!terminalData.ok) {
            terminalResult = {
              success: false,
              reason: "schema_violation",
              summary: terminalData.error,
              data: null,
              steps: step,
            };
          } else {
            terminalResult = {
              success: action.params.success,
              reason: action.params.success ? "completed" : "failed",
              summary: action.params.summary,
              data: terminalData.data,
              steps: step,
            };
          }
          break;
        }
      }

      if (terminal && terminalResult) {
        return terminalResult;
      }

      if (loopDetectionEnabled && actionResults.length > 0) {
        const loopFingerprint = buildLoopFingerprint(snapshot, actionResults);
        loopFingerprints.push(loopFingerprint);
        if (loopFingerprints.length > loopDetectionWindow) {
          loopFingerprints.shift();
        }
        if (isRepeatingLoop(loopFingerprints, loopDetectionWindow)) {
          return {
            success: false,
            reason: "loop_detected",
            summary: `Stopped after detecting a repeated action loop over ${loopDetectionWindow} steps.`,
            data: null,
            steps: step,
          };
        }
      }

      const stepFailed = actionResults.length > 0 && actionResults.every((result) => !result.ok);
      if (stepFailed) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxFailures) {
          const lastFailure = actionResults[actionResults.length - 1]?.message;
          const failureResult = buildMaxFailuresResult<TData>(maxFailures, lastFailure, step);

          if (!finalResponseAfterFailure || options.signal?.aborted) {
            return failureResult;
          }

          const recoveryResult = await tryFinalFailureRecovery<TData>({
            options,
            task: options.task,
            step,
            maxSteps,
            observation,
            tabs,
            activeTab: page.targetId,
            history: actionHistory.slice(-8),
            decisionTimeoutMs,
          });

          return recoveryResult ?? failureResult;
        }
      } else if (actionResults.length > 0 && consecutiveFailures > 0) {
        consecutiveFailures = 0;
      }

      if (decision.done) {
        const success = decision.success ?? true;
        return {
          success,
          reason: success ? "completed" : "failed",
          summary: decision.summary ?? "Agent signaled done.",
          data: null,
          steps: step,
        };
      }
    }

    return {
      success: false,
      reason: "max_steps",
      summary: `Exceeded max steps (${maxSteps}).`,
      data: null,
      steps: maxSteps,
    };
  } finally {
    if (ownsSession && session) {
      await session.close();
    }
  }
}

/**
 * Parses a model-proposed action against the canonical action schemas and
 * returns `null` for unknown or malformed payloads instead of throwing.
 */
function parseAction(name: string, input: unknown): Action | null {
  if (!isActionName(name)) return null;
  const schema = actionSchemas[name];
  const parsed = schema.safeParse(input);
  if (!parsed.success) return null;
  return { name, params: parsed.data } as Action;
}

function isActionName(name: string): name is ActionName {
  return name in actionSchemas;
}

async function checkInterrupt<TData>(
  options: AgentOptions<TData>,
  steps: number,
): Promise<AgentResult<TData> | null> {
  if (options.signal?.aborted) {
    return {
      success: false,
      reason: "aborted",
      summary: "Agent run aborted.",
      data: null,
      steps,
    };
  }

  if (!options.control) return null;
  if (options.control.signal.aborted) {
    return buildStoppedResult(options, steps);
  }

  await options.control.waitIfPaused();

  if (options.control.signal.aborted) {
    return buildStoppedResult(options, steps);
  }

  if (options.signal?.aborted) {
    return {
      success: false,
      reason: "aborted",
      summary: "Agent run aborted.",
      data: null,
      steps,
    };
  }

  return null;
}

function buildStoppedResult<TData>(
  options: AgentOptions<TData>,
  steps: number,
): AgentResult<TData> {
  const stopReason = options.control?.stopReason;
  return {
    success: false,
    reason: "stopped",
    summary: stopReason ? `Agent run stopped: ${stopReason}` : "Agent run stopped.",
    data: null,
    steps,
  };
}

function coerceActionTimeoutMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_ACTION_TIMEOUT_MS;
  }
  return value;
}

function coerceStepTimeoutMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_STEP_TIMEOUT_MS;
  }
  return value;
}

function coerceDecisionTimeoutMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_DECISION_TIMEOUT_MS;
  }
  return value;
}

function coerceMaxFailures(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return DEFAULT_MAX_FAILURES;
  }
  return Math.floor(value);
}

function coerceLoopDetectionWindow(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 2) {
    return DEFAULT_LOOP_DETECTION_WINDOW;
  }
  return Math.floor(value);
}

function buildLoopFingerprint(
  snapshot: Awaited<ReturnType<typeof serializePage>>,
  actionResults: Array<{ ok: boolean; message: string }>,
): string {
  const actionPart = actionResults
    .map((result) => `${result.ok ? "ok" : "fail"}:${result.message}`)
    .join("|");
  return `${snapshot.url}|${snapshot.title}|${snapshot.elements.length}|${actionPart}`;
}

function isRepeatingLoop(fingerprints: string[], window: number): boolean {
  if (fingerprints.length < window) return false;
  const first = fingerprints[0];
  if (!first) return false;
  return fingerprints.every((fingerprint) => fingerprint === first);
}

async function withRejectingTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Wraps a `decide` call in a timeout that aborts the underlying request via
 * AbortSignal so the SDK actually cancels its HTTP work instead of leaking a
 * background promise. Honors a parent signal too — if the run is aborted, the
 * decide call is also aborted.
 */
async function withDecideTimeout(
  decide: (input: DecisionInput, signal: AbortSignal) => Promise<Decision>,
  input: DecisionInput,
  timeoutMs: number,
  message: string,
  parentSignal?: AbortSignal,
): Promise<Decision> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort(parentSignal.reason);
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<Decision>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([decide(input, controller.signal), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (parentSignal) parentSignal.removeEventListener("abort", onParentAbort);
  }
}

async function executeActionWithTimeout(
  page: Page,
  action: Action,
  session: BrowserSession | undefined,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<ActionResult> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort(parentSignal.reason);
    else parentSignal.addEventListener("abort", onParentAbort, { once: true });
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      executeAction(page, action, session, controller.signal),
      new Promise<ActionResult>((resolve) => {
        timeout = setTimeout(() => {
          controller.abort();
          const message = `Action ${action.name} timed out after ${timeoutMs}ms`;
          resolve({
            ok: false,
            message,
            extractedContent: message,
            longTermMemory: `Timed out while running ${action.name}`,
          });
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (parentSignal) parentSignal.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Returns a single AbortSignal that fires when any of the given signals fires.
 * Returns undefined when all inputs are undefined to avoid allocating a
 * controller for the common case.
 */
function combineSignals(...signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const filtered = signals.filter((s): s is AbortSignal => Boolean(s));
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  const controller = new AbortController();
  for (const signal of filtered) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

interface StepContext {
  snapshot: Awaited<ReturnType<typeof serializePage>>;
  observation: string;
  tabs: string[];
}

async function buildStepContext(
  page: Page,
  session: BrowserSession | undefined,
): Promise<StepContext> {
  await page.waitForStablePage(3_000).catch(() => {
    // continue even if stabilization timed out
  });

  const snapshot = await serializePage(page);
  const pending = await page.getPendingNetworkRequests(5).catch(() => []);
  const pendingSummary =
    pending.length === 0
      ? "PENDING REQUESTS: none"
      : `PENDING REQUESTS (${pending.length}):\n${pending
          .map((req) => `- ${req.method} ${req.resourceType} ${req.loadingDurationMs}ms ${req.url}`)
          .join("\n")}`;
  const observation = `${formatSnapshotForLLM(snapshot)}\n${pendingSummary}`;
  const tabs = session ? await session.listPageTargetIds() : [page.targetId];

  return { snapshot, observation, tabs };
}

async function tryFinalFailureRecovery<TData>(input: {
  options: AgentOptions<TData>;
  task: string;
  step: number;
  maxSteps: number;
  observation: string;
  tabs: string[];
  activeTab: string;
  history: Array<{ action: string; result: string }>;
  decisionTimeoutMs: number;
}): Promise<AgentResult<TData> | null> {
  try {
    const decision = await withDecideTimeout(
      input.options.decide,
      {
        task: input.task,
        step: input.step,
        maxSteps: input.maxSteps,
        observation:
          `${input.observation}\n\nFINAL RECOVERY: The agent reached its consecutive failure limit. ` +
          `Return a done action or done=true summary only; do not request more browser actions.`,
        tabs: input.tabs,
        activeTab: input.activeTab,
        history: input.history,
      },
      input.decisionTimeoutMs,
      `Model decision timed out after ${input.decisionTimeoutMs}ms`,
      combineSignals(input.options.signal, input.options.control?.signal),
    );

    const doneAction = decision.actions
      ?.map((rawAction) => parseAction(rawAction.name, rawAction.params))
      .find((action): action is Extract<Action, { name: "done" }> => action?.name === "done");

    if (doneAction) {
      const terminalData = buildTerminalData(doneAction.params.data, input.options.outputSchema);
      if (!terminalData.ok) {
        return {
          success: false,
          reason: "schema_violation",
          summary: terminalData.error,
          data: null,
          steps: input.step,
        };
      }
      return {
        success: doneAction.params.success,
        reason: doneAction.params.success ? "completed" : "failed",
        summary: doneAction.params.summary,
        data: terminalData.data,
        steps: input.step,
      };
    }

    if (decision.done) {
      const success = decision.success ?? false;
      return {
        success,
        reason: success ? "completed" : "failed",
        summary: decision.summary ?? "Agent stopped after repeated failures.",
        data: null,
        steps: input.step,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function buildMaxFailuresResult<TData>(
  maxFailures: number,
  lastFailureMessage: string | undefined,
  steps: number,
): AgentResult<TData> {
  return {
    success: false,
    reason: "max_failures",
    summary: `Stopped after ${maxFailures} consecutive failed step${maxFailures === 1 ? "" : "s"}: ${lastFailureMessage ?? "unknown failure"}`,
    data: null,
    steps,
  };
}

function buildTerminalData<TData>(
  explicitData: unknown,
  outputSchema: AgentOptions<TData>["outputSchema"],
): { ok: true; data: TData | null } | { ok: false; error: string } {
  if (explicitData !== undefined) {
    if (!outputSchema) return { ok: true, data: explicitData as TData };
    const parsed = outputSchema.safeParse(explicitData);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Terminal data failed output schema validation: ${parsed.error.message}`,
      };
    }
    return { ok: true, data: parsed.data };
  }
  return { ok: true, data: null };
}

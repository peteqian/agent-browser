import type { Action } from "../actions/types";
import type { LaunchOptions } from "../cdp/launch";
import type { BrowserSession, Page } from "../browser/session";
import type { z } from "zod";

/**
 * Public contract types shared with browser-agent consumers.
 *
 * Downstream packages should import these shapes from `@jobseeker/browser-agent`
 * instead of redefining them locally so the package boundary can move without
 * breaking the integration contract.
 */

/** Snapshot of what the deciding model sees for one loop iteration. */
export interface DecisionInput {
  task: string;
  step: number;
  maxSteps: number;
  observation: string;
  tabs: string[];
  activeTab: string;
  history: Array<{ action: string; result: string }>;
}

/** Raw model-proposed action before schema parsing and execution. */
export interface RawAction {
  name: string;
  params: unknown;
}

/** Structured model output consumed by `runAgent`. */
export interface Decision {
  thought?: string;
  actions: RawAction[];
  done: boolean;
  summary?: string;
  success?: boolean;
}

/** Durable execution record for one action step. */
export interface StepInfo {
  step: number;
  url: string;
  action: Action;
  result: { ok: boolean; message: string };
}

/** Terminal summary returned by the browser-agent loop. */
export interface AgentResult<TData = unknown> {
  success: boolean;
  summary: string;
  data: TData | null;
  steps: number;
}

/**
 * Decide function signature.
 *
 * The loop passes an `AbortSignal` that fires when the per-decision timeout
 * elapses or when the run is aborted/stopped. Adapters should forward the
 * signal to their underlying SDK call (HTTP cancel, subprocess kill, etc.) so
 * timed-out work actually stops instead of running orphaned.
 */
export type DecideFn = (input: DecisionInput, signal: AbortSignal) => Promise<Decision>;

/** Runtime control surface for externally managed agent runs. */
export interface AgentControl {
  readonly signal: AbortSignal;
  readonly isPaused: boolean;
  readonly stopReason?: string;
  pause: () => void;
  resume: () => void;
  stop: (reason?: string) => void;
  waitIfPaused: () => Promise<void>;
}

/**
 * Input contract for running the browser-agent loop against either owned or
 * caller-supplied browser/page handles.
 */
export interface AgentOptions<TData = unknown> {
  task: string;
  decide: DecideFn;
  outputSchema?: z.ZodType<TData>;
  maxSteps?: number;
  stepTimeoutMs?: number;
  actionTimeoutMs?: number;
  decisionTimeoutMs?: number;
  /**
   * Maximum consecutive failed steps before the loop terminates. Values < 1
   * are coerced to the default (5); there is no "disabled" mode — pass a very
   * large number if you need to effectively disable this limit.
   */
  maxFailures?: number;
  finalResponseAfterFailure?: boolean;
  loopDetectionEnabled?: boolean;
  loopDetectionWindow?: number;
  /**
   * Cooperative control surface (pause/resume/stop). When set, the loop checks
   * `control.signal` and `control.waitIfPaused()` in addition to `signal`.
   * Both are honored; either aborting terminates the run. Use `control` for
   * interactive UIs and `signal` for plain cancellation.
   */
  control?: AgentControl;
  signal?: AbortSignal;
  launch?: LaunchOptions;
  startUrl?: string;
  page?: Page;
  session?: BrowserSession;
  onStep?: (info: StepInfo) => void;
}

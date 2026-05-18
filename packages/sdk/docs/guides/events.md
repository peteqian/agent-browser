# Event stream

Every `runAgent()` invocation can be observed via the `onEvent` callback. Events fire in order; async callbacks are awaited before the loop continues.

## Event types

```ts
type AgentEvent<TData = unknown> =
  | { type: "transport_resolved"; resolution: TransportResolution }
  | { type: "decision"; step: number; decision: Decision }
  | {
      type: "action";
      step: number;
      url: string;
      action: Action;
      result: { ok: boolean; message: string };
    }
  | { type: "terminal"; result: AgentResult<TData> };
```

## Order

```
transport_resolved   (once, only if transportResolution passed)
                          │
                          ▼
   ┌──────────────────────────────────────┐
   │ for each step:                       │
   │   decision                           │
   │   action × N (one per decision.actions[]) │
   └──────────────────────────────────────┘
                          │
                          ▼
   terminal               (always last)
```

## Examples

### Aggregate token usage

```ts
let totalIn = 0;
let totalOut = 0;

await runAgent({
  task: "...",
  decide,
  onEvent: (event) => {
    if (event.type === "decision" && event.decision.telemetry?.usage) {
      totalIn += event.decision.telemetry.usage.inputTokens;
      totalOut += event.decision.telemetry.usage.outputTokens;
    }
  },
});

console.log({ totalIn, totalOut });
```

### Stream to SSE

```ts
import type { Response } from "express";

function streamRun(res: Response, task: string) {
  res.setHeader("content-type", "text/event-stream");
  return runAgent({
    task,
    decide,
    onEvent: async (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  });
}
```

The loop awaits the callback — backpressure is honored.

### Build a transcript

```ts
const transcript: string[] = [];

await runAgent({
  task,
  decide,
  onEvent: (event) => {
    if (event.type === "action") {
      transcript.push(`[${event.step}] ${event.action.name} → ${event.result.message}`);
    }
  },
});
```

## Legacy `onStep`

`onStep(info: StepInfo)` still exists for back-compat — fires once per executed action. Prefer `onEvent` for new code: it carries decision and terminal events too.

## Terminal result

```ts
type AgentResult<TData> = {
  success: boolean;
  reason: TerminalReason; // "done" | "max_steps" | "max_failures" | "step_timeout" | "schema_violation" | "aborted" | "loop_detected"
  summary: string | null;
  data: TData | null;
  steps: number;
};
```

The `terminal` event always fires, even on failure or abort, so consumers can rely on a final-state notification.

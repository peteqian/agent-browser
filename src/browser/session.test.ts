import { describe, expect, test } from "bun:test";

import type { BrowserEvent } from "./events";
import { BrowserEventBus } from "./events";
import { BrowserSession, Page } from "./session";

function createNavigationPage(options: {
  finalUrl?: string;
  readyState?: string;
  navigate?: () => Promise<unknown> | unknown;
}): { page: Page; events: BrowserEvent[] } {
  const eventBus = new BrowserEventBus();
  const events: BrowserEvent[] = [];
  eventBus.on((event) => {
    events.push(event);
  });

  const session = {
    eventBus,
    sendToTarget: async (_targetId: string, method: string, params?: Record<string, unknown>) => {
      if (method === "Page.navigate") return options.navigate?.() ?? {};
      if (method !== "Runtime.evaluate") {
        throw new Error(`Unexpected method: ${method}`);
      }

      const expression = String(params?.expression ?? "");
      if (expression === "document.readyState") {
        return { result: { value: options.readyState ?? "complete" } };
      }
      if (expression === "location.href") {
        return { result: { value: options.finalUrl ?? "about:blank" } };
      }
      throw new Error(`Unexpected expression: ${expression}`);
    },
  } as unknown as BrowserSession;

  return { page: new Page(session, "page-1"), events };
}

describe("Page navigation watchdog", () => {
  test("emits navigation_watchdog event for health-checked navigation", async () => {
    const { page, events } = createNavigationPage({});
    const result = await page.navigateWithHealthCheck("about:blank");

    expect(result.ok).toBe(true);
    expect(result.status).toBe("loaded");
    expect(result.finalUrl).toBe("about:blank");

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "browser_event",
      name: "navigation_watchdog",
      targetId: "page-1",
      data: result,
    });
  });

  test("returns and emits cdp_error health when navigation fails", async () => {
    const { page, events } = createNavigationPage({
      readyState: "loading",
      navigate: () => {
        throw new Error("CDP error -32000: cannot navigate");
      },
    });
    const result = await page.navigateWithHealthCheck("https://example.com/");

    expect(result.ok).toBe(false);
    expect(result.status).toBe("cdp_error");
    expect(result.warning).toContain("cannot navigate");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "browser_event",
      name: "navigation_watchdog",
      targetId: "page-1",
      data: result,
    });
  });
});

describe("BrowserSession reconnect watchdog", () => {
  test("emits cdp_reconnect_failed when reconnect is disabled", async () => {
    const session = new BrowserSession({
      profile: { cdpUrl: "ws://127.0.0.1:1/devtools/browser/test", reconnectOnDisconnect: false },
    });
    const events: BrowserEvent[] = [];
    session.eventBus.on((event) => {
      events.push(event);
    });

    await (session as unknown as { reconnectIfNeeded: () => Promise<void> }).reconnectIfNeeded();

    expect(events).toContainEqual({
      type: "browser_event",
      name: "cdp_reconnect_failed",
      data: { reason: "reconnect_disabled", maxAttempts: 6 },
    });
  });

  test("emits reconnect attempt and failure events after exhausting attempts", async () => {
    const session = new BrowserSession({
      profile: {
        cdpUrl: "ws://127.0.0.1:1/devtools/browser/test",
        reconnectMaxAttempts: 1,
        reconnectBaseDelayMs: 1,
        reconnectMaxDelayMs: 1,
      },
    });
    const events: BrowserEvent[] = [];
    session.eventBus.on((event) => {
      events.push(event);
    });

    await (session as unknown as { reconnectIfNeeded: () => Promise<void> }).reconnectIfNeeded();

    const browserEvents = events.filter((event) => event.type === "browser_event");
    expect(browserEvents).toContainEqual({
      type: "browser_event",
      name: "cdp_reconnect_started",
      data: { maxAttempts: 1, managedLocal: false },
    });
    expect(browserEvents).toContainEqual({
      type: "browser_event",
      name: "cdp_reconnect_attempt",
      data: { attempt: 1, maxAttempts: 1, managedLocal: false },
    });
    expect(browserEvents.some((event) => event.name === "cdp_reconnect_attempt_failed")).toBe(true);
    expect(browserEvents).toContainEqual({
      type: "browser_event",
      name: "cdp_reconnect_failed",
      data: { reason: "max_attempts_exhausted", maxAttempts: 1 },
    });
  });
});

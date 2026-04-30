# Local Session Lifecycle

Status: PARTIAL. Launch listener warning is fixed; load this file for session lifecycle or CDP disconnect work.

## Goal

Make local Chrome sessions reliable enough for long-running agent tasks.

## Features

- [x] Avoid accumulating Chrome process `exit` listeners while waiting for the DevTools endpoint.
- Explicit session start/stop lifecycle.
- Browser process ownership tracking.
- Remote CDP attach mode that never assumes process ownership.
- Profile directory support.
- Graceful teardown that preserves user-owned sessions.
- Reconnect or fail-fast behavior when CDP disconnects.

## Completed

- 2026-04-30: Fixed `src/cdp/launch.ts` polling so it uses the existing terminal-state listener instead of registering a new `exit` listener every 120ms; CLI smoke test no longer emits `MaxListenersExceededWarning`.

## Acceptance Criteria

- [x] Launch polling does not produce listener leak warnings during normal CLI runs.
- Local launched browsers are cleaned up by default.
- Attached remote browsers are not killed by teardown.
- Disconnects produce typed browser errors.

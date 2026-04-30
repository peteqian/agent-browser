# Watchdogs

Status: BACKLOG. Skip unless adding modular local browser watchdogs.

## Goal

Add small local watchdogs that improve reliability without turning the runtime into a hosted platform.

## Candidate Watchdogs

- Crash watchdog: detect closed targets or dead websocket.
- Popup watchdog: surface or close unexpected popups based on policy.
- Download watchdog: detect new downloaded files and attach them to action results.
- Permission watchdog: grant configured local permissions.
- Storage watchdog: save and restore local storage/cookies when configured.
- Screenshot watchdog: capture screenshots for step history.
- Navigation watchdog: detect stalled page loads and network idle timeouts.

## Excluded Watchdogs

- Cloud CAPTCHA solver watchdog.
- Proxy rotation watchdog.
- Hosted anti-bot/stealth watchdog.

## Acceptance Criteria

- Watchdogs are modular and optional.
- Watchdog events are reflected in step results or browser state.
- Failures are observable but do not crash unrelated agent logic.

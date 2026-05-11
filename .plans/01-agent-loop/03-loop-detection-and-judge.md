# Loop Detection And Judge

Status: PARTIAL. Hard repeated-loop termination exists; loop nudges and optional final judging remain backlog.

## Goal

Detect repeated unproductive behavior and optionally validate final answers.

## Loop Detection

- Hash actions by normalized action name and important params.
- Track lightweight page fingerprints: URL, element count, and DOM text hash.
- Inject nudges when action repetition or page stagnation crosses thresholds.
- Do not block repeated actions automatically; inform the LLM and let it choose.

## Completed

- Repeated action/page fingerprints can stop the loop deterministically through `AgentOptions.loopDetectionEnabled` and `AgentOptions.loopDetectionWindow`.

## Judge

- Add an optional local judge step for final answer validation.
- Support simple criteria strings before adding a second model abstraction.
- Record judge output in `AgentResult` or trajectory metadata.

## Acceptance Criteria

- Repeated clicks/searches/scrolls produce a nudge in context when strict termination is not desired.
- Judge can be disabled by default.
- Judge does not require a cloud service.

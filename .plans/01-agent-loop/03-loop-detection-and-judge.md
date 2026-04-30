# Loop Detection And Judge

Status: BACKLOG. Skip unless implementing loop detection, page fingerprints, or final-answer judging.

## Goal

Detect repeated unproductive behavior and optionally validate final answers.

## Loop Detection

- Hash actions by normalized action name and important params.
- Track lightweight page fingerprints: URL, element count, and DOM text hash.
- Inject nudges when action repetition or page stagnation crosses thresholds.
- Do not block repeated actions automatically; inform the LLM and let it choose.

## Judge

- Add an optional local judge step for final answer validation.
- Support simple criteria strings before adding a second model abstraction.
- Record judge output in `AgentResult` or trajectory metadata.

## Acceptance Criteria

- Repeated clicks/searches/scrolls produce a nudge in context.
- Judge can be disabled by default.
- Judge does not require a cloud service.

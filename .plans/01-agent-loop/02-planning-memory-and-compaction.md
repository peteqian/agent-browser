# Planning Memory And Compaction

Status: BACKLOG. Skip unless implementing planning, memory, or message compaction.

## Goal

Keep long tasks coherent without letting prompt history grow without bounds.

## Features

- Optional task plan stored in agent state.
- Replan nudges after repeated stalls or failed actions.
- Short-term memory from recent action results.
- Long-term task memory from compaction summaries.
- Message compaction after configurable step or character thresholds.

## Design Notes

- Compaction should be local to the agent loop and not require external storage.
- Summaries should preserve current task, completed work, open blockers, known page state, and sensitive-data redactions.
- The raw trajectory should remain available when requested by callers.

## Acceptance Criteria

- Long runs do not grow prompts linearly forever.
- Compacted summaries are visible in trajectory/debug output.
- Existing short examples behave the same when compaction is disabled.

# DOM Snapshot Enrichment

Status: BACKLOG. Skip unless changing DOM serialization, element indexes, or prompt budgets.

## Goal

Improve page understanding while keeping DOM serialization fast and bounded.

## Features

- Use CDP DOMSnapshot data where available for bounds, visibility, and clickability.
- Normalize coordinates to CSS pixels.
- Track stable element indexes for current page state.
- Include only useful computed styles: display, visibility, opacity, pointer-events, cursor, overflow, position.
- Enforce max serialized text and clickable element budgets.

## Performance Rules

- Build lookup maps once per snapshot.
- Avoid O(n²) node scans.
- Prefer explicit budgets over serializing entire pages.

## Acceptance Criteria

- Agent prompts include concise interactive element lists.
- Element indexes map back to executable actions for the current snapshot.
- Heavy pages do not produce unbounded context.

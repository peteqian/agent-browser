# Observability And Privacy

Status: PARTIAL. CLI verbose JSONL is done; broader local logs/redaction/artifact privacy remain backlog.

## Goal

Make failures debuggable while preserving local-first privacy.

## Features

- Structured local logs.
- Optional trajectory export.
- Optional token/cost accounting if model calls expose usage.
- Redaction utilities for sensitive values.
- Debug-level CDP event tracing behind explicit flags.

## Privacy Rules

- No telemetry leaves the machine by default.
- Sensitive data should be redacted from logs and trajectories.
- Artifact paths should be explicit when artifacts may contain page content.

## Acceptance Criteria

- Users can debug failures from local artifacts.
- Default runs do not create external telemetry events.

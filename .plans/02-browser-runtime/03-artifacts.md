# Local Artifacts

Status: PARTIAL. Screenshot, PDF, and download file artifacts exist; trajectory, HAR, and replay artifacts remain backlog.

## Goal

Support local debugging artifacts for replay and diagnosis.

## Features

- Screenshot capture per step.
- Optional HAR capture if CDP support is practical.
- Optional video or screencast capture if low-complexity.
- Download tracking with output paths.
- Conversation and trajectory export.

## Completed

- Screenshot action can return base64 PNG or save a PNG file.
- PDF action can save the current page as a local file.
- Download watchdog can save downloads to an explicit `downloadsDir` and emits completed file paths.

## Rules

- Artifacts stay local.
- Paths are caller-configurable.
- Defaults should not create large files unexpectedly.

## Acceptance Criteria

- Example agent run can emit a replayable trajectory and screenshots.
- Artifact creation can be disabled.

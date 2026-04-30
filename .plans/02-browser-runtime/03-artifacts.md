# Local Artifacts

Status: BACKLOG. Skip unless adding screenshots, HAR, video, downloads, trajectory, or replay artifacts.

## Goal

Support local debugging artifacts for replay and diagnosis.

## Features

- Screenshot capture per step.
- Optional HAR capture if CDP support is practical.
- Optional video or screencast capture if low-complexity.
- Download tracking with output paths.
- Conversation and trajectory export.

## Rules

- Artifacts stay local.
- Paths are caller-configurable.
- Defaults should not create large files unexpectedly.

## Acceptance Criteria

- Example agent run can emit a replayable trajectory and screenshots.
- Artifact creation can be disabled.

# Action Registry

Status: BACKLOG. Skip unless replacing fixed actions with registry-based built-ins or custom actions.

## Goal

Move from a fixed action surface to a registry that can expose built-ins, custom actions, and page-filtered actions.

## Built-In Actions

- Navigate.
- Go back.
- Wait.
- Click by element index.
- Type text.
- Press keys.
- Scroll page or element.
- Switch tab.
- Close tab.
- Upload file.
- Screenshot.
- Extract page content.
- Done.

## Extensions

- Custom action registration with a description and zod schema.
- Page-specific filtering by URL/domain.
- Action result metadata for coordinates, downloads, and new tabs.
- Optional coordinate click support behind an explicit option.

## Acceptance Criteria

- Built-ins remain available through current entry points.
- Custom actions can be registered without editing the agent loop.
- Invalid action params fail with typed errors before CDP execution.

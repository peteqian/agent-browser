# Action Registry

Status: PARTIAL. Built-in and custom action registration exists; remaining work is safer action semantics and page-specific filtering.

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

## Completed

- Built-in actions are registered through `ActionRegistry`.
- Custom actions can be provided through `AgentOptions.actions`.
- Invalid action params fail schema parsing before CDP execution.

## Acceptance Criteria

- [x] Built-ins remain available through current entry points.
- [x] Custom actions can be registered without editing the agent loop.
- [x] Invalid action params fail before CDP execution.
- Page-specific filtering prevents unavailable actions from entering prompts.

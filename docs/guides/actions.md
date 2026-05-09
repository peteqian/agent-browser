# Action vocabulary

The LLM picks from a fixed menu of 24 named actions defined in `src/actions/types.ts`. Each is zod-validated at execution time.

## Navigation

| Name         | Params           | What                    |
| ------------ | ---------------- | ----------------------- |
| `navigate`   | `url`, `newTab?` | `Page.navigate` via CDP |
| `go_back`    | –                | History back            |
| `go_forward` | –                | History forward         |
| `refresh`    | –                | Reload                  |

## Tabs

| Name         | Params                   | What            |
| ------------ | ------------------------ | --------------- |
| `new_tab`    | `url?`                   | Create target   |
| `switch_tab` | `targetId?` OR `pageId?` | Activate target |
| `close_tab`  | `targetId?` OR `pageId?` | Close target    |

## Browser lifecycle

| Name            | Params | What                                          |
| --------------- | ------ | --------------------------------------------- |
| `close_browser` | –      | Close the browser session and end the run     |

## Input

| Name            | Params                                                          | What                                                              |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `click`         | `index?` OR `coordinateX+Y`                                     | Click DOM element by serialized index, or by absolute coordinates |
| `type`          | `index`, `text`, `submit?`                                      | Focus + insertText. `submit:true` sends Enter                     |
| `send_keys`     | `keys`                                                          | Raw key combos: `Control+A`, `Tab`, `Enter`                       |
| `select_option` | `index`, `value`                                                | Set `<select>` value                                              |
| `upload_file`   | `index`, `paths[]`                                              | `DOM.setFileInputFiles`                                           |
| `scroll`        | `direction` (up/down/top/bottom), `amount?`, `pages?`, `index?` | Wheel or scrollTo                                                 |

## Waiting

| Name            | Params                      | What              |
| --------------- | --------------------------- | ----------------- |
| `wait`          | `ms` (≤10s)                 | Sleep             |
| `wait_for_text` | `text`, `timeoutMs?` (≤30s) | Poll DOM for text |

## Reading

| Name                   | Params                                                                             | What                             |
| ---------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `search_page`          | `pattern`, `regex?`, `caseSensitive?`, `contextChars?`, `cssScope?`, `maxResults?` | Text search w/ context           |
| `find_text`            | `text`                                                                             | Locate text on page              |
| `find_elements`        | `selector`, `attributes?`, `maxResults?`, `includeText?`                           | CSS selector query               |
| `get_dropdown_options` | `index`                                                                            | List `<option>`s of a `<select>` |
| `extract_content`      | `query`, `extractLinks?`, `extractImages?`, `startFromChar?`, `maxChars?`          | Pull structured content          |

## Capture

| Name          | Params                                                                  | What              |
| ------------- | ----------------------------------------------------------------------- | ----------------- |
| `screenshot`  | `fileName?`                                                             | PNG of viewport   |
| `save_as_pdf` | `fileName?`, `printBackground?`, `landscape?`, `scale?`, `paperFormat?` | `Page.printToPDF` |

## Terminal

| Name   | Params                        | What                                                           |
| ------ | ----------------------------- | -------------------------------------------------------------- |
| `done` | `success`, `summary`, `data?` | Ends loop. `data` validated against `outputSchema` if provided |

## Click modes

- **Index-based** — preferred. The page snapshot tags clickable elements with integer indices. The model picks one.
- **Coordinate-based** — fallback for canvas / non-DOM elements. Both `coordinateX` and `coordinateY` required.

## Error handling

A failed action returns `{ ok: false, message }`. The loop counts it as a failure and increments the consecutive-failure counter; the model gets the failure message in the next observation. Three forms of failure:

1. zod validation error on params (model sent the wrong shape).
2. CDP error (element not found, navigation failed, etc.).
3. Timeout — controlled by `actionTimeoutMs`.

If consecutive failures hit `maxFailures` (default 5), the loop terminates with `reason: "max_failures"`.

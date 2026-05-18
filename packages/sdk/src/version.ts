/**
 * Build-time-injected package identity.
 *
 * `__PACKAGE_VERSION__` and `__PACKAGE_NAME__` are replaced with string
 * literals by tsup's `define` (see `tsup.config.ts`). The `typeof` guards
 * keep dev + test (where the bundler isn't running) from hitting a
 * `ReferenceError` — they fall through to a literal default that matches
 * the published name.
 */
declare const __PACKAGE_VERSION__: string;
declare const __PACKAGE_NAME__: string;

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "0.0.0-dev";

export const PACKAGE_NAME: string =
  typeof __PACKAGE_NAME__ !== "undefined" ? __PACKAGE_NAME__ : "@peteqian/browser-agent-sdk";

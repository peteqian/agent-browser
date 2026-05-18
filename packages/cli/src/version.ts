/**
 * Build-time-injected package identity. See `packages/sdk/src/version.ts`
 * for the rationale.
 */
declare const __PACKAGE_VERSION__: string;
declare const __PACKAGE_NAME__: string;

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "0.0.0-dev";

export const PACKAGE_NAME: string =
  typeof __PACKAGE_NAME__ !== "undefined" ? __PACKAGE_NAME__ : "@peteqian/browser-agent";

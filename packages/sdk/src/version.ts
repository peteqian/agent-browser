import packageJson from "../package.json" with { type: "json" };

/**
 * Single source of truth for the package version. Imported anywhere the
 * package needs to identify itself — MCP server handshake, CLI --version,
 * telemetry headers.
 *
 * tsup bundles package.json inline at build time so consumers don't pay
 * a runtime filesystem read.
 */
export const VERSION: string = packageJson.version;
export const PACKAGE_NAME: string = packageJson.name;

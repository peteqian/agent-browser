import packageJson from "../package.json" with { type: "json" };

export const VERSION: string = packageJson.version;
export const PACKAGE_NAME: string = packageJson.name;

import { describe, expect, test } from "bun:test";

import { startFixtureServer, DEFAULT_FIXTURES } from "./fixtureServer";

describe("fixture server", () => {
  test("serves the default upload fixture with a hidden file input", async () => {
    const server = await startFixtureServer();
    try {
      const res = await fetch(`${server.url}/upload`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('type="file"');
      expect(body).toContain('id="trigger"');
    } finally {
      await server.stop();
    }
  });

  test("returns 404 for unknown paths", async () => {
    const server = await startFixtureServer();
    try {
      const res = await fetch(`${server.url}/missing`);
      expect(res.status).toBe(404);
    } finally {
      await server.stop();
    }
  });

  test("includes the auth new-tab fixture", () => {
    expect(DEFAULT_FIXTURES["/auth-newtab"]).toContain('target="_blank"');
  });
});

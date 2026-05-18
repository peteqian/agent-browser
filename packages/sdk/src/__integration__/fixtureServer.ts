/**
 * Minimal HTTP server for browser integration tests. Serves a fixed map
 * of path -> HTML string from `127.0.0.1` on a random port so multiple
 * tests can run concurrently. Tests should always call `stop()` in a
 * `finally` block.
 */

export interface FixtureServer {
  url: string;
  stop: () => Promise<void>;
}

export interface FixturePages {
  [path: string]: string;
}

export const DEFAULT_FIXTURES: FixturePages = {
  "/empty": `<!doctype html><meta charset="utf-8"><title>Empty</title>`,
  "/form": `<!doctype html><meta charset="utf-8"><title>Form</title>
    <form id="f">
      <input id="user" name="user" autocomplete="off">
      <input id="pass" name="pass" type="password" autocomplete="off">
      <button type="submit">Submit</button>
    </form>`,
  "/upload": `<!doctype html><meta charset="utf-8"><title>Upload</title>
    <form id="f" enctype="multipart/form-data">
      <input id="file" type="file" style="display:none">
      <button type="button" id="trigger">Choose file</button>
      <span id="picked"></span>
    </form>
    <script>
      const file = document.getElementById('file');
      const picked = document.getElementById('picked');
      file.addEventListener('change', () => {
        picked.textContent = Array.from(file.files).map(f => f.name).join(',');
      });
    </script>`,
  "/auth-newtab": `<!doctype html><meta charset="utf-8"><title>Login</title>
    <a id="oauth" href="/oauth" target="_blank">Continue with OAuth</a>`,
  "/oauth": `<!doctype html><meta charset="utf-8"><title>OAuth</title><h1>OAuth provider</h1>`,
  "/paginated": `<!doctype html><meta charset="utf-8"><title>List</title>
    <ul><li>Alpha</li><li>Beta</li><li>Gamma</li><li>Delta</li></ul>`,
};

export async function startFixtureServer(
  pages: FixturePages = DEFAULT_FIXTURES,
): Promise<FixtureServer> {
  // Bun is the test runtime. Use its built-in server.
  const bunGlobal = (globalThis as unknown as { Bun?: { serve: (cfg: unknown) => unknown } }).Bun;
  if (!bunGlobal || typeof bunGlobal.serve !== "function") {
    throw new Error("startFixtureServer requires the Bun runtime");
  }
  const server = bunGlobal.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req: Request): Response {
      const url = new URL(req.url);
      const body = pages[url.pathname];
      if (body === undefined) {
        return new Response("not found", { status: 404 });
      }
      return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
    },
  }) as { port: number; hostname: string; stop: (closeActive?: boolean) => Promise<void> };

  return {
    url: `http://${server.hostname}:${server.port}`,
    stop: async () => {
      await server.stop(true);
    },
  };
}

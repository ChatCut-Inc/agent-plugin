import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const helpers = [
  "claude/skills/asset-import/scripts/serve-local-media.mjs",
  "codex/skills/asset-import/scripts/serve-local-media.mjs",
  "grok/skills/asset-import/scripts/serve-local-media.mjs",
  "kimi/skills/chatcut-media-guide/scripts/serve-local-media.mjs",
];
const origin = "https://app.chatcut.io";
const content = "0123456789";
const filename = "clip 日本語 #?%.mp4";

function get(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, path, ...options }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString(),
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function startHelper(t, helper, paths, ttl = "30") {
  const child = spawn(process.execPath, [
    fileURLToPath(new URL(`../${helper}`, import.meta.url)),
    "--ttl", ttl,
    "--origin", origin,
    ...paths,
  ], { stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  });
  const lines = createInterface({ input: child.stdout });
  try {
    const [line] = await once(lines, "line", { signal: AbortSignal.timeout(10_000) });
    return { child, output: JSON.parse(line) };
  } finally {
    lines.close();
  }
}

for (const helper of helpers) {
  test(helper, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), "chatcut-local-media-test-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const path = join(dir, filename);
    await writeFile(path, content);
    await writeFile(join(dir, "not-allowed.mp4"), "private");
    const { output } = await startHelper(t, helper, [path]);
    const encoded = encodeURIComponent(filename);
    const legacyToken = randomBytes(16).toString("base64url");

    await t.test("emits a public compatibility prefix and compatible metadata", async () => {
      assert.equal(output.token, "chatcut-local-media-v1");
      assert.equal(output.origin, origin);
      assert.equal(output.ttlSeconds, 30);
      assert.equal(output.files[filename], `http://127.0.0.1:${output.port}/${output.token}/${encoded}`);
      // This is the path shape required by existing editor/MCP validators.
      assert.match(new URL(output.files[filename]).pathname, /^\/[A-Za-z0-9_-]{20,}\/[^/]+$/);
      assert.equal((await get(output.port, new URL(output.files[filename]).pathname)).body, content);
      assert.equal(output.imports.length, 1);
      assert.deepEqual(output.imports[0], {
        action: "from_editor",
        assetId: output.imports[0].assetId,
        filename,
        sizeBytes: content.length,
        url: output.files[filename],
      });
      assert.match(output.imports[0].assetId, /^[0-9a-f-]{36}$/);
    });

    for (const prefix of ["", `${output.token}/`, `${legacyToken}/`, "abcdefghijklmnopqrstuvwxyz/", "/"]) {
      await t.test(`serves the allowlisted file with prefix ${JSON.stringify(prefix)}`, async () => {
        const res = await get(output.port, `/${prefix}${encoded}`, { headers: { Origin: origin } });
        assert.equal(res.status, 200);
        assert.equal(res.body, content);
        assert.equal(res.headers["access-control-allow-origin"], origin);
      });

      await t.test(`resumes downloads with prefix ${JSON.stringify(prefix)}`, async () => {
        const res = await get(output.port, `/${prefix}${encoded}`, { headers: { Range: "bytes=4-" } });
        assert.equal(res.status, 206);
        assert.equal(res.headers["content-range"], "bytes 4-9/10");
        assert.equal(res.body, "456789");
      });
    }

    await t.test("keeps the file allowlist for new and legacy paths", async () => {
      for (const path of [
        "/not-allowed.mp4",
        `/${legacyToken}/not-allowed.mp4`,
        "/%2e%2e%2fnot-allowed.mp4",
        `/${legacyToken}/%2e%2e%2f${encoded}`,
        `/nested/path/${encoded}`,
      ]) {
        assert.equal((await get(output.port, path)).status, 404, path);
      }
    });

    await t.test("rejects other origins on both URL formats", async () => {
      for (const path of [`/${encoded}`, `/${legacyToken}/${encoded}`]) {
        assert.equal((await get(output.port, path, { headers: { Origin: "https://example.com" } })).status, 403);
      }
    });

    await t.test("preserves preflight, method, and malformed URL handling", async () => {
      const preflight = await get(output.port, `/${encoded}`, { method: "OPTIONS", headers: { Origin: origin } });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers["access-control-allow-private-network"], "true");
      assert.equal((await get(output.port, `/${encoded}`, { method: "POST" })).status, 405);
      assert.equal((await get(output.port, "/%ZZ")).status, 400);
    });

    await t.test("preserves range boundaries", async () => {
      const fromStart = await get(output.port, `/${encoded}`, { headers: { Range: "bytes=0-" } });
      assert.equal(fromStart.status, 206);
      assert.equal(fromStart.body, content);
      const pastEnd = await get(output.port, `/${encoded}`, { headers: { Range: "bytes=10-" } });
      assert.equal(pastEnd.status, 416);
      assert.equal(pastEnd.headers["content-range"], "bytes */10");
    });

    await t.test("still exits after the configured TTL", async (t) => {
      const { child } = await startHelper(t, helper, [path], "0.2");
      const [code] = await once(child, "exit", { signal: AbortSignal.timeout(5_000) });
      assert.equal(code, 0);
    });
  });
}

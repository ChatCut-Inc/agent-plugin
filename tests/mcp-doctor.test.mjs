import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  collectHostLogs,
  fragmentEvents,
  probeMetadata,
  redact,
  runDoctor,
  serverUrl,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";

async function temporary(t) {
  const path = await mkdtemp(join(tmpdir(), "chatcut-mcp-doctor-test-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

async function listen(t, server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

const noLogs = async () => ({ entries: [], gaps: [{ reason: "fixture_no_logs" }] });

test("real HTTP 200 with malformed chunk framing remains a body failure with its original cause", async (t) => {
  const server = createTcpServer((socket) => {
    socket.once("data", () =>
      socket.end(
        'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n{"issuer":"fixture"}',
      ),
    );
    socket.on("error", () => {});
  });
  const origin = await listen(t, server);
  const result = await probeMetadata(`${origin}/.well-known/oauth-authorization-server`, "fixture");
  assert.equal(result.status, 200);
  assert.equal(result.bodyComplete, false);
  assert.equal(result.stage, "response_body");
  assert.equal(result.outcome, "failed");
  assert.match(
    JSON.stringify(result.error),
    /chunk|HPE_INVALID_CHUNK_SIZE|Invalid character in chunk size/i,
  );
});

test("HTTP 200 with an HTML interception page records the original JSON parse failure", async () => {
  const result = await probeMetadata(
    "https://api.chatcut.io/metadata",
    "fixture",
    async () => new Response("<html>fixture private contents</html>"),
  );
  assert.equal(result.status, 200);
  assert.equal(result.bodyComplete, true);
  assert.equal(result.jsonValid, false);
  assert.equal(result.stage, "json_parse");
  assert.equal(result.outcome, "failed");
  assert.equal(result.body, undefined);
  assert.equal(result.error.name, "SyntaxError");
});

test("parseable JSON with missing metadata fields is not reported as valid metadata", async () => {
  const result = await probeMetadata(
    "https://api.chatcut.io/.well-known/oauth-authorization-server",
    "fixture",
    async () => new Response("{}"),
  );
  assert.equal(result.jsonValid, true);
  assert.equal(result.outcome, "invalid_metadata_shape");
  assert.equal(result.metadataShape.issuerPresent, false);
});

test("original failure survives later healthy probes and an unavailable log collector", async (t) => {
  const dir = await temporary(t);
  const original = join(dir, "failure.txt");
  await writeFile(original, "OAuth metadata failed\nCaused by: socket ECONNRESET");
  const { report, path } = await runDoctor(
    {
      host: "codex",
      serverUrl: "https://api.chatcut.io/api/external-mcp/mcp",
      originalError: original,
      output: join(dir, "report.json"),
    },
    {
      collectLogs: async () => {
        throw Object.assign(new Error("read denied"), { code: "EACCES" });
      },
      fetchImpl: async () => new Response('{"issuer":"fixture","resource":"fixture"}'),
    },
  );
  assert.match(report.originalFailure.message, /socket ECONNRESET/);
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.probes.length, 3);
  assert.ok(
    report.probes.every(
      (p) => p.outcome === "metadata_read" && p.originalAttemptMatch === "unconfirmed",
    ),
  );
  assert.match(report.outcome, /recovery_unverified/);
  assert.equal(report.hostLogs.gaps[0].error.code, "EACCES");
  assert.equal(
    JSON.parse(await readFile(path)).originalFailure.message,
    report.originalFailure.message,
  );
});

test("upload rejection retains the prewritten local report and never replaces the original error", async (t) => {
  const dir = await temporary(t);
  const output = join(dir, "report.json");
  const original = join(dir, "failure.txt");
  await writeFile(original, "Original: auth failed");
  let posts = 0;
  const { report } = await runDoctor(
    {
      host: "claude",
      serverUrl: "https://api.chatcut.dev/api/external-mcp/mcp",
      originalError: original,
      output,
      upload: true,
    },
    {
      collectLogs: noLogs,
      fetchImpl: async (url, init) => {
        if (init.method === "POST") {
          posts++;
          assert.equal(url, "https://api.chatcut.dev/telemetry/events");
          const local = JSON.parse(await readFile(output));
          assert.match(local.originalFailure.message, /Original: auth failed/);
          return new Response("capacity reached", { status: 429 });
        }
        return new Response("{}");
      },
    },
  );
  assert.equal(posts, 1);
  assert.equal(report.upload.status, "failed");
  assert.match(report.upload.error.message, /429.*capacity reached/);
  assert.match(JSON.parse(await readFile(output)).originalFailure.message, /Original: auth failed/);
});

test("accepted batch has reconstructable UTF-8 fragments and does not claim final-store delivery", async (t) => {
  const dir = await temporary(t);
  let uploaded;
  const { report } = await runDoctor(
    {
      host: "codex",
      serverUrl: "https://api.chatcut.io/api/external-mcp/mcp",
      output: join(dir, "report.json"),
      upload: true,
    },
    {
      collectLogs: async () => ({ entries: [{ message: "原始故障🎬".repeat(1600) }], gaps: [] }),
      fetchImpl: async (_, init) => {
        if (init.method === "POST") {
          assert.equal(init.headers.authorization, undefined);
          uploaded = JSON.parse(init.body);
          return new Response('{"ok":true}');
        }
        return new Response("{}");
      },
    },
  );
  assert.equal(report.upload.status, "ingest_accepted");
  assert.equal(report.upload.storageVerified, false);
  const json = uploaded
    .map((event, index) => {
      const payload = event.properties.attributes.mcpDoctor;
      assert.equal(payload.fragmentIndex, index);
      assert.equal(payload.fragmentCount, uploaded.length);
      assert.ok(Buffer.byteLength(payload.fragment) <= 4096);
      assert.equal(event.properties.clientEventName, null);
      assert.equal(event.properties.eventName, "mcp.doctor.report_fragment");
      return payload.fragment;
    })
    .join("");
  assert.equal(createHash("sha256").update(json).digest("hex"), report.upload.reportSha256);
  assert.equal(JSON.parse(json).hostLogs.entries[0].message, "原始故障🎬".repeat(1600));
});

test("oversized diagnostics are retained locally instead of silently truncated for upload", async (t) => {
  const dir = await temporary(t);
  let posts = 0;
  const { report, path } = await runDoctor(
    {
      host: "codex",
      serverUrl: "https://api.chatcut.io/api/external-mcp/mcp",
      output: join(dir, "report.json"),
      upload: true,
    },
    {
      collectLogs: async () => ({ entries: [{ message: "x".repeat(280_000) }], gaps: [] }),
      fetchImpl: async (_, init) => {
        if (init.method === "POST") posts++;
        return new Response("{}");
      },
    },
  );
  assert.equal(posts, 0);
  assert.equal(report.upload.status, "failed");
  assert.match(report.upload.error.message, /upload budget/);
  assert.equal(JSON.parse(await readFile(path)).hostLogs.entries[0].message.length, 280_000);
});

test("credentials in original errors are removed while error codes and useful detail remain", () => {
  const text =
    'ECONNRESET Bearer fixture-secret https://api.chatcut.io/auth?code=secret-code&state=secret-state\nCookie: sid=secret-cookie\n{"access_token":"secret-json"}';
  const output = redact(text);
  assert.match(output, /ECONNRESET/);
  for (const value of [
    "fixture-secret",
    "secret-code",
    "secret-state",
    "secret-cookie",
    "secret-json",
  ])
    assert.ok(!output.includes(value));
  assert.equal(redact("Bearer token required"), "Bearer token required");
  assert.equal(
    redact("chatcut_managed_startup_error ECONNRESET"),
    "chatcut_managed_startup_error ECONNRESET",
  );
  for (const field of ["authorization", "accessToken", "refresh_token", "clientSecret", "apiKey"]) {
    assert.ok(!redact(JSON.stringify({ [field]: "private-value" })).includes("private-value"));
  }
});

test("a credential file cannot be used as the original-error input", async (t) => {
  const dir = await temporary(t);
  const credential = join(dir, "auth.json");
  await writeFile(credential, '{"private":"fixture-credential-value"}');
  const { report } = await runDoctor(
    {
      host: "codex",
      serverUrl: "https://api.chatcut.io/api/external-mcp/mcp",
      originalError: credential,
      output: join(dir, "report.json"),
    },
    { collectLogs: noLogs, fetchImpl: async () => new Response("{}") },
  );
  assert.equal(report.originalFailure.status, "unavailable");
  assert.ok(!JSON.stringify(report).includes("fixture-credential-value"));
  assert.match(report.gaps[0].error.message, /dedicated/);
});

for (const [host, folder, manifest] of [
  ["codex", "codex/skills/chatcut-plugin-basics", "codex/.codex-plugin/plugin.json"],
  ["claude", "claude/skills/chatcut-plugin-basics-claude", "claude/.claude-plugin/plugin.json"],
]) {
  test(`${host} packaged CLI writes a complete local report and receives a real loopback ingest acknowledgement`, async (t) => {
    const dir = await temporary(t);
    const original = join(dir, "original.txt");
    const output = join(dir, "report.json");
    await writeFile(original, "CONTROLLED FIXTURE: original metadata connection failed");
    let posts = 0;
    const server = createServer(async (req, res) => {
      if (req.method === "POST") {
        const parts = [];
        for await (const part of req) parts.push(part);
        const events = JSON.parse(Buffer.concat(parts).toString());
        assert.equal(events[0].name, "mcp.doctor.report_fragment");
        posts++;
        res.end('{"ok":true}');
      } else res.end('{"issuer":"fixture","resource":"fixture"}');
    });
    const origin = await listen(t, server);
    const helper = fileURLToPath(new URL(`../${folder}/scripts/mcp-doctor.mjs`, import.meta.url));
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        helper,
        "--host",
        host,
        "--server-url",
        `${origin}/api/external-mcp/mcp`,
        "--host-version",
        "fixture-1.0",
        "--original-error",
        original,
        "--output",
        output,
        "--upload",
      ],
      {
        windowsHide: true,
        timeout: 10_000,
        env: { ...process.env, CODEX_HOME: dir, CLAUDE_CONFIG_DIR: dir },
      },
    );
    const receipt = JSON.parse(stdout);
    assert.equal(receipt.upload.status, "ingest_accepted");
    assert.equal(receipt.upload.storageVerified, false);
    const report = JSON.parse(await readFile(output));
    assert.equal(report.host, host);
    assert.equal(report.hostVersion, "fixture-1.0");
    assert.equal(
      report.pluginVersion,
      JSON.parse(await readFile(new URL(`../${manifest}`, import.meta.url))).version,
    );
    assert.equal(posts, 1);
    assert.equal(report.probes.length, 3);
    assert.match(report.originalFailure.message, /CONTROLLED FIXTURE/);
    assert.equal(receipt.recoveryVerified, false);
  });
}

test("text extraction includes only hosted ChatCut MCP records and their cause continuation", async (t) => {
  const dir = await temporary(t);
  await mkdir(join(dir, ".claude", "debug"), { recursive: true });
  await writeFile(
    join(dir, ".claude", "debug", "fixture.txt"),
    [
      'MCP server "other-service" connection failed with unrelated private data',
      'MCP server "chatcut_desktop" native failure',
      'MCP server "plugin:chatcut:chatcut" connection failed: ETIMEDOUT',
      'MCP server "chatcut" connection failed: ECONNRESET',
      "  Caused by: socket reset",
      "user prompt: unrelated conversation",
      'MCP server "chatcut" Tool result: private project data',
    ].join("\n"),
  );
  const result = await collectHostLogs("claude", {
    home: dir,
    claudeConfigDir: join(dir, ".claude"),
  });
  assert.ok(result.entries.some((e) => /ECONNRESET.*\n.*socket reset/.test(e.message)));
  assert.ok(result.entries.some((e) => /ETIMEDOUT/.test(e.message)));
  assert.ok(!JSON.stringify(result).includes("unrelated private data"));
  assert.ok(!JSON.stringify(result).includes("unrelated conversation"));
  assert.ok(!JSON.stringify(result).includes("native failure"));
  assert.ok(!JSON.stringify(result).includes("private project data"));
});

test("SQLite extraction is read-only, scoped to runtime modules, and excludes native MCP and tool-call echoes", async (t) => {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = await temporary(t);
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec("CREATE TABLE logs(id INTEGER,ts INTEGER,level TEXT,target TEXT,feedback_log_body TEXT)");
  const add = db.prepare("INSERT INTO logs VALUES(?,?,?,?,?)");
  const ts = Math.floor(Date.now() / 1000);
  add.run(
    1,
    ts,
    "WARN",
    "codex_mcp::connection_manager",
    "start{server_name=chatcut}: failed metadata request: ECONNRESET",
  );
  add.run(2, ts, "WARN", "codex_core::tools", "tool output server_name=chatcut quoted old error");
  add.run(
    3,
    ts,
    "WARN",
    "codex_mcp::connection_manager",
    "start{server_name=chatcut_desktop}: native error",
  );
  db.close();
  const result = await collectHostLogs("codex", { codexHome: dir });
  assert.equal(result.entries.length, 1);
  assert.match(result.entries[0].message, /ECONNRESET/);
  assert.equal(result.entries[0].rowId, 1);
  assert.equal(result.entries[0].originalAttemptMatch, "unconfirmed");
});

test("endpoint validation never silently retargets an unsupported environment or follows embedded credentials", () => {
  assert.equal(
    serverUrl("https://api.chatcut.dev/api/external-mcp/mcp").hostname,
    "api.chatcut.dev",
  );
  assert.throws(() => serverUrl("https://attacker.invalid/api/external-mcp/mcp"), /Unsupported/);
  assert.throws(
    () => serverUrl("https://user:secret@api.chatcut.io/api/external-mcp/mcp"),
    /Unsupported/,
  );
  assert.throws(
    () => serverUrl("https://api.chatcut.io/api/external-mcp/mcp?token=secret"),
    /Unsupported/,
  );
});

test("self-contained host packages ship identical helpers and diagnostic references", async () => {
  for (const file of ["scripts/mcp-doctor.mjs", "references/connection-diagnostics.md"]) {
    assert.equal(
      await readFile(
        new URL(`../codex/skills/chatcut-plugin-basics/${file}`, import.meta.url),
        "utf8",
      ),
      await readFile(
        new URL(`../claude/skills/chatcut-plugin-basics-claude/${file}`, import.meta.url),
        "utf8",
      ),
    );
  }
});

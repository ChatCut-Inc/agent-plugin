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
  runDoctor as runDoctorImpl,
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
const runDoctor = (options, dependencies) =>
  runDoctorImpl(options, {
    inspectTransport: async () => ({ status: "fixture; no_network" }),
    ...dependencies,
  });
const metadataResponse = () =>
  new Response(
    JSON.stringify({
      issuer: "https://api.chatcut.io",
      authorization_endpoint: "https://api.chatcut.io/auth/mcp/authorize",
      token_endpoint: "https://api.chatcut.io/auth/mcp/token",
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      resource: "https://api.chatcut.io/api/external-mcp/mcp",
      authorization_servers: ["https://api.chatcut.io"],
    }),
  );

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
      fetchImpl: metadataResponse,
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
        if (url.endsWith("/telemetry/events")) {
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
      fetchImpl: async (url, init) => {
        if (url.endsWith("/telemetry/events")) {
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
      fetchImpl: async (url) => {
        if (url.endsWith("/telemetry/events")) posts++;
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
  for (const boundary of ["\n", "\\n", "\\r\\n", "\\\\n"]) {
    const source = `Set-Cookie: sid=cookie-canary; theme=dark${boundary}Caused by: E_ORIGINAL_CAUSE`;
    const redacted = redact(source);
    assert.ok(!redacted.includes("cookie-canary"));
    assert.ok(redacted.includes(boundary + "Caused by: E_ORIGINAL_CAUSE"));
    assert.equal(redact(redacted), redacted);
  }
  const quotedCookie = 'Cookie="sid=cookie-canary"; Caused by: E_ORIGINAL_CAUSE';
  assert.equal(redact(quotedCookie), 'Cookie="[REDACTED]"; Caused by: E_ORIGINAL_CAUSE');
  assert.equal(redact(redact(quotedCookie)), redact(quotedCookie));
});

for (const host of ["codex", "claude"]) {
  test(`${host} local report and offline fragments redact labelled credential values without losing original diagnostics`, async (t) => {
    const dir = await temporary(t);
    const original = join(dir, "original.txt");
    const canaries = Array.from({ length: 9 }, (_, i) => `ABCDEFGHIJKLMNOPQRSTUVWXYZabcde${i}`);
    const challenge =
      'Bearer resource_metadata="https://api.chatcut.io/.well-known/oauth-protected-resource"';
    await writeFile(
      original,
      [
        `Original E_UNFAMILIAR_MCP: token=${canaries[0]}; access_token="${canaries[1]}"; refreshToken='${canaries[2]}'`,
        `client_secret="${canaries[3]} with spaces / += :"; session_token=\\"${canaries[4]}\\"`,
        JSON.stringify({ access_token: canaries[5], message: "preserved provider message" }),
        JSON.stringify(JSON.stringify({ token: canaries[6], code: "E_NESTED_ORIGINAL" })),
        `Cookie: sid=${canaries[7]}; second=${canaries[8]}\\r\\nCaused by: OriginalType E_CAUSE_777`,
        challenge,
        "Error type=OriginalType code=E_TOKEN_EXPIRED: Bearer token required; token refresh rejected",
      ].join("\n"),
    );
    const { report, path } = await runDoctor(
      { host, originalError: original, output: join(dir, "report.json") },
      {
        collectLogs: noLogs,
        fetchImpl: async () => {
          throw new Error("Offline redaction verification must not connect");
        },
      },
    );
    const saved = await readFile(path, "utf8");
    const events = fragmentEvents(report);
    const reconstructed = events
      .map((event) => event.properties.attributes.mcpDoctor.fragment)
      .join("");
    assert.equal(
      createHash("sha256").update(reconstructed).digest("hex"),
      events[0].properties.attributes.mcpDoctor.reportSha256,
    );
    for (const text of [saved, reconstructed]) {
      for (const canary of canaries) assert.ok(!text.includes(canary));
      const parsed = JSON.parse(text);
      assert.equal(parsed.originalFailure.status, "recorded");
      for (const fact of [
        "E_UNFAMILIAR_MCP",
        "preserved provider message",
        "E_NESTED_ORIGINAL",
        "OriginalType E_CAUSE_777",
        "E_TOKEN_EXPIRED",
        "Bearer token required",
        challenge,
      ])
        assert.ok(parsed.originalFailure.message.includes(fact));
    }
    assert.equal(report.upload.status, "skipped_endpoint_unavailable");
  });

  test(`${host} text logs retain unknown error words and causes while excluding tool/chat records and other services`, async (t) => {
    const dir = await temporary(t);
    const logDir = host === "codex" ? join(dir, "log") : join(dir, "debug");
    await mkdir(logDir);
    const timestamp = new Date().toISOString();
    const prefix =
      host === "codex" ? `${timestamp} ERROR codex_mcp::rmcp_client: ` : `${timestamp} [ERROR] `;
    await writeFile(
      join(logDir, host === "codex" ? "codex-tui.log" : "fixture.txt"),
      [
        `${prefix}MCP server "chatcut": Error E_UNKNOWN_777: unsupported transcript field with tool_call value`,
        "  Caused by: AnotherUnknownType code=E_CAUSE_777; transcript transport; tool_call schema",
        "  transcript: E_TRANSCRIPT_FIELD_DETAIL",
        "  tool_call: E_TOOL_FIELD_DETAIL",
        `${prefix}MCP server "plugin:chatcut:chatcut": tool_call field not recognized E_UNKNOWN_778`,
        `${prefix}MCP server "chatcut": transcript: E_TRANSCRIPT_FIELD_ERROR`,
        `${prefix}MCP server "chatcut": tool_call: E_TOOL_FIELD_ERROR`,
        `${prefix}MCP server "chatcut": Error refers to chatcut_desktop compatibility E_UNKNOWN_779`,
        `${prefix}MCP server "chatcut": {"code":-32999,"message":"unknown transcript tool_call error"}`,
        `${prefix}MCP server "chatcut": Tool result: private-tool-result`,
        `${prefix}MCP server "chatcut": tool_call: {"arguments":"private-tool-arguments"}`,
        `${prefix}MCP server "chatcut": Sending request: {"method":"tools/call","params":{"arguments":"private-request"}}`,
        `${prefix}MCP server "chatcut": Received response: {"result":{"content":[{"text":"private-response"}]}}`,
        `${prefix}MCP server "chatcut": {"type":"user_message","message":"private-scoped-message"}`,
        `${prefix}MCP server "chatcut": {"method":"tools/call","params":{"arguments":"private-json-arguments"}}`,
        `${prefix}user prompt: private-user-message MCP server "chatcut"`,
        `${prefix}transcript: private-conversation MCP server "chatcut"`,
        `${prefix}MCP server "other-service": private-other-service; MCP server "chatcut"`,
        `${prefix}MCP server "chatcut_desktop": private-native; https://api.chatcut.io/`,
        `${timestamp} INFO codex_core::tools: tool result server_name=chatcut private-codex-echo`,
        `${timestamp} INFO rmcp::client: request{server_name=chatcut method="tools/call"}: private-rpc-span`,
        `${prefix}MCP server "chatcut": Error E_BEFORE_PRIVATE_LINE`,
        "  user prompt: private-indented-user",
        `  MCP server "other-service": private-indented-other`,
      ].join("\n"),
    );
    const result = await collectHostLogs(host, {
      home: dir,
      codexHome: dir,
      codexSqliteHome: dir,
      localAppData: join(dir, "empty-appdata"),
      claudeConfigDir: dir,
    });
    const messages = result.entries.map((entry) => entry.message).join("\n");
    for (const marker of [
      "E_UNKNOWN_777",
      "E_CAUSE_777",
      "E_TRANSCRIPT_FIELD_DETAIL",
      "E_TOOL_FIELD_DETAIL",
      "E_TRANSCRIPT_FIELD_ERROR",
      "E_TOOL_FIELD_ERROR",
      "E_UNKNOWN_778",
      "E_UNKNOWN_779",
      "unknown transcript tool_call error",
      "E_BEFORE_PRIVATE_LINE",
    ])
      assert.ok(messages.includes(marker), marker);
    assert.ok(!messages.includes("private-"));
    assert.ok(result.entries.every((entry) => entry.originalAttemptMatch === "unconfirmed"));
  });
}

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
      if (req.url === "/telemetry/events") {
        const parts = [];
        for await (const part of req) parts.push(part);
        const events = JSON.parse(Buffer.concat(parts).toString());
        assert.equal(events[0].name, "mcp.doctor.report_fragment");
        posts++;
        res.end('{"ok":true}');
      } else if (req.url === "/api/external-mcp/mcp") {
        res.writeHead(401, {
          "www-authenticate":
            'Bearer resource_metadata="' +
            origin +
            '/.well-known/oauth-protected-resource/api/external-mcp/mcp"',
        });
        res.end('{"jsonrpc":"2.0","error":{"code":-32000,"message":"Authentication required"}}');
      } else
        res.end(
          JSON.stringify({
            issuer: origin,
            resource: origin + "/api/external-mcp/mcp",
            authorization_servers: [origin],
            authorization_endpoint: origin + "/auth/mcp/authorize",
            token_endpoint: origin + "/auth/mcp/token",
            response_types_supported: ["code"],
            code_challenge_methods_supported: ["S256"],
          }),
        );
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

test("Codex custom SQLite storage retains fresh WAL records and reads the selected native text log", async (t) => {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = await temporary(t);
  const sqliteHome = join(dir, "sqlite-state");
  const logDir = join(dir, "native-log");
  await mkdir(sqliteHome);
  await mkdir(logDir);
  const db = new DatabaseSync(join(sqliteHome, "logs_2.sqlite"));
  db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0");
  db.exec("CREATE TABLE logs(id INTEGER,ts INTEGER,level TEXT,target TEXT,feedback_log_body TEXT)");
  db.prepare("INSERT INTO logs VALUES(?,?,?,?,?)").run(
    1,
    Math.floor(Date.now() / 1000),
    "ERROR",
    "codex_mcp::connection_manager",
    "start{server_name=chatcut}: fresh WAL metadata failure",
  );
  await writeFile(
    join(logDir, "codex-tui.log"),
    [
      `${new Date().toISOString()} WARN codex_mcp::rmcp_client: MCP server startup failed server_name=chatcut error=Original transport cause`,
      'MCP server "chatcut" Tool result: private project payload',
    ].join("\n"),
  );
  const previous = process.env.CODEX_SQLITE_HOME;
  try {
    process.env.CODEX_SQLITE_HOME = sqliteHome;
    const result = await collectHostLogs("codex", { codexHome: dir, codexLogDir: logDir });
    assert.ok(
      result.entries.some(
        (entry) => entry.source === "codex_runtime_sqlite" && /fresh WAL/.test(entry.message),
      ),
    );
    assert.ok(
      result.entries.some(
        (entry) =>
          entry.source === "codex_tui_log" && /Original transport cause/.test(entry.message),
      ),
    );
    assert.ok(!JSON.stringify(result).includes("private project payload"));
    const explicit = await collectHostLogs("codex", {
      codexHome: dir,
      codexSqliteHome: sqliteHome,
      codexLogDir: logDir,
    });
    assert.ok(explicit.entries.some((entry) => /fresh WAL/.test(entry.message)));
  } finally {
    if (previous === undefined) delete process.env.CODEX_SQLITE_HOME;
    else process.env.CODEX_SQLITE_HOME = previous;
    db.close();
  }
});

test("Windows App fallback keeps native ChatCut startup errors with thread, time and privacy boundaries", async (t) => {
  const dir = await temporary(t);
  const localAppData = join(dir, "Local");
  const now = Date.now();
  const logDir = join(
    localAppData,
    "Codex",
    "Logs",
    new Date(now).toISOString().slice(0, 10).replaceAll("-", "/"),
  );
  await mkdir(logDir, { recursive: true });
  const line = (time, error, server = "chatcut", threadId = "this-thread") =>
    `${time} info [AppServerConnection] mcp_server_startup_status_updated error=${error} failureReason=null hostId=local server=${server} status=failed threadId=${threadId}`;
  await writeFile(
    join(logDir, "codex-desktop-fixture.log"),
    [
      line(
        new Date(now).toISOString(),
        JSON.stringify(
          'Original unfamiliar E_HOST_777 transcript metadata cause; Bearer secret-test-value; {"access_token":"nested-app-secret","message":"preserved original cause"}',
        ),
      ),
      "  private continuation is not a runtime event",
      line(new Date(now - 1000).toISOString(), "Auth required", "plugin:chatcut:chatcut", "null"),
      line(new Date(now - 1000).toISOString(), "private-other-thread", "chatcut", "other-thread"),
      line(new Date(now - 1000).toISOString(), "private-native", "chatcut_desktop"),
      line(
        new Date(now - 1000).toISOString(),
        '"mentioned server=chatcut inside error"',
        "other-service",
      ),
      line(new Date(now - 60 * 60_000).toISOString(), "old-window-error"),
      `${new Date(now).toISOString()} info [Renderer] user prompt MCP server "chatcut" private prompt`,
    ].join("\n"),
  );
  await writeFile(
    join(logDir, "conversation.log"),
    line(new Date(now).toISOString(), "wrong-source-file"),
  );
  const result = await collectHostLogs("codex", {
    home: dir,
    codexHome: dir,
    platform: "win32",
    localAppData,
    conversationId: "this-thread",
    now,
  });
  assert.equal(result.entries.length, 2);
  assert.match(
    result.entries[0].message + result.entries[1].message,
    /Original unfamiliar E_HOST_777/,
  );
  assert.ok(
    result.entries.every(
      (entry) => entry.source === "codex_app_log" && entry.originalAttemptMatch === "unconfirmed",
    ),
  );
  assert.equal(result.appLog.filesRead, 1);
  assert.equal(result.appLog.locationSource, "windows_default");
  assert.equal(result.appLog.currentConversationFilterApplied, true);
  assert.doesNotMatch(
    JSON.stringify(result),
    /secret-test-value|nested-app-secret|private continuation|private-other-thread|private-native|mentioned server|old-window-error|private prompt|wrong-source-file/,
  );
  assert.match(JSON.stringify(result.entries), /preserved original cause/);
});

test("MXC AppData redirection falls back to the host user profile without changing other platforms", async (t) => {
  const dir = await temporary(t);
  const now = Date.now();
  const logDir = join(
    dir,
    "AppData",
    "Local",
    "Codex",
    "Logs",
    new Date(now).toISOString().slice(0, 10).replaceAll("-", "/"),
  );
  await mkdir(logDir, { recursive: true });
  await writeFile(
    join(logDir, "codex-desktop-fixture.log"),
    `${new Date(now).toISOString()} info [AppServerConnection] mcp_server_startup_status_updated error="native cause" failureReason=null hostId=local server=chatcut status=failed threadId=null`,
  );
  const previous = process.env.LOCALAPPDATA;
  try {
    process.env.LOCALAPPDATA = join(dir, "Packages", "sandbox.fixture", "AC");
    const result = await collectHostLogs("codex", {
      home: dir,
      codexHome: dir,
      platform: "win32",
      now,
    });
    assert.equal(result.appLog.filesRead, 1);
    assert.equal(result.appLog.sandboxLocalAppDataRedirected, true);
    assert.ok(result.entries.some((entry) => /native cause/.test(entry.message)));
    const otherPlatform = await collectHostLogs("codex", {
      home: dir,
      codexHome: dir,
      platform: "darwin",
      now,
    });
    assert.equal(otherPlatform.appLog, undefined);
    assert.ok(!otherPlatform.entries.some((entry) => entry.source === "codex_app_log"));
  } finally {
    if (previous === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = previous;
  }
});

test("App fallback remains bounded and does not promote host notices into the original failed request", async (t) => {
  const dir = await temporary(t);
  const now = Date.now();
  const dateDir = join(dir, new Date(now).toISOString().slice(0, 10).replaceAll("-", "/"));
  await mkdir(dateDir, { recursive: true });
  await writeFile(
    join(dateDir, "codex-desktop-fixture.log"),
    Array.from(
      { length: 35 },
      (_, i) =>
        `${new Date(now - 35 + i).toISOString()} info [AppServerConnection] mcp_server_startup_status_updated error="original cause ${i}" failureReason=null hostId=local server=chatcut status=failed threadId=null`,
    ).join("\n"),
  );
  const { report } = await runDoctor({
    host: "codex",
    codexAppLogDir: dir,
    codexSqliteHome: join(dir, "empty-sqlite"),
    codexLogDir: join(dir, "empty-tui"),
    output: join(dir, "report.json"),
  });
  assert.equal(report.collectorVersion, "1.2.3");
  assert.equal(
    report.hostLogs.entries.filter((entry) => entry.source === "codex_app_log").length,
    30,
  );
  assert.ok(
    report.hostLogs.gaps.some(
      (gap) => gap.source === "codex_app_log" && gap.reason === "log_record_limit",
    ),
  );
  assert.equal(report.originalFailure.status, "unavailable");
  assert.equal(report.originalFailure.occurredAt, null);
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
  for (const file of [
    "scripts/mcp-doctor.mjs",
    "scripts/mcp-evidence.mjs",
    "references/connection-diagnostics.md",
  ]) {
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

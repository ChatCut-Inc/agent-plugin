import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { collectHostLogs, redact, runDoctor, submitReport } from "../codex/skills/chatcut-mcp-doctor/scripts/mcp-doctor.mjs";
import { diagnose, renderPacket } from "../codex/skills/chatcut-mcp-doctor/scripts/diagnosis.mjs";

const exec = promisify(execFile);
const skill = fileURLToPath(new URL("../codex/skills/chatcut-mcp-doctor/", import.meta.url));
const noLogs = async () => ({ entries: [], gaps: [{ source: "fixture", reason: "logs_unavailable" }] });
async function temp(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-standalone-doctor-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function service(t, handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}
const cli = (path, args, dir) => exec(process.execPath, [path, ...args], {
  env: { ...process.env, USERPROFILE: dir, HOME: dir, CODEX_HOME: dir, LOCALAPPDATA: dir, CLAUDE_CONFIG_DIR: dir, CODEX_THREAD_ID: "" },
  timeout: 30000,
});

test("standalone copied skill runs offline without a parent plugin or a live MCP and emits all feedback files", async (t) => {
  const dir = await temp(t);
  await cp(skill, join(dir, "doctor"), { recursive: true });
  let requests = 0;
  const origin = await service(t, (_, res) => { requests++; res.end("{}"); });
  const output = join(dir, "offline.mcp-report.json");
  await cli(join(dir, "doctor/scripts/doctor.mjs"), ["--host", "codex", "--server-url", `${origin}/api/external-mcp/mcp`, "--offline", "--upload", "--output", output], dir);
  const report = JSON.parse(await readFile(output));
  assert.equal(requests, 0);
  assert.equal(report.collectorVersion, "1.2.3");
  assert.equal(report.upload.status, "skipped_offline");
  assert.equal(report.probes.length, 0);
  assert.ok(report.gaps.some((gap) => gap.source === "plugin_version"));
  for (const suffix of [".diagnosis.json", ".summary.md", ".issue-draft.md"]) assert.ok((await readFile(output + suffix)).length > 0);
  const before = await readFile(output, "utf8");
  await cli(join(dir, "doctor/scripts/doctor.mjs"), ["--report", output], dir);
  assert.equal(await readFile(output, "utf8"), before);
  assert.equal(requests, 0);
});

test("normal anonymous 401 plus valid metadata demonstrates no incident or authenticated recovery", async (t) => {
  const dir = await temp(t);
  let origin;
  origin = await service(t, (req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.method === "POST") {
      res.writeHead(401, { "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/external-mcp/mcp"` });
      res.end('{"error":"unauthorized"}');
    } else if (req.url.includes("oauth-protected-resource"))
      res.end(JSON.stringify({ resource: `${origin}/api/external-mcp/mcp`, authorization_servers: [origin] }));
    else res.end(JSON.stringify({ issuer: origin, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, response_types_supported: ["code"], code_challenge_methods_supported: ["S256"] }));
  });
  const { report } = await runDoctor({ host: "codex", serverUrl: `${origin}/api/external-mcp/mcp`, output: join(dir, "normal.mcp-report.json") }, { collectLogs: noLogs });
  assert.equal(report.entryProbe.outcome, "authentication_challenge");
  assert.ok(report.probes.every((probe) => probe.outcome === "metadata_read"));
  const result = diagnose(report);
  assert.equal(result.findings.some((item) => item.severity === "attention"), false);
  assert.equal(result.recoveryVerified, false);
});

test("startup, post-connection tool failure, missing registration and truncated logs keep distinct evidence", async (t) => {
  const dir = await temp(t);
  for (const [stage, operation, source, expected] of [
    ["initialize", "initialize", "runtime_log", "startup_or_discovery_failed"],
    ["tools_call", "import_media", "current_session", "tool_call_failed"],
    ["host_registration", "lookup_registered_server", "cli_configuration", "not_registered"],
  ]) {
    const snapshot = join(dir, `${stage}.mcp-snapshot.json`);
    await writeFile(snapshot, JSON.stringify({ schemaVersion: 1, observedAt: new Date().toISOString(), observations: [{ stage, operation, source, observedAt: null, outcome: "failed", message: "Exact native error E_UNKNOWN" }] }));
    const failure = join(dir, `${stage}.mcp-failure.json`);
    await writeFile(failure, JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "chatcut", occurredAt: null, operation, callId: "original-local-id", error: { message: "busy after 300s", code: "E_UNKNOWN", cause: { code: "E_NATIVE" } } }));
    const { report } = await runDoctor({ host: "claude", hostSnapshot: snapshot, failureRecord: failure, output: join(dir, `${stage}.mcp-report.json`) }, {
      collectLogs: async () => ({ entries: [], gaps: [{ source: "host_logs", reason: "truncated", omittedBytes: 12 }] }),
    });
    const result = diagnose(report);
    assert.ok(result.findings.some((item) => item.kind === expected));
    assert.ok(result.gaps.some((gap) => gap.reason === "truncated" && gap.omittedBytes === 12));
    assert.equal(report.originalFailure.error.cause.code, "E_NATIVE");
    assert.equal(report.originalFailure.occurredAt, null);
    assert.equal(result.rootCause, "unconfirmed");
    assert.equal(result.recoveryVerified, false);
    assert.ok(!JSON.stringify(result.findings).includes("clear locks"));
  }
});

test("unsupported endpoint yields a local report without retargeting or any requests", async (t) => {
  const dir = await temp(t);
  const { report } = await runDoctor({ host: "codex", serverUrl: "https://unrecognized.invalid/api/external-mcp/mcp", upload: true, output: join(dir, "unsupported.mcp-report.json") }, {
    collectLogs: noLogs, fetchImpl: () => assert.fail("must not send"),
  });
  assert.equal(report.serverUrl, null);
  assert.equal(report.upload.status, "skipped_endpoint_unavailable");
  assert.ok(report.gaps.some((gap) => gap.reason.startsWith("unsupported_endpoint")));
});

test("failed ingest can resend the same saved report once, without probes or report mutations", async (t) => {
  const dir = await temp(t);
  let posts = 0;
  let reject = true;
  let received;
  const origin = await service(t, (req, res) => {
    assert.equal(req.url, "/telemetry/events");
    assert.equal(req.headers.authorization, undefined);
    posts++;
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => { received = JSON.parse(body); res.writeHead(reject ? 503 : 200); res.end(reject ? "busy" : '{"ok":true}'); });
  });
  const output = join(dir, "retry.mcp-report.json");
  await runDoctor({ host: "codex", serverUrl: `${origin}/api/external-mcp/mcp`, offline: true, output }, { collectLogs: noLogs });
  const before = await readFile(output, "utf8");
  await cli(join(skill, "scripts/doctor.mjs"), ["--upload-report", output], dir);
  assert.equal(JSON.parse(await readFile(output + ".upload.json")).receipt.status, "failed");
  reject = false;
  await cli(join(skill, "scripts/doctor.mjs"), ["--upload-report", output], dir);
  assert.equal(JSON.parse(await readFile(output + ".upload.json")).receipt.storageVerified, false);
  assert.equal(JSON.parse(await readFile(output + ".upload.json")).receipt.status, "ingest_accepted");
  assert.equal(received[0].properties.attributes.mcpDoctor.diagnosticId, JSON.parse(before).diagnosticId);
  assert.equal(await readFile(output, "utf8"), before);
  await assert.rejects(cli(join(skill, "scripts/doctor.mjs"), ["--upload-report", output], dir), /already acknowledged/);
  assert.equal(posts, 2);
});

test("private issue draft excludes local IDs, full stacks, paths, credential values and log dumps", async (t) => {
  const dir = await temp(t);
  const { report } = await runDoctor({ host: "codex", output: join(dir, "privacy.mcp-report.json") }, { collectLogs: noLogs });
  report.originalFailure = { status: "recorded", occurredAt: null, message: "E_UNKNOWN token=abc123 at C:\\Users\\alice\\secret.txt", callId: "private-call-id", stack: "private-full-stack" };
  report.hostLogs.entries.push({ message: "private-log-dump" });
  const { draft } = renderPacket(report, diagnose(report));
  for (const secret of ["abc123", "alice", "private-call-id", "private-full-stack", "private-log-dump"]) assert.ok(!draft.includes(secret));
  assert.ok(draft.includes("E_UNKNOWN"));
});

test("MCP session credentials are redacted while local IDs remain private report evidence only", async (t) => {
  const dir = await temp(t);
  const raw = 'Mcp-Session-Id: opaque-secret\n{"mcp_session_id":"second-secret"}\ncallId=local-call conversationId=local-chat';
  const { report } = await runDoctor({ host: "codex", output: join(dir, "ids.mcp-report.json") }, { collectLogs: noLogs });
  report.originalFailure = { status: "recorded", message: redact(raw), callId: "local-call", conversationId: "local-chat" };
  const { draft } = renderPacket(report, diagnose(report));
  for (const value of ["opaque-secret", "second-secret", "local-call", "local-chat"]) assert.ok(!draft.includes(value));
  assert.equal(report.originalFailure.callId, "local-call");
  assert.ok(redact(raw).includes("callId=local-call"));
  for (const opaque of ["!opaque-secret", "opaque:secret", "opaque;secret", "opaque\\secret"])
    assert.ok(!redact(`Mcp-Session-Id: ${opaque}\nError E_KEEP`).includes(opaque));
  for (let code = 0x21; code <= 0x7e; code++) {
    const opaque = `opaque${String.fromCharCode(code)}SECRET_SUFFIX`;
    for (const text of [`Mcp-Session-Id: ${opaque}\nError E_KEEP`, JSON.stringify({ "Mcp-Session-Id": opaque, code: "E_KEEP" })]) {
      assert.ok(!redact(text).includes("SECRET_SUFFIX"));
      assert.ok(redact(text).includes("E_KEEP"));
    }
  }
});

test("foreign upload receipts cannot claim delivery for another report", async (t) => {
  const dir = await temp(t);
  const output = join(dir, "foreign.mcp-report.json");
  await runDoctor({ host: "codex", output }, { collectLogs: noLogs });
  const source = await readFile(output, "utf8");
  await writeFile(output + ".upload.json", JSON.stringify({ schemaVersion: 1, diagnosticId: "00000000-0000-0000-0000-000000000000", sourceReportSha256: "0".repeat(64), receipt: { status: "ingest_accepted", storageVerified: false } }));
  for (const flag of ["--report", "--upload-report"])
    await assert.rejects(cli(join(skill, "scripts/doctor.mjs"), [flag, output], dir), /does not match/);
  assert.equal(await readFile(output, "utf8"), source);
});

test("invalid disabled snapshots remain disabled through offline collection and later report submission", async (t) => {
  const dir = await temp(t);
  const snapshot = join(dir, "disabled.mcp-snapshot.json");
  await writeFile(snapshot, JSON.stringify({ schemaVersion: 99, configuration: { enabled: false } }));
  const { report } = await runDoctor({ host: "codex", serverUrl: "https://api.chatcut.io/api/external-mcp/mcp", hostSnapshot: snapshot, offline: true, output: join(dir, "disabled.mcp-report.json") }, { collectLogs: noLogs, fetchImpl: () => assert.fail("disabled collection sends nothing") });
  assert.equal(report.hostSnapshot, undefined);
  assert.equal(report.upload.status, "skipped_intentionally_disabled");
  assert.equal((await submitReport(report, () => assert.fail("disabled report sends nothing"))).status, "skipped_intentionally_disabled");
});

test("SQLite and text runtime records exclude content echoes from permitted MCP modules", async (t) => {
  const dir = await temp(t);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec("CREATE TABLE logs(id INTEGER,ts INTEGER,level TEXT,target TEXT,feedback_log_body TEXT)");
  const messages = [
    'start{server_name="chatcut"}: tool call: {"method":"tools/call","params":{"arguments":{"prompt":"PRIVATE_PROMPT_SENTINEL"}}}',
    'start{server_name="chatcut"}: tool result: {"result":{"content":[{"text":"PRIVATE_RESULT_SENTINEL"}]}}',
    'start{server_name="chatcut"}: Unfamiliar error E_KEEP_UNKNOWN cause ECONNRESET',
  ];
  const add = db.prepare("INSERT INTO logs VALUES(?,?,?,?,?)");
  messages.forEach((message, index) => add.run(index + 1, Math.floor(Date.now() / 1000), "WARN", "codex_mcp::client", message));
  db.close();
  await writeFile(join(dir, "codex-tui.log"), messages.map((message) => `${new Date().toISOString()} WARN codex_mcp::client: ${message}`).join("\n"));
  const logs = await collectHostLogs("codex", { codexHome: dir, codexSqliteHome: dir, codexLogDir: dir, codexAppLogDir: dir });
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_PROMPT_SENTINEL"));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_RESULT_SENTINEL"));
  assert.equal(logs.entries.filter((entry) => entry.message.includes("E_KEEP_UNKNOWN")).length, 2);
});

test("both packages ship identical standalone executable resources and references", async () => {
  async function compare(relative = "") {
    for (const entry of await readdir(join(skill, relative), { withFileTypes: true })) {
      if (entry.name === "agents") continue;
      const path = join(relative, entry.name);
      if (entry.isDirectory()) await compare(path);
      else assert.deepEqual(await readFile(join(skill, path)), await readFile(new URL(`../claude/skills/chatcut-mcp-doctor/${path.replaceAll("\\", "/")}`, import.meta.url)));
    }
  }
  await compare();
});

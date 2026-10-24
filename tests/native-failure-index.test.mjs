import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { collectHostLogs, runDoctor, submitReport } from "../codex/skills/chatcut-mcp-doctor/scripts/mcp-doctor.mjs";
import { diagnose, renderPacket } from "../codex/skills/chatcut-mcp-doctor/scripts/diagnosis.mjs";

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-native-index-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const now = Date.parse("2026-10-24T10:30:00Z");
const current = "00000000-0000-0000-0000-000000000123";
const options = dir => ({ codexHome: dir, codexSqliteHome: dir, codexLogDir: dir, codexAppLogDir: dir, conversationId: current, now });
function database(dir) {
  const db = new DatabaseSync(join(dir, "thread_history_1.sqlite"));
  db.exec("CREATE TABLE thread_items(thread_id TEXT,turn_id TEXT,item_id TEXT,item_type TEXT,created_at_ms INTEGER,started_at_ms INTEGER,completed_at_ms INTEGER,item_json TEXT)");
  return db;
}
const native = extra => ({ type: "mcpToolCall", server: "chatcut", tool: "list_projects", status: "failed",
  error: { message: "Unfamiliar original error token=PRIVATE_TOKEN", code: -32041, cause: { message: "E_NATIVE_CAUSE" } },
  arguments: { prompt: "PRIVATE_ARGUMENTS" }, result: { content: [{ text: "PRIVATE_RESULT" }] }, ...extra });

test("native index projects only scoped failed MCP metadata and keeps lifecycle/ID kinds separate", async t => {
  const dir = await fixture(t), db = database(dir), add = db.prepare("INSERT INTO thread_items VALUES(?,?,?,?,?,?,?,?)");
  const insert = (id, value, extra = {}) => add.run(extra.thread ?? current, "native-turn", id, extra.type ?? "mcpToolCall", now,
    extra.started === undefined ? now - 1000 : extra.started, extra.completed === undefined ? now - 900 : extra.completed, typeof value === "string" ? value : JSON.stringify(value));
  insert("native-item", native());
  insert("foreign", native({ error: { message: "PRIVATE_FOREIGN" } }), { thread: "other-thread" });
  insert("success", native({ status: "completed", error: { message: "PRIVATE_SUCCESS" } }));
  insert("other-server", native({ server: "other", error: { message: "PRIVATE_OTHER_SERVER" } }));
  insert("desktop", native({ server: "chatcut_desktop", error: { message: "PRIVATE_DESKTOP" } }));
  insert("user", { type: "userMessage", text: "PRIVATE_USER" }, { type: "userMessage" });
  insert("assistant", { type: "agentMessage", text: "PRIVATE_ASSISTANT" }, { type: "agentMessage" });
  insert("mismatched-type", native({ type: "agentMessage", error: { message: "PRIVATE_BAD_TYPE" } }));
  insert("no-lifecycle", native({ error: { message: "PRIVATE_UNKNOWN_TIME" } }), { started: null, completed: null });
  insert("old", native({ error: { message: "PRIVATE_OLD" } }), { started: now - 7200000, completed: now - 7100000 });
  insert("malformed", "not JSON PRIVATE_BAD_JSON");
  db.close();
  const logs = await collectHostLogs("codex", options(dir));
  assert.equal(logs.nativeFailedCalls.length, 1);
  const item = logs.nativeFailedCalls[0];
  assert.equal(item.nativeItemId, "native-item");
  assert.match(item.idKind, /codex_native_mcp_item_id/);
  assert.equal(item.startedAtMs, now - 1000);
  assert.equal(item.completedAtMs, now - 900);
  assert.equal(item.occurredAt, undefined);
  assert.equal(item.callId, undefined);
  assert.equal(item.requestId, undefined);
  assert.equal(item.originalAttemptMatch, "unconfirmed");
  assert.equal(item.error.cause.message, "E_NATIVE_CAUSE");
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_"));
  const unknown = await collectHostLogs("codex", { ...options(dir), conversationId: undefined });
  assert.equal(unknown.nativeFailedCalls.length, 0);
  assert.ok(unknown.gaps.some(g => g.reason === "known_conversation_id_unavailable; no_history_query"));
  const injected = await collectHostLogs("codex", { ...options(dir), conversationId: "' OR 1=1 --" });
  assert.equal(injected.nativeFailedCalls.length, 0);
});

test("record/error limits and unsupported schemas remain explicit without replacing the original error", async t => {
  const dir = await fixture(t), db = database(dir), add = db.prepare("INSERT INTO thread_items VALUES(?,?,?,?,?,?,?,?)");
  for (let i = 0; i < 12; i++) add.run(current, "turn", `native-${i}`, "mcpToolCall", now, now - 1000, now - i,
    JSON.stringify(native({ error: { message: i === 0 ? "X".repeat(140000) : i === 1 ? "X".repeat(20000) + "E_FULL_TAIL" : "E_NATIVE" } })));
  db.close();
  const logs = await collectHostLogs("codex", options(dir));
  assert.equal(logs.nativeFailedCalls.length, 10);
  assert.ok(logs.gaps.some(g => g.reason === "native_failure_record_limit"));
  assert.ok(logs.gaps.some(g => g.reason === "native_error_size_limit"));
  assert.equal(logs.nativeFailedCalls.find(i => i.nativeItemId === "native-0").error, null);
  assert.ok(logs.nativeFailedCalls.find(i => i.nativeItemId === "native-1").error.message.endsWith("E_FULL_TAIL"));
  const unsupportedDir = await fixture(t), old = new DatabaseSync(join(unsupportedDir, "thread_history_1.sqlite"));
  old.exec("CREATE TABLE thread_items(thread_id TEXT,item_json TEXT)"); old.close();
  const unsupported = await collectHostLogs("codex", options(unsupportedDir));
  assert.ok(unsupported.gaps.some(g => g.reason === "unsupported_schema; no_conversation_rows_read"));
});

test("native query errors retain their failing operation and local evidence is not trimmed to fit upload", async t => {
  const dir = await fixture(t), db = new DatabaseSync(join(dir, "thread_history_1.sqlite"));
  db.exec(`CREATE VIEW thread_items AS SELECT '${current}' AS thread_id,'turn' AS turn_id,'native' AS item_id,
    'mcpToolCall' AS item_type,${now - 1000} AS started_at_ms,${now - 900} AS completed_at_ms,
    abs(-9223372036854775808) AS item_json`);
  db.close();
  const broken = await collectHostLogs("codex", options(dir));
  assert.ok(broken.gaps.some(g => g.source === "codex_native_failed_mcp_items" && g.operation === "select_failed_mcp_items" && g.error?.message));
  const largeDir = await fixture(t), large = database(largeDir);
  const insert = large.prepare("INSERT INTO thread_items VALUES(?,?,?,?,?,?,?,?)");
  for (let i = 0; i < 3; i++) insert.run(current, "turn", `native-${i}`, "mcpToolCall", now, now - 1000, now - i,
    JSON.stringify(native({ error: { message: "X".repeat(100000) + "E_UNTRIMMED_TAIL" } })));
  large.close();
  const logs = await collectHostLogs("codex", options(largeDir));
  const { report, path } = await runDoctor({ host: "codex", serverUrl: "http://127.0.0.1:9/api/external-mcp/mcp", offline: true, output: join(largeDir, "large.json") }, { collectLogs: async () => logs });
  assert.ok(report.hostLogs.nativeFailedCalls.every(i => i.error.message.endsWith("E_UNTRIMMED_TAIL")));
  assert.ok((await readFile(path, "utf8")).length > 256 * 1024);
  const upload = await submitReport(report, () => assert.fail("Oversized report is retained locally without upload"));
  assert.equal(upload.status, "failed");
  assert.ok(report.hostLogs.nativeFailedCalls.every(i => i.error.message.endsWith("E_UNTRIMMED_TAIL")));
});

test("current collection context is saved without filling original fields or leaking native IDs to issue drafts", async t => {
  const dir = await fixture(t), before = process.env.CODEX_THREAD_ID;
  process.env.CODEX_THREAD_ID = current;
  t.after(() => { if (before === undefined) delete process.env.CODEX_THREAD_ID; else process.env.CODEX_THREAD_ID = before; });
  const failure = join(dir, "original.mcp-failure.json");
  await writeFile(failure, JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "chatcut", occurredAt: null,
    operation: "list_projects", error: { message: "E_ORIGINAL" } }));
  let query;
  const { report, path } = await runDoctor({ host: "codex", failureRecord: failure, offline: true, output: join(dir, "out.json") }, {
    collectLogs: async (_, value) => { query = value; return { entries: [], gaps: [], nativeFailedCalls: [{ source: "codex_native_failed_mcp_items",
      nativeItemId: "PRIVATE_NATIVE_ID", idKind: "codex_native_mcp_item_id", conversationId: current, turnId: "PRIVATE_TURN_ID",
      operation: "list_projects", startedAtMs: now - 1000, completedAtMs: now - 900, error: { message: "E_ORIGINAL" } }] }; },
    fetchImpl: () => assert.fail("Offline capture sends no request"),
  });
  assert.equal(report.collectionContext.conversationId, current);
  assert.equal(report.collectionContext.source, "CODEX_THREAD_ID");
  assert.equal(query.conversationId, current);
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.originalFailure.conversationId, undefined);
  assert.equal(report.originalFailure.callId, undefined);
  assert.equal(report.evidenceSummary.originalLocalCall, null);
  assert.equal(JSON.parse(await readFile(path, "utf8")).collectionContext.conversationId, current);
  const diagnosis = diagnose(report), packet = renderPacket(report, diagnosis);
  assert.ok(diagnosis.findings.some(f => f.kind === "native_failed_mcp_item_unassociated"));
  assert.ok(!diagnosis.findings.some(f => f.kind === "no_incident_demonstrated"));
  assert.ok(packet.summary.includes("PRIVATE_NATIVE_ID"));
  for (const value of [current, "PRIVATE_NATIVE_ID", "PRIVATE_TURN_ID"]) assert.ok(!packet.draft.includes(value));
  assert.equal(diagnosis.recoveryVerified, false);
});

test("an explicit retained native stderr tail preserves log time and errors without importing echoes or original fields", async t => {
  const dir = await fixture(t), path = join(dir, "owned.codex-stderr.log");
  const line = '2026-10-24T10:29:59.123456Z WARN codex_mcp::rmcp_client: MCP server startup failed server_name="chatcut" error=HTTP503 E_REAL_NATIVE token=PRIVATE_TOKEN';
  await writeFile(path, "unrelated log record\n".repeat(8000) + line + "\n" +
    '2026-10-24T10:29:59Z ERROR codex_mcp::rmcp_client: request{server_name=chatcut}: tool result: {"content":[{"text":"PRIVATE_ECHO"}]}\n');
  const logs = await collectHostLogs("codex", { ...options(dir), codexStderrFile: path });
  const found = logs.entries.filter(e => e.source === "codex_stderr_log");
  assert.equal(found.length, 1);
  assert.equal(found[0].loggedAt, "2026-10-24T10:29:59.123Z");
  assert.equal(found[0].occurredAt, undefined);
  assert.equal(found[0].originalAttemptMatch, "unconfirmed");
  assert.ok(found[0].message.includes("E_REAL_NATIVE"));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_"));
  assert.ok(logs.gaps.some(g => g.source === "codex_stderr_log" && g.reason === "only_log_tail_read"));
  const report = { diagnosticId: "00000000-0000-0000-0000-000000000001", host: "codex", collectorVersion: "1.3.0",
    originalFailure: { status: "unavailable", occurredAt: null }, hostLogs: logs, gaps: [] };
  const diagnosis = diagnose(report);
  assert.ok(diagnosis.findings.some(f => f.kind === "host_runtime_error_unassociated" && f.observed.level === "WARN" && f.observed.loggedAt === found[0].loggedAt));
  assert.ok(!diagnosis.findings.some(f => f.kind === "no_incident_demonstrated"));
  assert.equal(report.originalFailure.occurredAt, null);
  assert.ok(!renderPacket(report, diagnosis).draft.includes("E_REAL_NATIVE"));
  const healthy = { ...report, hostLogs: { entries: [
    '2026-10-24T10:29:59Z WARN codex_mcp::rmcp_client: MCP server starting server_name="chatcut"',
    '2026-10-24T10:29:59Z WARN codex_mcp::rmcp_client: MCP server ready server_name="chatcut"',
    '2026-10-24T10:29:59Z WARN codex_mcp::rmcp_client: cached catalog server_name="chatcut"',
    '2026-10-24T10:29:59Z WARN codex_mcp::rmcp_client: MCP server startup failed server_name="other" error=E_OTHER',
  ].map(message => ({ source: "codex_stderr_log", message })), gaps: [] } };
  assert.ok(!diagnose(healthy).findings.some(f => f.severity === "attention"));
  const bad = await collectHostLogs("codex", { ...options(dir), codexStderrFile: join(dir, "auth.json") });
  assert.ok(bad.gaps.some(g => g.source === "codex_stderr_log" && g.reason === "unavailable"));
});

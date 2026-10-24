import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { collectHostLogs } from "../codex/skills/chatcut-mcp-doctor/scripts/mcp-doctor.mjs";

// Owned native-format fixtures test actual collector I/O, not natural failures
// or a model's autonomous collection ability.
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-collection-quality-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, now: Date.now() };
}
function database(dir) {
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec("CREATE TABLE logs(id INTEGER,ts INTEGER,level TEXT,target TEXT,feedback_log_body TEXT,thread_id TEXT)");
  return db;
}
const options = ({ dir, now }) => ({ codexHome: dir, codexSqliteHome: dir, codexLogDir: dir, codexAppLogDir: dir, now, conversationId: "current-thread" });

test("SQLite includes the already-supported codex_rmcp_client native module and excludes other services", async (t) => {
  const f = await fixture(t), db = database(f.dir);
  const add = db.prepare("INSERT INTO logs VALUES(?,?,?,?,?,?)");
  add.run(1, Math.floor(f.now / 1000), "ERROR", "codex_rmcp_client::rmcp_client", 'MCP server startup failed server_name="chatcut" error=E_NATIVE_RMCP', "current-thread");
  add.run(2, Math.floor(f.now / 1000), "ERROR", "codex_rmcp_client::rmcp_client", 'MCP server startup failed server_name="other" error=PRIVATE_OTHER_SERVICE', "current-thread");
  db.close();
  const logs = await collectHostLogs("codex", options(f));
  assert.ok(logs.entries.some(e => e.source === "codex_runtime_sqlite" && e.message.includes("E_NATIVE_RMCP")));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_OTHER_SERVICE"));
});

test("native ERROR/WARN tools/call diagnostics keep their local IDs and unknown cause without collecting echoes", async (t) => {
  const f = await fixture(t), db = database(f.dir), lines = [];
  const add = db.prepare("INSERT INTO logs VALUES(?,?,?,?,?,?)");
  let id = 0;
  for (const level of ["ERROR", "WARN"]) {
    const context = 'request{thread_id="current-thread" call_id="local-call" server_name="chatcut" method="tools/call"}: ';
    const bodies = [
      'Transport send error: E_UNFAMILIAR_CAUSE token=PRIVATE_TOKEN error={"type":"TlsError","code":"ECONNRESET","method":"tools/call","content":["native diagnostic detail"],"cause":{"message":"connection closed"}}',
      'tool call: {"params":{"arguments":{"prompt":"}: PRIVATE_ECHO"}}}',
      'tool result: {"result":{"content":[{"text":"}: PRIVATE_ECHO"}]}}',
      '{"method":"tools/call","params":{"arguments":{"prompt":"}: PRIVATE_ECHO"}}}',
      'Received response: {"result":{"content":[{"text":"}: PRIVATE_ECHO"}]}}',
      '{"type":"user_message","message":"}: PRIVATE_ECHO"}',
      'Transport failure details:\n  {"result":{"content":[{"text":"}: PRIVATE_ECHO"}]}}',
      'Transport failure details: "{\\"type\\":\\"user_message\\",\\"message\\":\\"}: PRIVATE_ECHO\\"}"',
      'prompt: PRIVATE_ECHO', 'transcript: PRIVATE_ECHO',
    ];
    for (const body of bodies) {
      add.run(++id, Math.floor(f.now / 1000), level, "codex_mcp::rmcp_client", context + body, "current-thread");
      lines.push(`${new Date(f.now).toISOString()} ${level} codex_mcp::rmcp_client: ${context}${body}`);
    }
  }
  // An INFO trace without an error diagnostic still cannot expose tool content.
  lines.push(`${new Date(f.now).toISOString()} INFO rmcp::client: request{server_name=chatcut method="tools/call"}: PRIVATE_ECHO`);
  db.close();
  await writeFile(join(f.dir, "codex-tui.log"), lines.join("\n"));
  const logs = await collectHostLogs("codex", options(f));
  const errors = logs.entries.filter(e => e.message.includes("E_UNFAMILIAR_CAUSE"));
  assert.equal(errors.length, 4, "Both native severities and both sources must survive");
  assert.ok(errors.every(e => e.message.includes('"type":"TlsError"') && e.message.includes('"cause":{"message":"connection closed"}')));
  assert.ok(errors.every(e => e.callId === "local-call" && e.conversationId === "current-thread" && e.originalAttemptMatch === "unconfirmed"));
  assert.ok(errors.every(e => !e.requestId));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_ECHO"));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_TOKEN"));
});

test("Codex TUI excludes explicit other conversations but retains unknown association", async (t) => {
  const f = await fixture(t);
  const prefix = `${new Date(f.now).toISOString()} ERROR codex_mcp::rmcp_client: `;
  await writeFile(join(f.dir, "codex-tui.log"), [
    `${prefix}request{thread_id=other-thread call_id=foreign-call server_name=chatcut}: PRIVATE_FOREIGN_ERROR`,
    `${prefix}request{thread_id=current-thread call_id=current-call server_name=chatcut}: E_CURRENT`,
    `${prefix}MCP server "chatcut": E_THREAD_UNKNOWN`,
  ].join("\n"));
  const logs = await collectHostLogs("codex", options(f));
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_FOREIGN_ERROR"));
  assert.ok(!JSON.stringify(logs).includes("foreign-call"));
  assert.ok(logs.entries.some(e => e.message.includes("E_CURRENT") && e.callId === "current-call"));
  assert.ok(logs.entries.some(e => e.message.includes("E_THREAD_UNKNOWN") && !e.conversationId && e.originalAttemptMatch === "unconfirmed"));
  const unscoped = await collectHostLogs("codex", { ...options(f), conversationId: undefined });
  assert.ok(unscoped.entries.some(e => e.conversationId === "other-thread" && e.originalAttemptMatch === "unconfirmed"));
});

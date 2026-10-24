import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { collectHostLogs } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";

// Recorded native stderr from an owned real-model Codex CLI call against a
// local read-only MCP service. TUI/SQLite below are component replay containers,
// not claims that this event was persisted there by that native session.
const line = (await readFile(new URL("./fixtures/owned-codex-mcp-tool-error.log", import.meta.url), "utf8")).trimEnd();
const now = Date.parse("2026-10-24T09:37:10Z");
const occurredAt = "2026-10-24T09:37:03.806Z";
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-native-error-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const options = dir => ({ codexHome: dir, codexSqliteHome: dir, codexLogDir: dir, codexAppLogDir: dir, now });

test("the exact owned native MCP tool error survives text and SQLite component replay", async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, "codex-tui.log"), line + "\n");
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec("CREATE TABLE logs(id INTEGER,ts INTEGER,level TEXT,target TEXT,feedback_log_body TEXT)");
  const body = line.split("codex_core::mcp_tool_call: ")[1];
  db.prepare("INSERT INTO logs VALUES(?,?,?,?,?)").run(1, now / 1000 - 7, "WARN", "codex_core::mcp_tool_call", body);
  db.close();
  const logs = await collectHostLogs("codex", options(dir));
  const text = logs.entries.find(e => e.source === "codex_tui_log");
  const sqlite = logs.entries.find(e => e.source === "codex_runtime_sqlite");
  assert.equal(text.message, line);
  assert.equal(text.occurredAt, occurredAt);
  assert.equal(sqlite.message, body);
  for (const entry of [text, sqlite]) {
    assert.ok(entry.message.includes("-32041") && entry.message.includes("E_OWNED_SOURCE"));
    assert.equal(entry.callId, undefined);
    assert.equal(entry.conversationId, undefined);
    assert.equal(entry.requestId, undefined);
    assert.equal(entry.originalAttemptMatch, "unconfirmed");
  }
});

test("exact native module support excludes other services, arbitrary core logs and content echoes", async t => {
  const dir = await fixture(t);
  await writeFile(join(dir, "codex-tui.log"), [
    line.replace("chatcut/list_projects", "chatcut_desktop/list_projects"),
    line.replace("chatcut/list_projects", "other/list_projects"),
    line.replace("codex_core::mcp_tool_call", "codex_core::unrelated"),
    line.replace("WARN", "INFO"),
    '2026-10-24T09:37:03Z WARN codex_core::mcp_tool_call: tool result server_name=chatcut {"content":[{"text":"PRIVATE_ECHO"}]}',
    '2026-10-24T09:37:03Z WARN codex_core::mcp_tool_call: Unrelated message server_name=chatcut PRIVATE_ECHO',
  ].join("\n"));
  assert.equal((await collectHostLogs("codex", options(dir))).entries.length, 0);
});

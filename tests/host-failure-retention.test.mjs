import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectHostLogs,
  runDoctor,
  fragmentEvents,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";
import { hostFailureEvidence } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-evidence.mjs";

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-host-failures-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const now = Date.parse("2026-10-23T02:18:00Z");
const options = (dir) => ({
  home: dir,
  codexHome: dir,
  codexSqliteHome: dir,
  codexLogDir: dir,
  codexAppLogDir: dir,
  claudeConfigDir: dir,
  now,
});
const report = (logs) => ({
  originalFailure: { status: "unavailable", occurredAt: null },
  hostLogs: logs,
});

test("recorded Claude native failures survive later normal debug notices within the global bound", async (t) => {
  const dir = await fixture(t);
  await mkdir(join(dir, "debug"));
  // Exact redacted native lines from the previously owned controlled report
  // 0e9e0e2a-8807-44c6-98e6-27c9e3f57ff9; no new host call is made here.
  const native = await readFile(
    new URL("./fixtures/owned-claude-mcp-error.log", import.meta.url),
    "utf8",
  );
  const notices = Array.from(
    { length: 45 },
    (_, index) =>
      `2026-10-23T02:17:${String(10 + index).padStart(2, "0")}.000Z [DEBUG] MCP server "chatcut": Normal native transport notice ${index}`,
  );
  await writeFile(join(dir, "debug", "owned.txt"), native + notices.join("\n"));
  const logs = await collectHostLogs("claude", options(dir));
  assert.equal(logs.entries.length, 30);
  assert.ok(logs.entries.some((entry) => entry.message === native.trimEnd().split("\n")[0]));
  assert.ok(logs.entries.some((entry) => entry.message.includes("Connection failed after 59ms")));
  const candidates = hostFailureEvidence(report(logs));
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].loggedAt, "2026-10-23T02:17:00.282Z");
  assert.equal(candidates[0].localCallBinding, "unconfirmed; may_not_be_the_reported_failure");
  assert.ok(logs.gaps.some((gap) => gap.reason === "failure_prioritized_log_budget"));
});

test("two nearby same-conversation failures keep separate call bindings and never fill original time", async (t) => {
  const dir = await fixture(t);
  const line = (call, second) =>
    `2026-10-23T02:17:0${second}Z ERROR codex_mcp::rmcp_client: request{server_name=chatcut thread_id=thread-original call_id=${call}}: Original failure E_${call}\n  Caused by: native cause token=PRIVATE_TOKEN\n`;
  await writeFile(join(dir, "codex-tui.log"), line("call-one", 1) + line("call-two", 2));
  const logs = await collectHostLogs("codex", options(dir));
  const failure = join(dir, "original.mcp-failure.json");
  await writeFile(
    failure,
    JSON.stringify({
      schemaVersion: 1,
      source: "host_tool_result",
      serverName: "chatcut",
      occurredAt: null,
      conversationId: "thread-original",
      callId: "call-one",
      operation: "invalid operation",
      error: { message: "E_call-one", cause: { message: "original cause" } },
    }),
  );
  const { report: saved } = await runDoctor(
    { host: "codex", failureRecord: failure, offline: true, output: join(dir, "report.json") },
    { collectLogs: async () => logs },
  );
  const evidence = saved.evidenceSummary.failureEvidence;
  assert.equal(evidence.length, 2);
  assert.match(
    evidence.find((entry) => entry.callId === "call-one").localCallBinding,
    /^same_conversation_and_call_id/,
  );
  assert.match(
    evidence.find((entry) => entry.callId === "call-two").localCallBinding,
    /^unconfirmed/,
  );
  assert.equal(saved.originalFailure.occurredAt, null);
  assert.equal(saved.originalFailure.error.cause.message, "original cause");
  assert.equal(saved.originalFailure.operation, undefined);
  assert.equal(saved.originalFailure.requestId, undefined);
  assert.equal(saved.evidenceSummary.originalRequestCorrelation.status, "unconfirmed");
  assert.ok(!JSON.stringify(saved).includes("PRIVATE_TOKEN"));
  assert.equal(evidence[0].loggedAt, "2026-10-23T02:17:01.000Z");
  assert.ok(evidence.every((entry) => entry.originalAttemptMatch === "unconfirmed"));
  const rebuilt = JSON.parse(
    fragmentEvents(saved)
      .map((event) => event.properties.attributes.mcpDoctor.fragment)
      .join(""),
  );
  assert.deepEqual(rebuilt, saved);
});

test("normal notices, other servers and content echoes do not become failure evidence", async (t) => {
  const dir = await fixture(t);
  await writeFile(
    join(dir, "codex-tui.log"),
    [
      "2026-10-23T02:17:01Z ERROR codex_mcp::rmcp_client: request{server_name=other}: PRIVATE_OTHER",
      '2026-10-23T02:17:01Z ERROR codex_mcp::rmcp_client: request{server_name=chatcut}: tool result: {"content":[{"text":"PRIVATE_ECHO"}]}',
      "2026-10-23T02:17:01Z ERROR codex_core::tools: user prompt: PRIVATE_CONVERSATION server_name=chatcut",
      '2026-10-23T02:17:01Z INFO codex_mcp::rmcp_client: MCP server "chatcut": starting connection',
    ].join("\n"),
  );
  const logs = await collectHostLogs("codex", options(dir));
  assert.equal(hostFailureEvidence(report(logs)).length, 0);
  assert.ok(!JSON.stringify(logs).includes("PRIVATE_"));
  const app = report({
    entries: [{ source: "codex_app_log", message: "status=starting error=null" }],
    gaps: [],
  });
  assert.deepEqual(hostFailureEvidence(app), []);
});

test("missing and malformed log times remain unknown while full admitted errors are preserved", async (t) => {
  const dir = await fixture(t);
  await writeFile(
    join(dir, "codex-tui.log"),
    [
      'MCP server "chatcut": Error E_NO_TIME',
      '2026-99-99T02:17:01Z ERROR codex_mcp::rmcp_client: MCP server "chatcut": Error E_BAD_TIME',
    ].join("\n"),
  );
  const logs = await collectHostLogs("codex", options(dir));
  const evidence = hostFailureEvidence(report(logs));
  assert.ok(logs.entries.some((entry) => entry.message.includes("E_NO_TIME")));
  assert.ok(evidence.some((entry) => entry.loggedAt === null));
  assert.ok(evidence.every((entry) => entry.loggedAt === null));
});

test("native failed item references preserve error objects and never masquerade as a server ID", () => {
  const sample = report({
    entries: [],
    nativeFailedCalls: [
      {
        status: "failed",
        source: "codex_native_failed_mcp_items",
        nativeItemId: "native-item",
        conversationId: "thread-original",
        idKind: "native_item_only",
        startedAtMs: now - 1000,
        completedAtMs: now,
        error: { message: "E_NATIVE", cause: { code: "ECONNRESET" } },
      },
    ],
  });
  const evidence = hostFailureEvidence(sample);
  assert.equal(evidence[0].errorText, "hostLogs.nativeFailedCalls[0].error");
  assert.equal(evidence[0].nativeItemId, "native-item");
  assert.equal(evidence[0].requestId, undefined);
  assert.equal(sample.originalFailure.status, "unavailable");
});

test("the combined host-log output prioritizes complete failure blocks within 30 records and 128 KiB", async (t) => {
  const dir = await fixture(t);
  await mkdir(join(dir, "debug"));
  for (let index = 0; index < 3; index++) {
    const line = `2026-10-23T02:17:0${index}Z [ERROR] MCP server "chatcut": E_FULL_${index} ${"X".repeat(90000)} E_UNTRIMMED_TAIL_${index}\n`;
    await writeFile(join(dir, "debug", `error-${index}.txt`), line);
  }
  const logs = await collectHostLogs("claude", options(dir));
  assert.equal(logs.entries.length, 1);
  assert.match(logs.entries[0].message, /E_UNTRIMMED_TAIL_\d$/);
  assert.ok(
    logs.entries.reduce((bytes, entry) => bytes + Buffer.byteLength(entry.message), 0) <=
      128 * 1024,
  );
  assert.ok(
    logs.gaps.some(
      (gap) =>
        gap.source === "host_logs" &&
        gap.reason === "failure_prioritized_log_budget" &&
        gap.omittedFailureRecords === 2,
    ),
  );
});

import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdtemp, mkdir, readFile, rm, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  collectHostLogs,
  runDoctor,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";
import { validateFailureRecord } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-failure.mjs";

async function temporary(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-failure-coverage-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const noLogs = async () => ({ entries: [], gaps: [] });
const time = "2026-10-23T08:01:12.345Z";
const record = (extra = {}) => ({
  schemaVersion: 1,
  source: "host_tool_result",
  serverName: "chatcut",
  occurredAt: time,
  conversationId: "failure-thread",
  callId: "call_original",
  operation: "list_projects",
  error: {
    message: "Original MCP transport failure",
    code: "E_UNFAMILIAR",
    cause: { message: "socket reset", code: "ECONNRESET" },
  },
  ...extra,
});

for (const [host, operation, message] of [
  ["codex", "initialize", "MCP server startup failed: HTTP 503"],
  [
    "codex",
    "import_media",
    "timed out awaiting tools/call after 300s; another request is still running",
  ],
  ["claude", "list_projects", "Original unfamiliar tool failure E_CC_982"],
])
  test(`${host} ${operation}: original failure time/call/cause survive absent logs and local-only collection`, async (t) => {
    const dir = await temporary(t);
    const failureRecord = join(dir, "original.mcp-failure.json");
    await writeFile(
      failureRecord,
      JSON.stringify(
        record({
          operation,
          error: {
            message,
            code: "E_UNFAMILIAR",
            cause: { message: "native cause", code: "E_NATIVE" },
          },
        }),
      ),
    );
    let logOptions;
    const { report } = await runDoctor(
      { host, failureRecord, output: join(dir, "report.json") },
      {
        collectLogs: async (_, options) => {
          logOptions = options;
          return noLogs();
        },
        fetchImpl: () => {
          throw Error("No endpoint: a new network request is forbidden");
        },
      },
    );
    assert.equal(report.originalFailure.occurredAt, time);
    assert.equal(logOptions.occurredAt, time);
    assert.equal(logOptions.conversationId, "failure-thread");
    assert.equal(report.originalFailure.error.cause.code, "E_NATIVE");
    assert.equal(report.originalFailure.message, message);
    assert.equal(report.evidenceSummary.originalLocalCall.callId, "call_original");
    assert.equal(report.evidenceSummary.originalRequestCorrelation.status, "unconfirmed");
    assert.ok(report.evidenceSummary.gaps.includes("original_request_id_unavailable"));
    assert.equal(report.evidenceSummary.recoveryVerified, false);
  });

test("a real refused connection retains the native cause without inventing a server request ID", async (t) => {
  const dir = await temporary(t);
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  let failure;
  try {
    await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) });
  } catch (error) {
    failure = error;
  }
  assert.equal(failure.cause.code, "ECONNREFUSED");
  const failureRecord = join(dir, "refused.mcp-failure.json");
  await writeFile(
    failureRecord,
    JSON.stringify(
      record({
        occurredAt: null,
        error: {
          name: failure.name,
          message: failure.message,
          cause: { message: failure.cause.message, code: failure.cause.code },
        },
      }),
    ),
  );
  const { report } = await runDoctor(
    { host: "codex", failureRecord, output: join(dir, "report.json") },
    { collectLogs: noLogs },
  );
  assert.equal(report.originalFailure.error.cause.code, "ECONNREFUSED");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.originalFailure.requestId, undefined);
  assert.ok(report.evidenceSummary.gaps.includes("original_failure_time_unavailable"));
});

test("Windows startup-only records cannot close the tool failure evidence gap", async (t) => {
  const dir = await temporary(t);
  const { report } = await runDoctor(
    { host: "codex", output: join(dir, "report.json") },
    {
      collectLogs: async () => ({
        entries: ["starting", "cancelled", "ready"].map((status) => ({
          source: "codex_app_log",
          message: `status=${status} threadId=failure-thread`,
        })),
        gaps: [],
      }),
    },
  );
  assert.equal(report.evidenceSummary.hostLogCoverage.appStartupRecords, 3);
  assert.equal(report.evidenceSummary.hostLogCoverage.failedAppStartupRecords, 0);
  assert.ok(report.evidenceSummary.gaps.includes("matching_host_failure_logs_unavailable"));
  assert.equal(report.originalFailure.occurredAt, null);
});

test("bounded App collection names omitted files and allows a targeted native-file follow-up", async (t) => {
  const dir = await temporary(t);
  const now = Date.now();
  const dateDir = join(dir, new Date(now).toISOString().slice(0, 10).replaceAll("-", "/"));
  await mkdir(dateDir, { recursive: true });
  let selected;
  for (let i = 0; i < 4; i++) {
    const path = join(dateDir, `codex-desktop-file-${i}.log`);
    await writeFile(
      path,
      `${new Date(now).toISOString()} info [AppServerConnection] mcp_server_startup_status_updated error="E_FILE_${i}" failureReason=null hostId=local server=chatcut status=failed threadId=failure-thread\n`,
    );
    await utimes(path, new Date(now - i * 1000), new Date(now - i * 1000));
    if (i === 3) selected = path;
  }
  const options = {
    home: dir,
    codexHome: dir,
    codexAppLogDir: dir,
    conversationId: "failure-thread",
    now,
  };
  const initial = await collectHostLogs("codex", options);
  const gap = initial.gaps.find((g) => g.reason === "log_file_limit");
  assert.deepEqual(gap.omittedFiles, ["codex-desktop-file-3.log"]);
  assert.ok(!initial.entries.some((e) => e.message.includes("E_FILE_3")));
  const followup = await collectHostLogs("codex", { ...options, codexAppLogFiles: [selected] });
  assert.equal(followup.appLog.selectedFileMode, true);
  assert.deepEqual(followup.appLog.filesSelected, ["codex-desktop-file-3.log"]);
  assert.equal(followup.appLog.conversationId, "failure-thread");
  assert.ok(followup.entries.some((e) => e.message.includes("E_FILE_3")));
  await assert.rejects(
    collectHostLogs("codex", { ...options, codexAppLogFiles: [join(dir, "credentials.json")] }),
    /./,
  );
});

test("dedicated records preserve unknown errors, redact credentials, and keep conflicting timestamps unresolved", async (t) => {
  const dir = await temporary(t);
  const failureRecord = join(dir, "secret.mcp-failure.json");
  await writeFile(
    failureRecord,
    JSON.stringify(
      record({
        error: {
          message:
            "Unknown tool_call transcript E_NEW_183; Authorization: Bearer private-canary-123",
          code: "E_NEW_183",
          cause: { message: "original cause remains", access_token: "private-token-canary" },
        },
      }),
    ),
  );
  const { report } = await runDoctor(
    {
      host: "codex",
      failureRecord,
      occurredAt: "2026-10-23T08:02:00Z",
      output: join(dir, "report.json"),
    },
    { collectLogs: noLogs },
  );
  assert.equal(report.originalFailure.occurredAt, null);
  assert.ok(report.gaps.some((g) => g.reason === "conflicting_supplied_failure_times"));
  assert.match(report.originalFailure.message, /tool_call transcript E_NEW_183/);
  assert.match(report.originalFailure.error.cause.message, /original cause remains/);
  assert.doesNotMatch(JSON.stringify(report), /private-canary-123|private-token-canary/);
  assert.throws(
    () => validateFailureRecord(record({ arguments: { private: true } })),
    /dedicated failure record/,
  );
  assert.throws(
    () => validateFailureRecord(record({ serverName: "chatcut_desktop" })),
    /hosted ChatCut/,
  );
});

test("both host packages ship the dedicated failure reader", async () => {
  assert.equal(
    await readFile(
      new URL("../codex/skills/chatcut-plugin-basics/scripts/mcp-failure.mjs", import.meta.url),
      "utf8",
    ),
    await readFile(
      new URL(
        "../claude/skills/chatcut-plugin-basics-claude/scripts/mcp-failure.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});

test("a known App segment can recover a native failure outside the tail without reading the entire file", async (t) => {
  const dir = await temporary(t);
  const now = Date.now();
  const app = join(dir, "codex-desktop-selected.log");
  const error = `${new Date(now).toISOString()} info [AppServerConnection] mcp_server_startup_status_updated error="E_PREFIX_ORIGINAL" failureReason=null hostId=local server=chatcut status=failed threadId=failure-thread\n`;
  await writeFile(app, error + "irrelevant UI record\n".repeat(16000));
  const options = {
    home: dir,
    codexHome: dir,
    codexAppLogDir: dir,
    codexAppLogFiles: [app],
    conversationId: "failure-thread",
    now,
  };
  const tail = await collectHostLogs("codex", options);
  assert.ok(!tail.entries.some((e) => e.message.includes("E_PREFIX_ORIGINAL")));
  const tailGap = tail.gaps.find((g) => g.reason === "only_log_tail_read");
  assert.equal(tailGap.sourceFile, "codex-desktop-selected.log");
  assert.ok(tailGap.omittedBytes > 0);
  const first = await collectHostLogs("codex", { ...options, codexAppLogOffset: 0 });
  assert.ok(first.entries.some((e) => e.message.includes("E_PREFIX_ORIGINAL")));
  assert.equal(first.appLog.selectedByteOffset, 0);
  assert.ok(
    first.gaps.some(
      (g) =>
        g.reason === "only_log_segment_read" && g.bytesRead <= 128 * 1024 && g.remainingBytes > 0,
    ),
  );
});

test("native runtime trace call/thread identifiers survive extraction without becoming a cloud request ID", async (t) => {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = await temporary(t);
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec(
    "CREATE TABLE logs(id INTEGER, ts INTEGER, level TEXT, target TEXT, feedback_log_body TEXT, thread_id TEXT)",
  );
  const add = db.prepare("INSERT INTO logs VALUES(?,?,?,?,?,?)");
  add.run(
    1,
    Math.floor(Date.now() / 1000),
    "ERROR",
    "codex_mcp::rmcp_client",
    "session{thread_id=failure-thread}:invoke{server_name=chatcut call_id=call_native}: Original native error E_CAUSE_381",
    "failure-thread",
  );
  add.run(
    2,
    Math.floor(Date.now() / 1000),
    "ERROR",
    "codex_mcp::rmcp_client",
    "session{thread_id=other-thread}:invoke{server_name=chatcut call_id=call_other}: Private other-thread failure",
    "other-thread",
  );
  db.close();
  const logs = await collectHostLogs("codex", { codexHome: dir, conversationId: "failure-thread" });
  const selected = logs.entries.find((e) => e.source === "codex_runtime_sqlite");
  assert.equal(selected.conversationId, "failure-thread");
  assert.equal(selected.callId, "call_native");
  assert.equal(selected.requestId, undefined);
  assert.equal(selected.originalAttemptMatch, "unconfirmed");
  assert.match(selected.message, /E_CAUSE_381/);
  assert.doesNotMatch(JSON.stringify(logs), /Private other-thread failure/);
});

for (const [host, location] of [
  ["codex", "codex/skills/chatcut-plugin-basics"],
  ["claude", "claude/skills/chatcut-plugin-basics-claude"],
])
  test(`${host} published CLI accepts the original failure record without contacting a server`, async (t) => {
    const dir = await temporary(t);
    const failureRecord = join(dir, "cli.mcp-failure.json");
    const output = join(dir, "cli-report.json");
    await writeFile(failureRecord, JSON.stringify(record()));
    const cli = fileURLToPath(new URL(`../${location}/scripts/mcp-doctor.mjs`, import.meta.url));
    await promisify(execFile)(
      process.execPath,
      [cli, "--host", host, "--failure-record", failureRecord, "--output", output],
      {
        env: {
          ...process.env,
          CODEX_HOME: dir,
          CODEX_SQLITE_HOME: dir,
          LOCALAPPDATA: dir,
          CLAUDE_CONFIG_DIR: dir,
        },
        timeout: 10000,
      },
    );
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.equal(report.originalFailure.occurredAt, time);
    assert.equal(report.originalFailure.callId, "call_original");
    assert.equal(report.originalFailure.error.cause.code, "ECONNRESET");
    assert.equal(report.upload.status, "skipped_endpoint_unavailable");
    assert.equal(report.probes.length, 0);
  });

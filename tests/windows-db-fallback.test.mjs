import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";

const error = { message: "Unfamiliar provider error E_FALLBACK_NEW: transcript/tool_call are native error words",
  code: "E_UNFAMILIAR_1024", cause: { type: "OpaqueNativeError", message: "Keep this original cause" } };

test("the bundled basics CLI saves an offline report even when upload is also requested", async t => {
  const { dir, failure } = await fixture(t), output = join(dir, "cli.mcp-report.json");
  const helper = fileURLToPath(new URL("../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs", import.meta.url));
  await promisify(execFile)(process.execPath, [helper, "--host", "claude", "--server-url", "http://127.0.0.1:1/api/external-mcp/mcp", "--failure-record", failure, "--output", output, "--offline", "--upload"]);
  const report = JSON.parse(await readFile(output, "utf8"));
  assert.equal(report.collectorVersion, "1.2.4");
  assert.deepEqual(report.originalFailure.error, error);
  assert.equal(report.upload.status, "skipped_offline");
  assert.equal(report.entryProbe, undefined);
  assert.equal(report.probes.length, 0);
  assert.ok(report.gaps.some(g => g.reason === "offline_requested; no_requests_sent"));
});
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-db-fallback-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const failure = join(dir, "original.mcp-failure.json");
  await writeFile(failure, JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "chatcut",
    occurredAt: null, operation: "list_projects", error }));
  return { dir, failure };
}
// Windows error14 is supplied as an owned unit fixture here. Real MXC access
// failure and native-source continuation are verified separately, not simulated
// by changing permissions, corrupting a user database or copying its WAL.
const dbGaps = ["codex_runtime_sqlite", "codex_native_failed_mcp_items"].map(source => ({
  source, reason: "unavailable", operation: "select_failed_mcp_items",
  error: { code: "ERR_SQLITE_ERROR", errcode: 14, message: "unable to open database file" },
}));

test("database errors do not replace the visible original error or independent App evidence", async t => {
  const { dir, failure } = await fixture(t);
  const { report, path } = await runDoctor({ host: "codex", failureRecord: failure, offline: true, output: join(dir, "fallback.mcp-report.json") }, {
    fetchImpl: () => assert.fail("No fallback network requests"),
    collectLogs: async () => ({ entries: [{ source: "codex_app_log", occurredAt: "2026-10-24T10:00:00Z",
      message: '2026-10-24T10:00:00Z warning [AppServerConnection] mcp_server_startup_status_updated error="PRIVATE_APP_ERROR" server=chatcut status=failed threadId=null',
      originalAttemptMatch: "unconfirmed" }], gaps: dbGaps, nativeFailedCalls: [] }),
  });
  assert.deepEqual(report.originalFailure.error, error);
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.originalFailure.callId, undefined);
  assert.equal(report.originalFailure.requestId, undefined);
  const coverage = report.evidenceSummary.hostLogCoverage;
  assert.equal(coverage.originalErrorRetainedWithoutDatabase, true);
  assert.equal(coverage.databaseReadFailures.length, 2);
  assert.ok(coverage.databaseReadFailures.every(g => g.errcode === 14));
  assert.equal(coverage.appStartupRecords, 1);
  assert.equal(coverage.failedAppStartupRecords, 1);
  assert.equal(coverage.priorStderrCaptureRequired, false);
  assert.equal(coverage.retainedStderrRecords, 0);
  assert.equal(report.upload.status, "skipped_offline");
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")).originalFailure.error, error);
});

test("an unexpected runtime collector exception still produces the saved original error and explicit coverage", async t => {
  const { dir, failure } = await fixture(t);
  const { report, path } = await runDoctor({ host: "codex", failureRecord: failure, offline: true, output: join(dir, "collector-failed.mcp-report.json") }, {
    collectLogs: async () => { throw Object.assign(Error("Unexpected runtime read failure"), { code: "ERR_SQLITE_ERROR", errcode: 14 }); },
  });
  assert.deepEqual(report.originalFailure.error, error);
  assert.equal(report.evidenceSummary.hostLogCoverage.originalErrorRetained, true);
  assert.equal(report.evidenceSummary.hostLogCoverage.runtimeCollectionFailed, true);
  assert.equal(report.hostLogs.gaps[0].error.errcode, 14);
  assert.ok((await readFile(path, "utf8")).includes("E_FALLBACK_NEW"));
});

test("database failure without an exposed original error is not called successful original capture", async t => {
  const { dir } = await fixture(t);
  const { report } = await runDoctor({ host: "codex", offline: true, output: join(dir, "unknown.mcp-report.json") }, {
    collectLogs: async () => ({ entries: [], gaps: dbGaps, nativeFailedCalls: [] }),
  });
  assert.equal(report.evidenceSummary.hostLogCoverage.originalErrorRetained, false);
  assert.equal(report.evidenceSummary.hostLogCoverage.originalErrorRetainedWithoutDatabase, false);
  assert.equal(report.originalFailure.occurredAt, null);
});

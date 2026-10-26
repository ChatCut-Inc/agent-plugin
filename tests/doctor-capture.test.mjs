import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { capture, projectNativeLookup } from "../codex/skills/chatcut-mcp-doctor/scripts/capture.mjs";
import { recordRecheck } from "../codex/skills/chatcut-mcp-doctor/scripts/record-recheck.mjs";

async function temp(t) {
  const dir = await mkdtemp(join(tmpdir(), "doctor-capture-"));
  t.after(() => rm(dir, { recursive: true, force: true })); return dir;
}
const deps = { collectLogs: async () => ({ entries: [], gaps: [] }), fetchImpl: () => assert.fail("offline must not fetch") };

test("explicit offline collection does not select an old original file or create an active-case", async t => {
  const cwd = await temp(t);
  await writeFile(join(cwd, "original.mcp-error.txt"), "STALE_OR_UNRELATED_ERROR");
  const receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(receipt.savedReportVerified, true);
  assert.equal(receipt.originalInput, null);
  assert.equal(report.originalFailure.status, "unavailable");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.upload.status, "skipped_offline");
  assert.equal(receipt.lookupResult, "unavailable");
  assert.deepEqual((await readdir(join(cwd, ".chatcut-doctor"))).length, 1);
  assert.ok(!JSON.stringify(report).includes("STALE_OR_UNRELATED_ERROR"));
});

test("offline project projection excludes credentials and active-session claims", async t => {
  const cwd = await temp(t), url = "http://127.0.0.1:1234/api/external-mcp/mcp";
  await writeFile(join(cwd, ".mcp.json"), JSON.stringify({ mcpServers: { chatcut: { type: "http", url,
    headers: { "x-private": "PRIVATE_HEADER" }, env: { PRIVATE: "PRIVATE_ENV" } }, other: { url: "PRIVATE_OTHER" } } }));
  const receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.serverUrl, url);
  assert.equal(report.hostSnapshot.configuration.enabled, null);
  assert.equal(report.hostSnapshot.session, undefined);
  for (const secret of ["PRIVATE_HEADER", "PRIVATE_ENV", "PRIVATE_OTHER"]) assert.ok(!JSON.stringify({ report, receipt }).includes(secret));
});

test("native lookup requires opt-in and only exact absence can become not_found", async t => {
  const absent = 'No MCP server named "chatcut". Run `claude mcp add` to add one.';
  for (const result of [ { code: 1, stdout: "unfamiliar failure" }, { code: null, errorCode: "EACCES" },
    { code: null, errorCode: "lookup_timeout" }, { code: 0, stdout: "{}" }, { code: 1, stdout: absent + "\nother failure" } ])
    assert.equal(projectNativeLookup("claude", "chatcut", result).lookupResult, "unavailable");
  const cwd = await temp(t); let calls = 0;
  const receipt = await capture({ host: "claude", cwd, nativeLookup: true }, { ...deps, nativeRegistration: async () => {
    calls++; return projectNativeLookup("claude", "chatcut", { code: 1, stdout: absent });
  } });
  assert.equal(calls, 1);
  assert.equal(receipt.nativeLookupMayConnect, true);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.originalFailure.status, "unavailable");
  assert.equal(report.hostSnapshot.observations[0].lookupResult, "not_found");
});

test("explicit original preserves message/cause/HTTP despite invalid optional metadata", async t => {
  const cwd = await temp(t), failureRecord = join(cwd, "visible.mcp-failure.json");
  const input = JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "chatcut",
    occurredAt: "unknown", callId: { invalid: true }, operation: "list_projects",
    httpResponse: { source: "host_original_error_response", status: 200, headers: { "Content-Length": "12" }, body: "EXPOSED_BYTES", bodyComplete: false },
    error: { message: "E_VISIBLE opaque failure", cause: { code: "EXPOSED_CAUSE" } } });
  await writeFile(failureRecord, input);
  const receipt = await capture({ host: "claude", cwd, failureRecord }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.collectorVersion, "1.2.6");
  assert.equal(report.originalFailure.message, "E_VISIBLE opaque failure");
  assert.equal(report.originalFailure.error.cause.code, "EXPOSED_CAUSE");
  assert.equal(report.originalFailure.httpResponse.body, "EXPOSED_BYTES");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.originalFailure.callId, undefined);
  assert.equal(await readFile(failureRecord, "utf8"), input);
});

test("same original supports failure then success and concurrent observations without replacing bytes", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd }, deps);
  const original = await readFile(receipt.report), result = join(cwd, "actual-tool-result.txt");
  const options = { report: receipt.report, host: "claude", result, operation: "list_projects", configScope: "project /fixture/.mcp.json" };
  await writeFile(result, "E_NATIVE_FAILURE");
  const failed = await recordRecheck({ ...options, outcome: "failed" });
  await writeFile(result, '{"projects":[]}');
  const successes = await Promise.all([recordRecheck({ ...options, outcome: "success" }), recordRecheck({ ...options, outcome: "success" })]);
  assert.equal(new Set([failed.path, ...successes.map(x => x.path)]).size, 3);
  for (const observation of [failed, ...successes]) {
    assert.equal(observation.sourceReportSha256, receipt.sourceReportSha256);
    assert.equal(observation.observedAt, null);
    assert.equal(observation.callId, null);
    assert.equal(observation.projectId, null);
    assert.equal(observation.accountAuthentication, "unconfirmed");
    assert.equal(observation.recoveryVerified, false);
    assert.equal(JSON.parse(await readFile(observation.path)).outcome, observation.outcome);
  }
  assert.deepEqual(await readFile(receipt.report), original);
});

test("explicit report remains the baseline across another host and any age; no implicit fallback", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  report.collectedAt = "2000-01-01T00:00:00.000Z";
  await writeFile(receipt.report, JSON.stringify(report));
  const later = await capture({ host: "codex", cwd }, deps);
  const result = join(cwd, "native-result.txt"); await writeFile(result, '{"projects":[]}');
  const observation = await recordRecheck({ report: receipt.report, host: "codex", result, operation: "list_projects", outcome: "success" });
  assert.equal(observation.diagnosticId, receipt.diagnosticId);
  assert.notEqual(observation.diagnosticId, later.diagnosticId);
  assert.equal(observation.host, "codex");
  assert.equal(observation.originalAttemptAssociation, "unconfirmed");
  await assert.rejects(recordRecheck({ activeCase: true, cwd, result }), /Explicit --report/);
});

test("content-only native MCP results append after failure without manufacturing projects or structuredContent", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd }, deps);
  const original = await readFile(receipt.report), result = join(cwd, "native-result.json");
  const options = { report: receipt.report, host: "claude", result, operation: "list_projects" };
  await writeFile(result, JSON.stringify({ content: [{ type: "text", text: "original native read failed" }], isError: true }));
  const failed = await recordRecheck({ ...options, outcome: "failed" });
  const exposed = { content: [{ type: "text", text: "actual native safe-read result; no structured fields exposed" }], isError: false };
  await writeFile(result, JSON.stringify(exposed));
  const succeeded = await recordRecheck({ ...options, outcome: "success" });
  assert.notEqual(failed.path, succeeded.path);
  assert.equal(succeeded.sourceReportSha256, receipt.sourceReportSha256);
  assert.equal(failed.sourceReportSha256, succeeded.sourceReportSha256);
  assert.deepEqual(JSON.parse(succeeded.message), exposed);
  assert.equal(succeeded.recoveryVerified, false);
  assert.equal(succeeded.originalAttemptAssociation, "unconfirmed");
  assert.deepEqual(await readFile(receipt.report), original);
});

test("a different actual Hosted safe read is preserved without a hardcoded operation or invented schema", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd }, deps);
  const result = join(cwd, "native-result.txt");
  await writeFile(result, '{"projectId":"project-1","assets":[]}');
  const observation = await recordRecheck({ report: receipt.report, host: "claude", result, operation: "inspect_project", outcome: "success", projectId: "project-1" });
  assert.equal(observation.operation, "inspect_project");
  assert.equal(observation.projectId, "project-1");
  assert.equal(observation.recoveryVerified, false);
});

test("configuration, tool lists, HTTP probes, failed results and different endpoints cannot establish a native success", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd, serverUrl: "http://127.0.0.1:1234/api/external-mcp/mcp" }, deps);
  const result = join(cwd, "native-result.txt");
  const options = { report: receipt.report, host: "claude", result, operation: "list_projects", outcome: "success" };
  for (const text of ['chatcut:\n Status: Connected', '{"name":"chatcut","transport":{"url":"http://127.0.0.1/"}}', '{"isError":true,"projects":[]}', '{"tools":[]}', '{"status":200,"body":"{}"}']) {
    await writeFile(result, text);
    await assert.rejects(recordRecheck(options), /actually exposed native tool result/);
  }
  await writeFile(result, '{"projects":[]}');
  await assert.rejects(recordRecheck({ ...options, source: "independent_http_probe" }), /not native tool results/);
  await assert.rejects(recordRecheck({ ...options, serverUrl: "http://127.0.0.1:5678/api/external-mcp/mcp" }), /Different target service/);
  await assert.rejects(recordRecheck({ ...options, observedAt: "yesterday" }), /Observed time/);
});

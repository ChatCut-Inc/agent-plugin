import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("fresh offline capture writes and verifies a current report even without any registration or original error", async t => {
  const cwd = await temp(t);
  const receipt = await capture({ host: "claude", cwd }, { ...deps, nativeRegistration: () => assert.fail("offline must not invoke native get") });
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(receipt.savedReportVerified, true);
  assert.equal(report.originalFailure.status, "unavailable");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(receipt.lookupResult, "unavailable");
  assert.ok(receipt.findings.some(x => x.kind === "registration_lookup_unavailable"));
  assert.ok(!receipt.findings.some(x => x.kind === "not_registered"));
  assert.equal(report.upload.status, "skipped_offline");
  const second = await capture({ host: "claude", cwd }, deps);
  assert.notEqual(receipt.report, second.report);
  assert.notEqual(receipt.diagnosticId, second.diagnosticId);
  assert.ok((await readFile(receipt.chineseNote, "utf8")).includes(receipt.diagnosticId));
});

test("offline project projection excludes headers, environment, unrelated entries and active-session claims", async t => {
  const cwd = await temp(t), url = "http://127.0.0.1:1234/api/external-mcp/mcp";
  await writeFile(join(cwd, ".mcp.json"), JSON.stringify({ mcpServers: { chatcut: { type: "http", url,
    headers: { "x-private": "PRIVATE_HEADER" }, env: { PRIVATE: "PRIVATE_ENV" } }, other: { url: "PRIVATE_OTHER" } } }));
  const receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.serverUrl, url);
  assert.equal(report.hostSnapshot.configuration.enabled, null);
  assert.equal(report.hostSnapshot.session, undefined);
  const all = JSON.stringify({ report, receipt }) + await readFile(receipt.chineseNote, "utf8");
  for (const secret of ["PRIVATE_HEADER", "PRIVATE_ENV", "PRIVATE_OTHER"]) assert.ok(!all.includes(secret));
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
  assert.ok(receipt.findings.some(x => x.kind === "not_registered"));
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.originalFailure.status, "unavailable");
  assert.equal(report.hostSnapshot.observations[0].message, absent);
});

test("saved visible errors are formatted by the program with known operation and unknown original IDs/time", async t => {
  const cwd = await temp(t), originalError = join(cwd, "original.mcp-error.txt");
  await writeFile(originalError, "E_VISIBLE opaque failure; Authorization: Bearer SECRET\n");
  const receipt = await capture({ host: "claude", cwd, originalError, operation: "list_projects" }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.originalFailure.operation, "list_projects");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(report.originalFailure.callId, undefined);
  assert.ok(report.originalFailure.message.includes("E_VISIBLE"));
  assert.ok(!JSON.stringify(report).includes("SECRET"));
  assert.ok(receipt.findings.some(x => x.kind === "tool_call_failed"));
});

test("native pre-render capture automatically includes an existing reserved original error record", async t => {
  const cwd = await temp(t), path = join(cwd, "original.mcp-failure.json");
  const original = JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "plugin:chatcut:chatcut",
    occurredAt: null, operation: "list_projects", error: { message: "E_SAVED_VISIBLE", cause: { code: "EXPOSED_CAUSE" } } });
  await writeFile(path, original);
  const receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(receipt.originalInput, path);
  assert.equal(report.originalFailure.message, "E_SAVED_VISIBLE");
  assert.equal(report.originalFailure.operation, "list_projects");
  assert.equal(report.originalFailure.error.cause.code, "EXPOSED_CAUSE");
  assert.equal(report.originalFailure.occurredAt, null);
  assert.equal(await readFile(path, "utf8"), original);
});

test("native pre-render capture includes the reserved saved plain error without guessing an operation", async t => {
  const cwd = await temp(t), path = join(cwd, "original.mcp-error.txt");
  await writeFile(path, "E_SAVED_TEXT");
  const receipt = await capture({ host: "claude", cwd }, deps);
  const report = JSON.parse(await readFile(receipt.report));
  assert.equal(report.originalFailure.message, "E_SAVED_TEXT");
  assert.equal(report.originalFailure.operation, undefined);
  assert.equal(receipt.originalInput, path);
});

test("safe recheck record binds an immutable original report and never overwrites a prior observation", async t => {
  const cwd = await temp(t), receipt = await capture({ host: "claude", cwd }, deps);
  const original = await readFile(receipt.report), result = join(cwd, "read.mcp-recheck.txt");
  await writeFile(result, "Controlled unauthenticated service returned []");
  const options = { report: receipt.report, result, operation: "list_projects", outcome: "success", scope: "Same project and isolated profile; explicit new session loaded project .mcp.json" };
  const recheck = await recordRecheck(options);
  assert.equal(recheck.sourceReportSha256, receipt.sourceReportSha256);
  assert.equal(recheck.observedAt, null);
  assert.equal(recheck.accountAuthentication, "unconfirmed");
  assert.deepEqual(await readFile(receipt.report), original);
  await assert.rejects(recordRecheck(options), /EEXIST/);
  assert.deepEqual(await readFile(receipt.report), original);
});

test("follow-up entry baseline cannot replace the active incident report for recheck", async t => {
  const cwd = await temp(t), result = join(cwd, "read.mcp-recheck.txt");
  const first = await capture({ host: "claude", cwd, nativeLookup: true }, { ...deps, nativeRegistration: async () => ({ lookupResult: "not_found", message: "Exact native scoped no-entry response" }) });
  const baseline = await capture({ host: "claude", cwd }, deps);
  assert.notEqual(baseline.diagnosticId, first.diagnosticId);
  assert.equal(baseline.activeReport.diagnosticId, first.diagnosticId);
  await writeFile(result, "actual safe native read returned []");
  const recheck = await recordRecheck({ activeCase: true, cwd, result, operation: "list_projects", outcome: "success", scope: "same project; explicit new session" });
  assert.equal(recheck.diagnosticId, first.diagnosticId);
  assert.equal(recheck.sourceReportSha256, first.sourceReportSha256);
});

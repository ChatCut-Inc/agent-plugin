import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  failureFromRecord,
  validateFailureRecord,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-failure.mjs";

const time = "2026-10-25T08:01:12.345Z";
const original = () => ({
  schemaVersion: 1,
  source: "host_tool_result",
  serverName: "chatcut",
  occurredAt: time,
  conversationId: "original-thread",
  callId: "original-call",
  operation: "list_projects",
  requestId: "original-request",
  error: {
    message: "Original unfamiliar E_ORIGINAL_492",
    code: "E_ORIGINAL_492",
    cause: { message: "native socket failure", code: "ECONNRESET" },
  },
});

for (const field of ["conversationId", "callId", "operation", "requestId"])
  test(`rejecting optional ${field} preserves independent failure evidence`, () => {
    for (const value of [
      "codex mcp login chatcut",
      { access_token: "private-canary" },
      42,
      "x".repeat(257),
    ]) {
      const input = { ...original(), [field]: value };
      const before = structuredClone(input);
      assert.throws(() => validateFailureRecord(input), /Invalid original failure/);
      const failure = failureFromRecord(input);
      assert.equal(failure.status, "recorded");
      assert.deepEqual(failure.error, input.error);
      assert.equal(failure.occurredAt, time);
      assert.equal(failure[field], undefined);
      for (const key of ["conversationId", "callId", "operation", "requestId"])
        if (key !== field) assert.equal(failure[key], input[key]);
      assert.deepEqual(failure.metadataGaps, [
        { field, reason: "invalid_optional_metadata; value_omitted" },
      ]);
      assert.deepEqual(input, before);
      assert.doesNotMatch(JSON.stringify(failure), /private-canary|codex mcp login/);
    }
  });

test("invalid or absent failure time remains unknown while the error survives", () => {
  for (const occurredAt of [
    undefined,
    "yesterday",
    "2026-10-25T08:00:00",
    "2026-99-99T08:00:00Z",
  ]) {
    const input = { ...original(), occurredAt };
    assert.throws(() => validateFailureRecord(input), /occurredAt/);
    const failure = failureFromRecord(input);
    assert.equal(failure.occurredAt, null);
    assert.equal(failure.timeSource, "unavailable");
    assert.deepEqual(failure.error, input.error);
    assert.equal(failure.metadataGaps[0].field, "occurredAt");
  }
  const valid = original();
  assert.equal(validateFailureRecord(valid), valid);
  assert.equal(failureFromRecord(valid).metadataGaps, undefined);
  assert.equal(failureFromRecord({ ...valid, occurredAt: null }).metadataGaps, undefined);
});

test("optional metadata recovery still rejects transcripts, wrong sources, and missing errors", () => {
  for (const input of [
    null,
    [],
    { ...original(), arguments: { private: "must-not-read" }, operation: "bad hint" },
    { ...original(), source: "conversation", operation: "bad hint" },
    { ...original(), serverName: "chatcut_desktop", operation: "bad hint" },
    { ...original(), error: { message: "" }, operation: "bad hint" },
  ])
    assert.throws(() => failureFromRecord(input));
});

for (const [host, location] of [
  ["codex", "codex/skills/chatcut-plugin-basics"],
  ["claude", "claude/skills/chatcut-plugin-basics-claude"],
])
  test(`${host} shipped CLI saves sanitized failure evidence and explicit summary gaps`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), "chatcut-metadata-regression-"));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const module = await import(new URL(`../${location}/scripts/mcp-doctor.mjs`, import.meta.url));
    for (const occurredAt of [time, "invalid-time-private-canary"]) {
      const suffix = occurredAt === time ? "known-time" : "unknown-time";
      const input = {
        ...original(),
        occurredAt,
        operation: "codex mcp login chatcut",
        requestId: "Bearer private-request-canary",
        error: {
          ...original().error,
          message: "E_ORIGINAL_492 Authorization: Bearer private-error-canary",
          cause: { message: "original native cause", access_token: "private-cause-canary" },
        },
      };
      const failureRecord = join(dir, `${suffix}.mcp-failure.json`);
      const output = join(dir, `${suffix}.json`);
      await writeFile(failureRecord, JSON.stringify(input));
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
      assert.equal(report.originalFailure.status, "recorded");
      assert.match(report.originalFailure.message, /E_ORIGINAL_492/);
      assert.equal(report.originalFailure.error.cause.message, "original native cause");
      assert.equal(report.originalFailure.occurredAt, occurredAt === time ? time : null);
      assert.equal(report.originalFailure.conversationId, "original-thread");
      assert.equal(report.originalFailure.callId, "original-call");
      assert.equal(report.originalFailure.operation, undefined);
      assert.equal(report.originalFailure.requestId, undefined);
      assert.equal(report.evidenceSummary.originalLocalCall.callId, "original-call");
      assert.equal(report.evidenceSummary.originalLocalCall.operation, null);
      assert.equal(report.evidenceSummary.originalRequestCorrelation.status, "unconfirmed");
      assert.ok(report.evidenceSummary.gaps.includes("original_failure_operation_rejected"));
      assert.ok(report.evidenceSummary.gaps.includes("original_request_id_unavailable"));
      assert.ok(!report.evidenceSummary.gaps.includes("original_failure_unavailable"));
      if (occurredAt !== time)
        assert.ok(report.evidenceSummary.gaps.includes("original_failure_time_unavailable"));
      assert.ok(
        report.gaps.some((gap) => gap.source === "original_failure" && gap.field === "operation"),
      );
      assert.ok(!report.gaps.some((gap) => gap.reason === "failure_record_unavailable"));
      assert.equal(report.probes.length, 0);
      assert.equal(report.upload.status, "skipped_endpoint_unavailable");
      assert.doesNotMatch(JSON.stringify(report), /private-[a-z-]*canary|codex mcp login/);
      const fragments = module.fragmentEvents(report);
      const reassembled = JSON.parse(
        fragments.map((event) => event.properties.attributes.mcpDoctor.fragment).join(""),
      );
      assert.deepEqual(reassembled, report);
    }
  });

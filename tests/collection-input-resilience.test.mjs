import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { failureFromRecord } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-failure.mjs";
import {
  snapshotFromRecord,
  validateSnapshot,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-evidence.mjs";

const instant = "2026-10-26T03:00:00.123Z";
const original = (extra) => ({
  schemaVersion: 1,
  source: "host_tool_result",
  serverName: "chatcut",
  occurredAt: instant,
  conversationId: "original-thread",
  callId: "original-call",
  operation: "browser_execute",
  error: {
    message: "Original browser task failed E_BROWSER_126",
    code: "E_BROWSER_126",
    cause: { message: "native cause remains", code: "ECONNRESET" },
  },
  ...extra,
});
const response = (extra) => ({
  source: "host_original_error_response",
  status: 502,
  headers: {
    "X-Request-ID": "original-server-request",
    "content-type": "application/json",
    "Mcp-Session-Id": "PRIVATE_SESSION",
    Cookie: "sid=PRIVATE_COOKIE",
    "Set-Cookie": "sid=PRIVATE_SET_COOKIE",
    Authorization: "Bearer PRIVATE_AUTH",
    "Proxy-Authorization": "Basic PRIVATE_PROXY_AUTH",
    "X-Api-Key": "PRIVATE_API_KEY",
  },
  body: JSON.stringify({
    error: {
      message: "Full response original cause",
      code: "E_HTTP_ORIGINAL",
      access_token: "PRIVATE_BODY_TOKEN",
    },
  }),
  bodyComplete: true,
  ...extra,
});
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-input-resilience-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("HTTP evidence is optional and contradicting original request IDs remain unresolved", () => {
  const accepted = failureFromRecord(original({ httpResponse: response() }));
  assert.equal(accepted.requestId, "original-server-request");
  assert.match(accepted.requestIdSource, /^original_failure_response_x_request_id/);
  assert.equal(accepted.httpResponse.status, 502);
  for (const headers of [
    { "X-Request-ID": "different-request" },
    { "x-request-id": ["first-request", "second-request"] },
  ]) {
    const conflict = failureFromRecord(
      original({ requestId: "record-request", httpResponse: response({ headers }) }),
    );
    assert.equal(conflict.requestId, undefined);
    assert.ok(conflict.requestIdConflict);
    assert.ok(
      conflict.metadataGaps.some(
        (gap) => gap.reason === "conflicting_original_request_ids; none_selected",
      ),
    );
  }
  for (const httpResponse of [
    "PRIVATE_BAD_SHAPE",
    response({ source: "later_probe", headers: { "X-Request-ID": "LATER_REQUEST" } }),
  ]) {
    const rejected = failureFromRecord(original({ httpResponse }));
    assert.equal(rejected.status, "recorded");
    assert.equal(rejected.httpResponse, undefined);
    assert.equal(rejected.requestId, undefined);
    assert.ok(!JSON.stringify(rejected).includes("PRIVATE_BAD_SHAPE"));
    assert.ok(!JSON.stringify(rejected).includes("LATER_REQUEST"));
  }
  const partial = failureFromRecord(
    original({
      httpResponse: response({
        status: "bad",
        headers: { valid: "retained", invalid: { token: "PRIVATE_INVALID_HEADER" } },
        bodyComplete: "bad",
      }),
    }),
  );
  assert.equal(partial.error.cause.code, "ECONNRESET");
  assert.equal(partial.httpResponse.status, undefined);
  assert.equal(partial.httpResponse.headers.valid, "retained");
  assert.equal(partial.httpResponse.headers.invalid, undefined);
  assert.equal(partial.httpResponse.bodyComplete, null);
  assert.ok(!JSON.stringify(partial.metadataGaps).includes("PRIVATE_"));
  const ambiguous = failureFromRecord(
    original({
      httpResponse: response({ headers: { "X-Request-ID": ["valid-id", "Bearer PRIVATE_TOKEN"] } }),
    }),
  );
  assert.equal(ambiguous.requestId, undefined);
  assert.ok(
    ambiguous.metadataGaps.some(
      (gap) => gap.reason === "invalid_original_response_request_id; not_used_for_association",
    ),
  );
  const explicit = failureFromRecord(
    original({
      requestId: "record-request",
      httpResponse: response({ headers: { "X-Request-ID": "Bearer PRIVATE_TOKEN" } }),
    }),
  );
  assert.equal(explicit.requestId, "record-request");
  const specialHeader = failureFromRecord(
    original({
      httpResponse: response({ headers: JSON.parse('{"__proto__":["retained-header"]}') }),
    }),
  );
  assert.deepEqual(specialHeader.httpResponse.headers.__proto__, ["retained-header"]);
});

test("snapshot collection retains independent valid groups and observations with explicit gaps", () => {
  const good = {
    stage: "browser_execution",
    operation: "browser_execute",
    source: "current_session",
    observedAt: instant,
    outcome: "failed",
    message: "E_BROWSER_ORIGINAL",
  };
  const snapshot = {
    schemaVersion: 1,
    observedAt: instant,
    configuration: {
      source: "host_settings",
      serverName: "other",
      url: "https://other.invalid",
      enabled: true,
    },
    session: {
      source: "cli_configuration",
      connectionStatus: "connected",
      authStatus: "authenticated",
      visibleToolCount: 10,
    },
    observations: [
      good,
      {
        ...good,
        observedAt: "bad PRIVATE_TIME",
        operation: { private: true },
        requestId: "Bearer PRIVATE_TOKEN",
        originalAttemptMatch: "confirmed",
      },
      { ...good, source: "other_server", message: "PRIVATE_OTHER_SERVER" },
      { ...good, arguments: { prompt: "PRIVATE_TOOL_ARGUMENTS" } },
    ],
  };
  assert.throws(() => validateSnapshot(snapshot));
  const { snapshot: kept, metadataGaps } = snapshotFromRecord(snapshot);
  assert.equal(kept.configuration, undefined);
  assert.equal(kept.session, undefined);
  assert.equal(kept.observations.length, 2);
  assert.equal(kept.observations[0].message, good.message);
  assert.equal(kept.observations[1].observedAt, null);
  assert.equal(kept.observations[1].requestId, undefined);
  assert.equal(kept.observations[1].originalAttemptMatch, undefined);
  assert.ok(!JSON.stringify({ kept, metadataGaps }).includes("PRIVATE_"));
  assert.throws(() => snapshotFromRecord({ ...snapshot, credential: "PRIVATE_TOP_LEVEL" }));
  assert.throws(() => snapshotFromRecord({ ...snapshot, schemaVersion: 2 }));
  for (const invalid of [null, false, 0, ""]) {
    const result = snapshotFromRecord({
      schemaVersion: 1,
      observedAt: instant,
      configuration: invalid,
      session: invalid,
      observations: [good],
    });
    assert.equal(result.snapshot.configuration, undefined);
    assert.equal(result.snapshot.session, undefined);
    assert.equal(result.snapshot.observations.length, 1);
    assert.equal(result.metadataGaps.length, 2);
  }
  const registration = {
    ...good,
    stage: "host_registration",
    operation: "lookup_registered_server",
    source: "cli_configuration",
    outcome: "success",
    lookupResult: "found",
  };
  assert.equal(
    validateSnapshot({ schemaVersion: 1, observedAt: instant, observations: [registration] })
      .observations[0].lookupResult,
    "found",
  );
});

for (const [host, folder] of [
  ["codex", "codex/skills/chatcut-plugin-basics"],
  ["claude", "claude/skills/chatcut-plugin-basics-claude"],
]) {
  const module = await import(new URL(`../${folder}/scripts/mcp-doctor.mjs`, import.meta.url));
  test(`${host}: saved partial snapshot keeps valid errors and flags conflicting original IDs`, async (t) => {
    const dir = await fixture(t),
      failureRecord = join(dir, "original.mcp-failure.json"),
      hostSnapshot = join(dir, "host.mcp-snapshot.json");
    await writeFile(failureRecord, JSON.stringify(original({ httpResponse: response() })));
    await writeFile(
      hostSnapshot,
      JSON.stringify({
        schemaVersion: 1,
        observedAt: instant,
        configuration: {
          source: "host_settings",
          serverName: "other",
          url: "https://other.invalid",
          enabled: true,
        },
        hostVersion: { private: "PRIVATE_VERSION" },
        observations: [
          {
            stage: "browser_execution",
            operation: "browser_execute",
            source: "current_session",
            observedAt: null,
            outcome: "failed",
            requestId: "different-original-id",
            originalAttemptMatch: "confirmed",
            message: "E_VALID_BROWSER_ERROR",
          },
          {
            stage: "initialize",
            source: "other_server",
            observedAt: instant,
            outcome: "failed",
            message: "PRIVATE_OTHER_SERVER",
          },
        ],
      }),
    );
    const output = join(dir, "report.json");
    const { report } = await module.runDoctor(
      { host, hostSnapshot, failureRecord, output, offline: true },
      { collectLogs: async () => ({ entries: [], gaps: [] }) },
    );
    assert.equal(report.originalFailure.status, "recorded");
    assert.equal(report.hostSnapshot.observations.length, 1);
    assert.equal(report.hostSnapshot.observations[0].message, "E_VALID_BROWSER_ERROR");
    assert.equal(report.hostSnapshot.observations[0].observedAt, null);
    assert.equal(report.hostVersion, null);
    assert.ok(report.evidenceSummary.gaps.includes("current_host_snapshot_partial"));
    assert.ok(report.evidenceSummary.gaps.includes("original_request_id_conflict"));
    assert.equal(
      report.evidenceSummary.originalRequestCorrelation.status,
      "conflicting_agent_supplied_request_ids",
    );
    assert.ok(!JSON.stringify(report).includes("PRIVATE_"));
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), report);
  });
  test(`${host}: full supplied HTTP error response survives optional-field rejection and precise redaction`, async (t) => {
    const dir = await fixture(t),
      input = join(dir, "original.mcp-failure.json"),
      output = join(dir, "report.json");
    const fullBody = JSON.stringify({
      message: "X".repeat(70000) + " E_FULL_BODY_TAIL",
      access_token: 'PRIVATE_ESCAPED_"TOKEN\\SUFFIX',
    });
    await writeFile(
      input,
      JSON.stringify(
        original({ operation: "invalid operation", httpResponse: response({ body: fullBody }) }),
      ),
    );
    const { report } = await module.runDoctor(
      { host, failureRecord: input, output, offline: true },
      { collectLogs: async () => ({ entries: [], gaps: [] }) },
    );
    assert.equal(report.originalFailure.status, "recorded");
    assert.equal(report.originalFailure.error.cause.code, "ECONNRESET");
    assert.equal(report.originalFailure.occurredAt, instant);
    assert.equal(report.originalFailure.callId, "original-call");
    assert.equal(report.originalFailure.operation, undefined);
    assert.equal(report.originalFailure.httpResponse.status, 502);
    assert.equal(report.originalFailure.httpResponse.bodyComplete, true);
    assert.match(report.originalFailure.httpResponse.body, /E_FULL_BODY_TAIL/);
    assert.equal(report.originalFailure.httpResponse.headers["content-type"], "application/json");
    assert.equal(report.originalFailure.requestId, "original-server-request");
    assert.equal(
      report.evidenceSummary.originalRequestCorrelation.status,
      "agent_reported_same_attempt",
    );
    assert.ok(!JSON.stringify(report).includes("PRIVATE_"));
    const fragments = module.fragmentEvents(report);
    assert.deepEqual(
      JSON.parse(fragments.map((event) => event.properties.attributes.mcpDoctor.fragment).join("")),
      report,
    );
    assert.equal(report.collectionStatus, "complete");
  });
  test(`${host}: original and host logs are checkpointed before independent network checks`, async (t) => {
    const dir = await fixture(t),
      input = join(dir, "original.mcp-failure.json"),
      output = join(dir, "report.json");
    await writeFile(input, JSON.stringify(original()));
    let firstId,
      posts = 0,
      probes = 0;
    const { report } = await module.runDoctor(
      {
        host,
        failureRecord: input,
        output,
        serverUrl: "http://127.0.0.1:9/api/external-mcp/mcp",
        upload: true,
      },
      {
        collectLogs: async () => {
          const checkpoint = JSON.parse(await readFile(output, "utf8"));
          assert.equal(checkpoint.originalFailure.error.code, "E_BROWSER_126");
          assert.equal(checkpoint.collectionStatus, "in_progress");
          assert.equal(checkpoint.collectionStage, "host_logs");
          assert.equal(checkpoint.upload.status, "not_attempted_collection_incomplete");
          assert.throws(
            () => module.fragmentEvents(checkpoint),
            /Incomplete collection checkpoint/,
          );
          firstId = checkpoint.diagnosticId;
          return {
            entries: [
              {
                source: "claude_debug_log",
                message: 'MCP server "chatcut": Error E_HOST_ORIGINAL',
                occurredAt: instant,
              },
            ],
            gaps: [],
          };
        },
        fetchImpl: async (url, options) => {
          const checkpoint = JSON.parse(await readFile(output, "utf8"));
          assert.equal(checkpoint.diagnosticId, firstId);
          assert.equal(checkpoint.hostLogs.entries[0].message.includes("E_HOST_ORIGINAL"), true);
          if (url.endsWith("/telemetry/events")) {
            posts++;
            assert.equal(checkpoint.collectionStatus, "complete");
            assert.equal(checkpoint.upload.status, "pending");
            return new Response('{"ok":true}');
          }
          probes++;
          assert.equal(checkpoint.collectionStatus, "in_progress");
          assert.equal(checkpoint.collectionStage, "independent_checks");
          return new Response("{}", { status: 401 });
        },
      },
    );
    assert.ok(probes > 0);
    assert.equal(posts, 1);
    assert.equal(report.diagnosticId, firstId);
    assert.equal(report.collectionStatus, "complete");
  });
  test(`${host}: over-budget original sources are retained locally and never silently truncated`, async (t) => {
    const dir = await fixture(t),
      input = join(dir, "original.mcp-failure.json");
    const bytes = JSON.stringify(
      original({
        httpResponse: response({ body: "X".repeat(140000) + " E_UNTRIMMED_SOURCE_TAIL" }),
      }),
    );
    await writeFile(input, bytes);
    const { report } = await module.runDoctor(
      { host, failureRecord: input, output: join(dir, "report.json"), offline: true },
      { collectLogs: async () => ({ entries: [], gaps: [] }) },
    );
    assert.equal(await readFile(input, "utf8"), bytes);
    assert.equal(report.originalFailure.status, "unavailable");
    assert.ok(
      report.gaps.some(
        (gap) =>
          gap.reason === "failure_record_input_size_limit" &&
          gap.completeLocalSourceRetained === true &&
          gap.maximumBytes === 128 * 1024,
      ),
    );
  });
}

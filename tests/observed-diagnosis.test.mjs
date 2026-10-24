import assert from "node:assert/strict";
import test from "node:test";
import { diagnose, renderPacket } from "../codex/skills/chatcut-mcp-doctor/scripts/diagnosis.mjs";

// Reconstructed, sanitized fixtures for observed native message/stage shapes.
// They do not identify users, associate server records or reproduce a live cause.
const makeReport = () => ({
  schemaVersion: 2, diagnosticId: "00000000-0000-0000-0000-000000000024",
  collectorVersion: "1.2.3", host: "codex",
  originalFailure: { status: "unavailable", occurredAt: null },
  hostLogs: { entries: [], gaps: [] }, gaps: [], probes: [], wireProbes: [],
});
const issuerWarning = 'MCP server startup failed server_name="chatcut" error=OAuth refresh credentials for server chatcut are missing an authorization server issuer; authorization required: OAuth authorization required';
const nativeWarning = () => ({
  source: "codex_runtime_sqlite", level: "WARN", target: "codex_mcp::rmcp_client",
  occurredAt: "2026-10-24T01:00:00Z", message: issuerWarning,
});

test("exact native issuer warning retains historical auth requirement without inventing an original attempt", () => {
  const input = makeReport();
  input.hostLogs.entries = [nativeWarning()];
  input.hostSnapshot = { session: { connectionStatus: "connected", authStatus: "authenticated", visibleToolCount: 65 } };
  const before = structuredClone(input);
  const result = diagnose(input);
  const fact = result.findings.find((item) => item.kind === "host_reauthorization_required_unassociated");
  assert.deepEqual(fact.evidence, ["hostLogs.entries[0]"]);
  assert.equal(fact.observed.occurredAt, input.hostLogs.entries[0].occurredAt);
  assert.equal(fact.observed.originalAttemptMatch, "unconfirmed");
  assert.match(fact.next, /current authentication status first/);
  assert.ok(!result.findings.some((item) => item.kind === "no_incident_demonstrated"));
  assert.equal(result.rootCause, "unconfirmed");
  assert.equal(result.recoveryVerified, false);
  const packet = renderPacket(input, result);
  assert.ok(packet.summary.includes("OAuth refresh credentials for server chatcut are missing an authorization server issuer"));
  assert.ok(!packet.draft.includes("OAuth refresh credentials for server chatcut are missing an authorization server issuer"));
  assert.deepEqual(input, before);
});

test("generic warnings and changed source, target or native message do not establish reauthorization", () => {
  for (const extra of [
    { source: "unknown" }, { target: "another_module" }, { level: "INFO" },
    { message: "OAuth token may need a refresh" },
    { message: `${issuerWarning}; quoted by a tool` },
  ]) {
    const input = makeReport();
    input.hostLogs.entries = [{ ...nativeWarning(), ...extra }];
    assert.ok(!diagnose(input).findings.some((item) => item.kind === "host_reauthorization_required_unassociated"));
  }
});

test("historical tool_call and tool_discovery stage names preserve their observed boundary", () => {
  for (const [stage, kind] of [["tool_call", "tool_call_failed"], ["tool_discovery", "startup_or_discovery_failed"]]) {
    const input = makeReport();
    input.hostSnapshot = { observations: [{ stage, outcome: "failed", source: "current_session", message: "native failure" }] };
    const result = diagnose(input);
    assert.ok(result.findings.some((item) => item.kind === kind && item.evidence.includes("hostSnapshot.observations[0]")));
    assert.ok(!result.findings.some((item) => item.kind === "observed_stage_failed"));
    assert.equal(result.recoveryVerified, false);
  }
});

test("oauth attempt keeps its supplied time and does not attribute a timeout to network or registration", () => {
  const input = makeReport();
  const occurredAt = "2026-10-24T04:00:00Z";
  input.originalFailure = { status: "recorded", operation: "connect", occurredAt, message: "OAuth authorization timed out" };
  input.hostSnapshot = { observations: [{ stage: "oauth", operation: "authorization", outcome: "failed", source: "runtime_log", observedAt: occurredAt, message: "OAuth authorization timed out" }] };
  const result = diagnose(input);
  const fact = result.findings.find((item) => item.kind === "authentication_attempt_failed");
  assert.equal(fact.observed.observedAt, occurredAt);
  assert.equal(fact.observed.stage, "oauth");
  assert.ok(!result.findings.some((item) => ["not_registered", "later_network_or_metadata_check_failed"].includes(item.kind)));
  assert.equal(input.originalFailure.occurredAt, occurredAt);
});

test("connected browser_render failure remains a tool execution fact", () => {
  const input = makeReport();
  const message = "The render tree was unmounted before this frame's assets were collected";
  input.hostSnapshot = {
    session: { connectionStatus: "connected", authStatus: "authenticated", visibleToolCount: 65 },
    observations: [{ stage: "browser_render", operation: "preview_timeline", source: "current_session", outcome: "failed", message }],
  };
  const result = diagnose(input);
  const fact = result.findings.find((item) => item.kind === "tool_execution_failed");
  assert.equal(fact.observed.connectionStatus, "connected");
  assert.equal(fact.observed.messageExcerpt, message);
  assert.ok(!result.findings.some((item) => ["startup_or_discovery_failed", "authentication_required", "not_registered"].includes(item.kind)));
  assert.equal(result.recoveryVerified, false);
});

test("native startup time stays separate from unknown original time; later health and gaps remain bounded", () => {
  const input = makeReport();
  input.hostLogs.entries = [{
    source: "codex_app_log", occurredAt: "2026-10-24T03:00:00Z",
    message: '2026-10-24T03:00:00Z info [AppServerConnection] mcp_server_startup_status_updated error="native failure" server=chatcut status=failed threadId=null',
  }];
  input.hostLogs.gaps = [{ source: "codex_runtime_sqlite", reason: "unreadable" }, { source: "codex_tui_log", reason: "omitted_ranges" }];
  input.entryProbe = { outcome: "authentication_challenge", status: 401 };
  input.probes = [{ outcome: "metadata_read", status: 200 }];
  const result = diagnose(input);
  const fact = result.findings.find((item) => item.kind === "host_runtime_error_unassociated");
  assert.equal(fact.observed.occurredAt, input.hostLogs.entries[0].occurredAt);
  assert.equal(input.originalFailure.occurredAt, null);
  assert.deepEqual(result.gaps, input.hostLogs.gaps);
  assert.equal(result.recoveryVerified, false);
  input.hostLogs.entries = [];
  input.originalFailure = { status: "recorded", source: "agent_supplied_host_tool_result", operation: "import_media", message: "Timed out after 300 seconds", occurredAt: null };
  const timeout = diagnose(input);
  assert.ok(timeout.findings.some((item) => item.kind === "tool_call_failed"));
  assert.ok(!JSON.stringify(timeout.findings).includes("session_request_in_use"));
  assert.equal(timeout.rootCause, "unconfirmed");
  assert.equal(timeout.recoveryVerified, false);
});

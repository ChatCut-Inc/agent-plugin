import assert from "node:assert/strict";
import test from "node:test";
import { diagnose, renderPacket } from "../codex/skills/chatcut-mcp-doctor/scripts/diagnosis.mjs";
import { validateSnapshot } from "../codex/skills/chatcut-mcp-doctor/scripts/mcp-evidence.mjs";

const report = () => ({
  schemaVersion: 2, diagnosticId: "00000000-0000-0000-0000-000000000001",
  collectorVersion: "1.2.3", scope: "cloud", host: "codex",
  originalFailure: { status: "unavailable", occurredAt: null },
  hostLogs: { entries: [], gaps: [] }, gaps: [], probes: [], wireProbes: [],
  upload: { status: "not_requested", storageVerified: false },
});
const snapshot = (observation) => ({ schemaVersion: 1, observedAt: "2026-10-23T15:00:00Z", observations: [observation] });
const lookup = (extra = {}) => ({ stage: "host_registration", operation: "lookup_registered_server", source: "cli_configuration", outcome: "failed", observedAt: null, ...extra });

test("failed registration reads retain unknown state; only explicit scoped absence permits registration repair", () => {
  for (const message of [
    "EACCES: cannot open host configuration; registration existence unreadable",
    "Invalid TOML near server name: No MCP server named 'chatcut' found.",
    "Host CLI unavailable; exit 1", "Error: No MCP server named 'chatcut' found.",
  ]) {
    for (const extra of [{}, { lookupResult: "unavailable" }]) {
      const input = report();
      input.hostSnapshot = validateSnapshot(snapshot(lookup({ message, ...extra })), null);
      const before = structuredClone(input);
      const result = diagnose(input);
      assert.ok(!result.findings.some((item) => item.kind === "not_registered"));
      const finding = result.findings.find((item) => item.kind === "registration_lookup_unavailable");
      assert.deepEqual(finding.evidence, ["hostSnapshot.observations[0]"]);
      assert.equal(finding.observed.lookupResult, "unavailable");
      assert.equal(finding.observed.messageExcerpt, message);
      assert.equal(finding.observed.source, "cli_configuration");
      assert.ok(renderPacket(input, result).summary.includes(message));
      assert.deepEqual(input, before);
    }
  }
  for (const outcome of ["success", "failed"]) {
    const input = report();
    input.hostSnapshot = validateSnapshot(snapshot(lookup({ lookupResult: "not_found", outcome, message: "Explicit completed scope lookup: no entry" })), null);
    assert.ok(diagnose(input).findings.some((item) => item.kind === "not_registered"));
  }
  const presentButUnhealthy = report();
  presentButUnhealthy.hostSnapshot = snapshot(lookup({ lookupResult: "found", message: "Entry exists; its health check failed" }));
  assert.ok(!diagnose(presentButUnhealthy).findings.some((item) => item.kind === "not_registered"));
});

test("lookupResult cannot claim absence for unknown, authentication or unrelated runtime observations", () => {
  for (const extra of [{ outcome: "unknown" }, { stage: "authorization" }, { operation: "initialize" }, { source: "runtime_log" }, { lookupResult: "guessed_absent" }])
    assert.throws(() => validateSnapshot(snapshot(lookup({ lookupResult: "not_found", ...extra })), null), /lookupResult/);
  assert.doesNotThrow(() => validateSnapshot(snapshot(lookup({ lookupResult: "unavailable", outcome: "unknown" })), null));
});

test("wire failures and incomplete captures remain visible beside healthy anonymous fetch checks", () => {
  for (const wire of [
    { outcome: "invalid_framing", framing: { status: "invalid", reason: "invalid_chunk_size" } },
    { outcome: "failed", error: { code: "ECONNRESET", message: "native wire reset" } },
    { outcome: "incomplete", framing: { status: "incomplete", reason: "body_not_complete" } },
    { outcome: "invalid_response", framing: { status: "not_evaluated", reason: "invalid_status_line" } },
    { outcome: "unsupported_response" },
    { outcome: "response_observed", framing: { status: "valid" }, captureLimited: true },
  ]) {
    const input = report();
    input.entryProbe = { outcome: "authentication_challenge", status: 401 };
    input.probes = [{ outcome: "metadata_read", status: 200 }];
    input.wireProbes = [{ route: "direct_connection; host_and_fetch_route_not_reproduced", ...wire }];
    const before = structuredClone(input);
    const result = diagnose(input);
    const fact = result.findings.find((item) => item.evidence.includes("wireProbes[0]"));
    assert.equal(fact.severity, "attention");
    assert.equal(fact.observed.outcome, wire.outcome);
    assert.equal(fact.observed.framingReason, wire.framing?.reason ?? null);
    assert.ok(!result.findings.some((item) => item.kind === "no_incident_demonstrated"));
    const packet = renderPacket(input, result);
    for (const rendered of [packet.summary, packet.draft]) {
      assert.ok(rendered.includes("wireProbes[0]"));
      assert.ok(rendered.includes(wire.outcome));
      if (wire.framing?.reason) assert.ok(rendered.includes(wire.framing.reason));
      assert.ok(rendered.includes("host_and_fetch_route_not_reproduced"));
    }
    assert.equal(result.rootCause, "unconfirmed");
    assert.equal(result.recoveryVerified, false);
    assert.deepEqual(input, before);
  }
  const normal = report();
  normal.entryProbe = { outcome: "authentication_challenge", status: 401 };
  normal.wireProbes = [{ outcome: "response_observed", framing: { status: "valid" } }];
  assert.ok(!diagnose(normal).findings.some((item) => item.severity === "attention"));
});

test("native ERROR and failed App state are unassociated evidence, while ordinary startup remains informational", () => {
  const input = report();
  input.hostLogs.entries = [
    { source: "codex_runtime_sqlite", level: "ERROR", message: "E_UNKNOWN_NATIVE cause ECONNRESET" },
    { source: "codex_tui_log", message: "2026-10-23T15:00:00Z ERROR codex_mcp::client: E_NATIVE_TEXT" },
    { source: "claude_debug_log", message: "[ERROR] MCP server chatcut E_CLAUDE_NATIVE" },
    { source: "codex_app_log", message: '2026-10-23T15:00:00Z info [AppServerConnection] mcp_server_startup_status_updated error="unknown native failure" server=chatcut status=failed threadId=null' },
    ...["starting", "ready"].map((status) => ({ source: "codex_app_log", message: `2026-10-23T15:00:00Z info [AppServerConnection] mcp_server_startup_status_updated error="quoted ERROR status=failed" server=chatcut status=${status} threadId=null` })),
    { source: "codex_runtime_sqlite", level: "WARN", message: "cached catalog; quoted error: ERROR" },
  ];
  input.hostLogs.gaps = [{ source: "host_logs", reason: "log_record_limit", omitted: 2 }];
  const result = diagnose(input);
  const native = result.findings.filter((item) => item.kind === "host_runtime_error_unassociated");
  assert.deepEqual(native.map((item) => item.evidence), [0, 1, 2, 3].map((i) => [`hostLogs.entries[${i}]`]));
  assert.ok(native.every((item) => item.observed.originalAttemptMatch === "unconfirmed"));
  assert.equal(input.originalFailure.status, "unavailable");
  assert.equal(input.originalFailure.occurredAt, null);
  assert.equal(result.recoveryVerified, false);
  assert.deepEqual(result.gaps, input.hostLogs.gaps);
  const packet = renderPacket(input, result);
  assert.ok(packet.summary.includes("E_UNKNOWN_NATIVE"));
  assert.ok(!packet.draft.includes("E_UNKNOWN_NATIVE"));
  assert.ok(packet.draft.includes("hostLogs.entries[0]"));
  const startupOnly = report();
  startupOnly.hostLogs.entries = input.hostLogs.entries.slice(4);
  assert.ok(!diagnose(startupOnly).findings.some((item) => item.severity === "attention"));
});

test("new local evidence excerpts redact credentials and do not copy private logs into issue drafts", () => {
  const input = report();
  input.hostSnapshot = snapshot(lookup({ lookupResult: "unavailable", message: "EACCES token=PRIVATE_TOKEN C:\\Users\\private\\config.toml" }));
  input.hostLogs.entries = [{ source: "codex_runtime_sqlite", level: "ERROR", message: "Mcp-Session-Id: PRIVATE_SESSION\nPRIVATE_LOG_BODY" }];
  const result = diagnose(input);
  const packet = renderPacket(input, result);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_TOKEN"));
  assert.ok(!JSON.stringify(result).includes("PRIVATE_SESSION"));
  for (const secret of ["PRIVATE_TOKEN", "PRIVATE_SESSION", "PRIVATE_LOG_BODY", "C:\\Users\\private"])
    assert.ok(!packet.draft.includes(secret));
});

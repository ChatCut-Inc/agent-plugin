const STAGES = [
  "plugin_loading",
  "discovery",
  "client_registration",
  "authorization",
  "token_exchange",
  "token_refresh",
  "initialize",
  "tools_list",
  "session_tools",
];
const SOURCES = [
  "current_session",
  "tool_search",
  "host_settings",
  "cli_configuration",
  "runtime_log",
];
const TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error("Snapshot contains unsupported fields; use only the dedicated evidence schema");
}

function source(value) {
  if (!SOURCES.includes(value))
    throw new Error("Snapshot evidence needs an explicit supported source");
}

function instant(value) {
  return (
    typeof value === "string" &&
    new RegExp("^" + TIMESTAMP.source + "$").test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function validateSnapshot(input, endpoint) {
  keys(input, [
    "schemaVersion",
    "observedAt",
    "hostVersion",
    "pluginVersion",
    "configuration",
    "session",
    "observations",
  ]);
  if (input.schemaVersion !== 1)
    throw new Error(
      "Snapshot schemaVersion must be 1 (the outer Doctor report uses a separate schemaVersion); generate a template with --create-snapshot",
    );
  if (!instant(input.observedAt))
    throw new Error(
      "Snapshot observedAt must be its capture time as a complete ISO timestamp with timezone, e.g. 2026-10-23T01:00:00Z; original failure time may remain unknown",
    );
  for (const key of ["hostVersion", "pluginVersion"])
    if (input[key] !== undefined && (typeof input[key] !== "string" || input[key].length > 256))
      throw new Error("Invalid snapshot version");
  if (input.configuration) {
    const config = input.configuration;
    keys(config, ["source", "serverName", "url", "enabled"]);
    source(config.source);
    if (!["chatcut", "plugin:chatcut:chatcut"].includes(config.serverName))
      throw new Error("Snapshot must describe the hosted ChatCut server");
    if (!publicUrl(config.url, true))
      throw new Error("Snapshot URL must be a public URL without embedded credentials");
    if (endpoint && new URL(config.url).href !== endpoint.href)
      throw new Error(
        "Snapshot URL differs from the explicitly selected server; preserve both configurations",
      );
    if (config.enabled !== null && typeof config.enabled !== "boolean")
      throw new Error("Snapshot enabled state must be boolean or null");
  }
  if (input.session) {
    const session = input.session;
    keys(session, [
      "source",
      "conversationId",
      "connectionStatus",
      "authStatus",
      "visibleToolCount",
      "visibleTools",
    ]);
    source(session.source);
    if (session.source === "cli_configuration")
      throw new Error("Static CLI configuration cannot describe current session tool availability");
    if (
      !["connected", "failed", "needs_authentication", "disabled", "unknown"].includes(
        session.connectionStatus,
      )
    )
      throw new Error("Unsupported connection status");
    if (!["authenticated", "needs_authentication", "unknown"].includes(session.authStatus))
      throw new Error("Unsupported authentication status");
    if (
      session.visibleToolCount !== null &&
      (!Number.isSafeInteger(session.visibleToolCount) || session.visibleToolCount < 0)
    )
      throw new Error("Visible tool count must be a nonnegative integer or null");
    if (session.conversationId !== undefined && typeof session.conversationId !== "string")
      throw new Error("conversationId must be a host conversation identifier");
    if (
      session.visibleTools !== undefined &&
      (!Array.isArray(session.visibleTools) ||
        session.visibleTools.length > 256 ||
        session.visibleTools.some(
          (name) => typeof name !== "string" || !/^[A-Za-z0-9_:.-]{1,256}$/.test(name),
        ))
    )
      throw new Error("visibleTools must contain only ChatCut tool names, at most 256");
    if (
      session.visibleTools &&
      session.visibleToolCount !== null &&
      session.visibleTools.length > session.visibleToolCount
    )
      throw new Error("Tool name count exceeds the observed tool count");
  }
  if (input.observations !== undefined) {
    if (!Array.isArray(input.observations) || input.observations.length > 32)
      throw new Error("Snapshot accepts at most 32 stage observations");
    for (const item of input.observations) {
      keys(item, [
        "stage",
        "operation",
        "source",
        "observedAt",
        "outcome",
        "requestId",
        "httpStatus",
        "protocolCode",
        "message",
        "originalAttemptMatch",
      ]);
      source(item.source);
      if (
        !/^[a-z][a-z0-9_./:-]{0,127}$/.test(item.stage) ||
        !["success", "failed", "unknown"].includes(item.outcome) ||
        (item.observedAt !== null && !instant(item.observedAt))
      )
        throw new Error(
          "Stage observation needs stage, outcome, and observedAt (ISO timestamp with timezone, or null when the original time is unknown)",
        );
      for (const field of ["operation", "requestId", "message"])
        if (item[field] !== undefined && typeof item[field] !== "string")
          throw new Error("Observation text fields must be strings");
      for (const field of ["httpStatus", "protocolCode"])
        if (item[field] !== undefined && !Number.isSafeInteger(item[field]))
          throw new Error("Observation status/code must be an integer");
      if (
        item.originalAttemptMatch !== undefined &&
        !["confirmed", "unconfirmed"].includes(item.originalAttemptMatch)
      )
        throw new Error(
          "Original attempt match must be confirmed or unconfirmed; omit when unknown",
        );
      if (
        item.originalAttemptMatch === "confirmed" &&
        (!item.requestId ||
          item.outcome !== "failed" ||
          !["current_session", "runtime_log"].includes(item.source))
      )
        throw new Error(
          "Confirmed original request association requires its failed runtime/session observation and actual request ID",
        );
    }
  }
  return input;
}

export function logTime(line) {
  const match = line.match(TIMESTAMP)?.[0];
  return match && Number.isFinite(Date.parse(match)) ? new Date(match).toISOString() : null;
}

export function stageHint(message) {
  if (/tools\/list|tool catalog|tool list/i.test(message)) return "tools_list";
  if (/initializ|handshake/i.test(message)) return "initialize";
  if (/refresh.{0,20}token|token.{0,20}refresh/i.test(message)) return "token_refresh";
  if (/token.{0,20}exchange|exchange.{0,20}token|\/mcp\/token/i.test(message))
    return "token_exchange";
  if (/registr|\/mcp\/register/i.test(message)) return "client_registration";
  if (/callback|authoriz|oauth/i.test(message) && !/metadata|discovery/i.test(message))
    return "authorization";
  if (/metadata|discovery/i.test(message)) return "discovery";
  return "unclassified";
}

export function evidenceSummary(report) {
  const snapshot = report.hostSnapshot;
  const observations = snapshot?.observations ?? [];
  const gaps = [];
  if (!snapshot) gaps.push("current_host_snapshot_unavailable");
  if (!snapshot?.configuration) gaps.push("registration_state_unavailable");
  if (!snapshot?.session || snapshot.session.visibleToolCount === null)
    gaps.push("current_session_tools_unavailable");
  if (report.originalFailure.status !== "recorded") gaps.push("original_failure_unavailable");
  if (!report.originalFailure.occurredAt) gaps.push("original_failure_time_unavailable");
  const originalRequests =
    report.originalFailure.status === "recorded"
      ? observations.flatMap((item, observationIndex) =>
          item.requestId &&
          item.originalAttemptMatch === "confirmed" &&
          item.outcome === "failed" &&
          ["current_session", "runtime_log"].includes(item.source)
            ? [{ requestId: item.requestId, source: item.source, observationIndex }]
            : [],
        )
      : [];
  if (!originalRequests.length) gaps.push("original_request_id_unavailable");
  if (!snapshot?.pluginVersion) gaps.push("actual_loaded_plugin_version_unavailable");
  if (!report.hostLogs.entries.length) gaps.push("matching_host_runtime_logs_unavailable");
  const stages = STAGES.map((stage) => ({
    stage,
    observations: observations.filter((item) => item.stage === stage),
    status: observations.some((item) => item.stage === stage)
      ? "observed; see individual attempts"
      : "not_observed",
  }));
  const unknown = observations.filter((item) => !STAGES.includes(item.stage));
  const logHints = report.hostLogs.entries.map((entry, index) => ({
    entryIndex: index,
    stage: stageHint(entry.message),
    interpretation: "text_hint_only; attempt_match_unconfirmed",
  }));
  return {
    stages,
    otherObservations: unknown,
    logHints,
    originalRequestCorrelation: {
      status: originalRequests.length ? "agent_reported_same_attempt" : "unconfirmed",
      observations: originalRequests,
      provenance:
        "agent_supplied_confirmation; not_independently_verified; never_inferred_from_time_or_other_ids",
    },
    gaps,
    independentChecks:
      "entryProbe/probes/wireProbes/transportContext are later requests, never original stage completions; server observation is before Node framing, not proof of downstream wire validity",
    recoveryVerified: false,
  };
}

function publicUrl(value, localAllowed = false) {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === "https:" ||
        (localAllowed &&
          url.protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

export function inspectMetadata(document, url, expected = {}) {
  const issues = [];
  const result = { valid: false, issues, fields: {} };
  if (!object(document)) {
    issues.push({ field: "document", reason: "expected_object" });
    return result;
  }
  for (const field of [
    "resource",
    "authorization_servers",
    "issuer",
    "authorization_endpoint",
    "token_endpoint",
    "registration_endpoint",
    "grant_types_supported",
    "response_types_supported",
    "code_challenge_methods_supported",
    "token_endpoint_auth_methods_supported",
  ])
    if (document[field] !== undefined) result.fields[field] = document[field];
  const protectedResource = new URL(url).pathname.includes("oauth-protected-resource");
  const requireUrl = (field) => {
    if (typeof document[field] !== "string" || !publicUrl(document[field], true))
      issues.push({ field, reason: "missing_or_invalid_public_url" });
  };
  if (protectedResource) {
    requireUrl("resource");
    const suffix = new URL(url).pathname.split("/.well-known/oauth-protected-resource")[1];
    const resource = expected.resource ?? (suffix ? new URL(url).origin + suffix : undefined);
    if (resource && document.resource !== resource)
      issues.push({
        field: "resource",
        reason: "resource_mismatch",
        expected: resource,
        actual: document.resource,
      });
    if (
      !Array.isArray(document.authorization_servers) ||
      !document.authorization_servers.length ||
      document.authorization_servers.some((item) => !publicUrl(item, true))
    )
      issues.push({
        field: "authorization_servers",
        reason: "missing_or_invalid_authorization_servers",
      });
  } else {
    requireUrl("issuer");
    requireUrl("authorization_endpoint");
    requireUrl("token_endpoint");
    if (
      Array.isArray(document.grant_types_supported) &&
      !document.grant_types_supported.includes("authorization_code")
    )
      issues.push({ field: "grant_types_supported", reason: "authorization_code_not_supported" });
    if (
      !Array.isArray(document.response_types_supported) ||
      !document.response_types_supported.includes("code")
    )
      issues.push({ field: "response_types_supported", reason: "code_response_not_advertised" });
    if (expected.issuer && document.issuer !== expected.issuer)
      issues.push({
        field: "issuer",
        reason: "issuer_mismatch",
        expected: expected.issuer,
        actual: document.issuer,
      });
    if (
      !Array.isArray(document.code_challenge_methods_supported) ||
      !document.code_challenge_methods_supported.includes("S256")
    )
      issues.push({ field: "code_challenge_methods_supported", reason: "S256_not_advertised" });
  }
  result.valid = issues.length === 0;
  return result;
}

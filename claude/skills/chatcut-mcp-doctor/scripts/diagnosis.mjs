import { redact } from "./mcp-doctor.mjs";

// Findings name observed boundaries, not inferred causes or user failure rates.
export function diagnose(report) {
  const findings = [];
  const add = (kind, evidence, next, severity = "attention", observed) =>
    findings.push({ kind, severity, evidence, next, ...(observed && { observed }) });
  const snapshot = report.hostSnapshot;
  const session = snapshot?.session;
  const observations = snapshot?.observations ?? [];
  const failed = observations.map((item, index) => ({ ...item, index }))
    .filter((item) => item.outcome === "failed");
  const original = report.originalFailure;
  if (report.upload?.status === "skipped_intentionally_disabled" || snapshot?.configuration?.enabled === false || session?.connectionStatus === "disabled")
    add("intentionally_disabled", ["hostSnapshot"], "Preserve the disabled choice; do not enable or probe it.", "info");
  for (const [index, item] of observations.entries()) {
    const evidence = [`hostSnapshot.observations[${index}]`];
    if (item.stage === "host_registration" && item.operation === "lookup_registered_server" &&
        ["cli_configuration", "host_settings"].includes(item.source)) {
      const observed = {
        source: item.source, outcome: item.outcome,
        lookupResult: item.lookupResult ?? "unavailable",
        messageExcerpt: redact(item.message ?? "").slice(0, 2000),
      };
      if (item.lookupResult === "not_found" && ["success", "failed"].includes(item.outcome))
        add("not_registered", evidence, "The host explicitly reported no entry in the queried scope. Confirm the intended host/scope/endpoint; use the registration repair guide, then check the same scope again.", "attention", observed);
      else if (item.outcome !== "success" || item.lookupResult === "unavailable")
        add("registration_lookup_unavailable", evidence, "The lookup did not establish absence. Preserve its native error and check the same host/scope through an available read-only status entry; do not add or replace a registration on this evidence.", "attention", observed);
      continue;
    }
    if (item.outcome !== "failed") continue;
    if (["initialize", "plugin_loading", "tools_list"].includes(item.stage))
      add("startup_or_discovery_failed", evidence, "Preserve the exact native error. Check the selected host's current status; follow only the matching repair guide.");
    else if (["authorization", "token_exchange", "token_refresh"].includes(item.stage))
      add("authentication_attempt_failed", evidence, "Use the host's authentication UI only if authorized; retain the actual auth failure. Do not clear credentials.");
    else if (item.stage === "tools_call")
      add("tool_call_failed", evidence, "Keep operation and original call IDs. Recheck only a safe read operation; never replay a write or generation just to test recovery.");
    else
      add("observed_stage_failed", evidence, "Retain the unfamiliar stage and error; root cause needs more evidence.");
  }
  if (session?.authStatus === "needs_authentication" || session?.connectionStatus === "needs_authentication")
    add("authentication_required", ["hostSnapshot.session"], "A sign-in requirement can be normal first use. Use the actual host's MCP sign-in entry; do not infer a broken token.", "info");
  if (session?.connectionStatus === "failed" && !failed.length)
    add("host_connection_failed_stage_unconfirmed", ["hostSnapshot.session"], "The host reports a failed connection. Preserve its native startup/runtime error if exposed; the exact stage and cause are not yet established.");
  if (session?.authStatus === "authenticated" && session?.visibleToolCount === 0)
    add("authenticated_tools_absent", ["hostSnapshot.session"], "Authentication inventory does not prove initialization or tools/list success. Preserve the host's discovery status and error before reconnecting.");
  if (original?.status === "recorded" && !failed.length) {
    if (["initialize", "tools/list"].includes(original.operation))
      add("startup_or_discovery_failed", ["originalFailure.operation", "originalFailure"], "The original record identifies the failed startup/discovery operation. Preserve its native error; later healthy probes do not establish host recovery.");
    else if (original.source === "agent_supplied_host_tool_result" && original.operation)
      add("tool_call_failed", ["originalFailure.operation", "originalFailure"], "Preserve the actual failed host tool result. Recheck only a safe read operation after an authorized change; do not replay a write or generation.");
    else
      add("original_failure_recorded_stage_unconfirmed", ["originalFailure"], "Preserve this original error. Obtain its host stage/status if available; do not infer a cause from message keywords.");
  }
  const probes = [report.entryProbe, ...(report.probes ?? [])].filter(Boolean);
  probes.forEach((probe, index) => {
    if (["failed", "http_rejected", "protocol_error", "missing_authentication_challenge", "invalid_initialize_response", "invalid_metadata_shape", "invalid_metadata"].includes(probe.outcome) ||
        (index > 0 && probe.outcome !== "metadata_read"))
      add("later_network_or_metadata_check_failed", [index === 0 && report.entryProbe ? "entryProbe" : `probes[${index - (report.entryProbe ? 1 : 0)}]`],
        "This is a later anonymous check, not the original attempt. Retain the URL, status/error and request ID; it does not establish VPN, firewall or service blame.");
  });
  (report.wireProbes ?? []).forEach((probe, index) => {
    const invalid = ["failed", "invalid_framing", "invalid_response", "unsupported_response"].includes(probe.outcome) || probe.framing?.status === "invalid";
    const incomplete = probe.outcome === "incomplete" || probe.framing?.status === "incomplete" || probe.captureLimited === true || Boolean(probe.headerGap);
    if (!invalid && !incomplete) return;
    add(invalid ? "later_wire_check_failed" : "later_wire_check_incomplete", [`wireProbes[${index}]`],
      "This later direct HTTP/1.1 check does not reproduce the original host/fetch route. Retain its framing, completion/error details and actual request ID for targeted comparison; it does not prove the original attempt failed or recovered, or identify ALB/proxy blame.", "attention", {
        outcome: probe.outcome, route: probe.route ?? null,
        httpStatus: probe.status ?? null,
        framingStatus: probe.framing?.status ?? null,
        framingReason: probe.framing?.reason ?? null,
        completionReason: probe.completionReason ?? null,
        headerGap: probe.headerGap ?? null, captureLimited: probe.captureLimited ?? false,
        errorCode: probe.error?.code ?? null,
        messageExcerpt: redact(probe.error?.message ?? "").slice(0, 2000),
      });
  });
  (report.hostLogs?.entries ?? []).forEach((entry, index) => {
    const message = entry.message ?? "";
    let status;
    if (entry.source === "codex_app_log") {
      // The native App event's state, rather than words inside its error text.
      if (!/^\d{4}-\d{2}-\d{2}T\S+\s+\w+\s+\[AppServerConnection\] mcp_server_startup_status_updated\s/.test(message)) return;
      status = [...message.matchAll(/(?:^|\s)status=([^\s]+)/g)].at(-1)?.[1];
      if (status !== "failed") return;
    } else {
      if (!["codex_runtime_sqlite", "codex_tui_log", "claude_debug_log"].includes(entry.source)) return;
      const nativeErrorLevel = String(entry.level ?? "").toUpperCase() === "ERROR" ||
        /^(?:\d{4}-\d{2}-\d{2}T\S+\s+)?(?:\[ERROR\]|ERROR)(?:\s|$)/i.test(message);
      if (!nativeErrorLevel) return;
    }
    add("host_runtime_error_unassociated", [`hostLogs.entries[${index}]`],
      "A bounded native host error was collected, but its association with the original failed attempt is unconfirmed. Inspect the local record and available time/call context; preserve missing or truncated coverage and do not infer a root cause or recovery.", "attention", {
        source: entry.source, ...(status ? { status } : { level: "ERROR" }),
        originalAttemptMatch: "unconfirmed",
        messageExcerpt: redact(message).slice(0, 2000),
      });
  });
  if (!findings.some((item) => item.severity === "attention") && original?.status !== "recorded")
    add("no_incident_demonstrated", ["originalFailure.status", "hostSnapshot", "entryProbe"],
      "No original incident has been demonstrated. An anonymous 401 is expected; authenticated host tools still need separate verification.", "info");
  const gaps = [
    ...(report.evidenceSummary?.gaps ?? []).map((reason) => ({ source: "evidenceSummary", reason })),
    ...(report.gaps ?? []), ...(report.hostLogs?.gaps ?? []),
  ];
  return {
    schemaVersion: 1, diagnosticId: report.diagnosticId,
    findings, gaps, rootCause: "unconfirmed", recoveryVerified: false,
    provenance: {
      original: "originalFailure; supplied original error, time and IDs only",
      host: "hostSnapshot is agent supplied; hostLogs are bounded and attempt association may be unknown",
      later: "entryProbe/probes/wireProbes are independent later requests; success never proves original recovery",
    },
  };
}

function publicExcerpt(text, original = {}) {
  let excerpt = redact(text ?? "Unavailable; original error must not be invented.");
  for (const id of [original.callId, original.conversationId])
    if (typeof id === "string" && id.length) excerpt = excerpt.replaceAll(id, "[local ID removed]");
  return excerpt
    .replace(/\b((?:call|conversation|thread|session)[_-]?id\s*[:=]\s*)["']?[^\s,"'<>]+/gi, "$1[local ID removed]")
    .replace(/[A-Za-z]:[\\/][^\r\n"<>]*/g, "[local path removed]")
    .replace(/\/(?:Users|home|tmp|var)\/[^\s"<>]+/g, "[local path removed]")
    .replace(/\b[^\s@]+@[^\s@]+\.[a-z]{2,}\b/gi, "[email removed]")
    .slice(0, 2000);
}

export function renderPacket(report, diagnosis) {
  const facts = (includePrivateExcerpts) => diagnosis.findings.map((item) => {
    const observed = item.observed && Object.fromEntries(Object.entries(item.observed)
      .filter(([key]) => includePrivateExcerpts || key !== "messageExcerpt"));
    return `- ${item.kind}: ${item.next} Evidence: ${item.evidence.join(", ")}${observed ? ` Observed: ${redact(JSON.stringify(observed))}` : ""}`;
  }).join("\n");
  const gaps = diagnosis.gaps.map((gap) => `- ${gap.source}: ${gap.reason ?? gap.error?.message ?? "see local report"}`).join("\n") || "- None recorded; coverage is still bounded.";
  const common = (includePrivateExcerpts) => `Diagnostic ID: ${report.diagnosticId}\nHost: ${report.host} ${report.hostVersion ?? "version unknown"}\nCollector: ${report.collectorVersion}; package: ${report.pluginVersion ?? "unknown"} (not proof of loaded version)\n\n${facts(includePrivateExcerpts)}\n\nRoot cause: unconfirmed. Original host recovery: unverified.\n`;
  const summary = `# ChatCut MCP diagnosis\n\n${common(true)}\n## Evidence boundaries\n\n${Object.values(diagnosis.provenance).map((value) => `- ${value}`).join("\n")}\n\n## Original failure\n\n${redact(JSON.stringify(report.originalFailure, null, 2))}\n\n## Missing evidence\n\n${gaps}\n\n## Feedback\n\nUpload: ${report.upload?.status ?? "unknown"}; final storage verified: ${report.upload?.storageVerified === true}. An ingest receipt is not a support ticket or proof of complete storage.\nKeep this report for targeted follow-up; do not rerun collection just to resend it.\n`;
  // Deliberately excludes host log dumps, local call/conversation IDs, paths and full stacks.
  const draft = `# ChatCut MCP issue draft — review before sharing\n\n${common(false)}\n## Symptom and reproduction\n\n[Add the user's symptom and minimal safe steps; do not replay a high-impact operation.]\n\n## Original error excerpt\n\n${publicExcerpt(report.originalFailure?.message, report.originalFailure)}\n\nOriginal failure time: ${report.originalFailure?.occurredAt ?? "unknown"}. Later checks are not this attempt.\n\n## Checks and attempted repairs\n\nDoctor collected the original error if available, bounded host logs and later anonymous probes when allowed. No repair is performed by the helper.\n[Record any actual authorized change and the same-host verification result. Leave unperformed steps unperformed.]\n\n## Evidence gaps\n\n${diagnosis.gaps.map((gap) => `- ${gap.source}: ${gap.reason ?? "details retained locally"}`).join("\n")}\n\n## Delivery\n\nDiagnostic ingest: ${report.upload?.status ?? "unknown"}; final storage verified: ${report.upload?.storageVerified === true}. No ticket has been opened.\nUse https://chatcut.io/contact for private support. A public issue destination has not been selected; do not publish automatically. Review the excerpt for project names, personal data and secrets before sharing. Keep the full local JSON private unless an appropriate recipient requests it.\n`;
  return { summary, draft };
}

import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readReport } from "./doctor.mjs";
import { redact, serverUrl } from "./mcp-doctor.mjs";

async function evidenceFile(path) {
  if (typeof path !== "string" || /(?:^|[.])(config|auth|credentials|session)(?:[.]|$)/i.test(basename(path)))
    throw new Error("Supply only the exposed tool result, never configuration/auth/session files");
  const info = await lstat(path);
  if (!info.isFile() || info.size > 128 * 1024) throw new Error("Evidence must be a regular file of at most 128 KiB");
  const value = await readFile(path, "utf8");
  if (!value.trim()) throw new Error("Evidence is empty");
  return value;
}

const fact = value => typeof value === "string" && value.trim() && value.length <= 1000 ? redact(value) : null;

export async function recordRecheck(options) {
  if (!options.report || options.activeCase) throw new Error("Explicit --report is required; no active-case or time-based report selection");
  const path = resolve(options.report);
  const { report, sourceReportSha256 } = await readReport(path);
  if (!["codex", "claude"].includes(options.host) || !["success", "failed"].includes(options.outcome) ||
      !/^[A-Za-z0-9_.:/-]{1,256}$/.test(options.operation ?? ""))
    throw new Error("Record the actual Hosted native tool operation, host and outcome");
  if (options.source && options.source !== "native_tool_result")
    throw new Error("Configuration, tool discovery and independent HTTP probes are not native tool results");
  const endpoint = options.serverUrl ? serverUrl(options.serverUrl).href : null;
  if (report.serverUrl && endpoint && endpoint !== report.serverUrl)
    throw new Error("Different target service; preserve it separately instead of recording an incident recheck");
  const result = redact(await evidenceFile(options.result));
  if (options.outcome === "success") {
    let data;
    try { data = JSON.parse(result); } catch { /* Text alone does not establish a native success. */ }
    if (!data || typeof data !== "object" || data.isError === true || data.error ||
        data.mcpServers || data.transport || data.tools || data.configuration ||
        (typeof data.status === "number" && (data.body !== undefined || data.headers !== undefined)))
      throw new Error("Need the actually exposed native tool result; configuration, tool lists and independent probes are not a successful recheck");
  }
  if (options.observedAt !== undefined &&
      (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(options.observedAt) || !Number.isFinite(Date.parse(options.observedAt))))
    throw new Error("Observed time must come from the tool event; omit it when unknown");
  const observation = {
    schemaVersion: 1, diagnosticId: report.diagnosticId, sourceReportSha256,
    recordedAt: new Date().toISOString(), observedAt: options.observedAt ?? null,
    source: "agent_supplied_native_tool_result; not_independently_verified",
    host: options.host, configurationScope: fact(options.configScope), serverUrl: endpoint,
    projectId: fact(options.projectId), conversationId: fact(options.conversationId), callId: fact(options.callId),
    operation: options.operation, outcome: options.outcome, message: result,
    originalReportUnchanged: true, originalAttemptAssociation: "unconfirmed",
    accountAuthentication: "unconfirmed", recoveryVerified: false,
  };
  if (createHash("sha256").update(await readFile(path)).digest("hex") !== sourceReportSha256)
    throw new Error("Original report changed during recheck recording");
  const output = `${path}.recheck-${randomUUID()}.json`;
  await writeFile(output, JSON.stringify(observation, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { ...observation, path: output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: Object.fromEntries([
      "report", "result", "outcome", "operation", "host", "server-url", "config-scope", "project-id",
      "conversation-id", "call-id", "observed-at", "source",
    ].map(name => [name, { type: "string" }])) });
    console.log(JSON.stringify(await recordRecheck({ ...values, serverUrl: values["server-url"],
      configScope: values["config-scope"], projectId: values["project-id"], conversationId: values["conversation-id"],
      callId: values["call-id"], observedAt: values["observed-at"] })));
  } catch (error) {
    console.error(JSON.stringify({ recheckRecordingFailed: true, message: redact(error.message) })); process.exitCode = 1;
  }
}

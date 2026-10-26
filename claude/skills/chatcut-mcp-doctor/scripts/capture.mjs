import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { redact, runDoctor, serverUrl } from "./mcp-doctor.mjs";

const execute = promisify(execFile);
const save = (path, data) => writeFile(path, JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
const now = () => new Date().toISOString();

async function dedicatedText(path) {
  if (!/\.mcp-error\.txt$/i.test(basename(path))) throw new Error("Use a dedicated .mcp-error.txt containing only the exposed original error");
  const info = await lstat(path);
  if (!info.isFile() || info.size > 64 * 1024) throw new Error("Original error must be a regular file of at most 64 KiB");
  const text = await readFile(path, "utf8");
  if (!text.trim()) throw new Error("Original error is empty");
  return redact(text);
}

// This projects one current project file in memory. Never retain headers,
// command/env, unrelated servers, or user/local credential-bearing config.
async function projectRegistration(cwd, name) {
  try {
    const path = join(cwd, ".mcp.json"), info = await lstat(path);
    if (!info.isFile() || info.size > 128 * 1024) throw new Error("project_config_not_regular_or_too_large");
    const config = JSON.parse(await readFile(path, "utf8"));
    const item = config?.mcpServers?.[name];
    if (!item) return { lookupResult: "unavailable", message: "The current project .mcp.json has no selected entry. Local, user and plugin scopes and the active session were not queried; absence in the host is unconfirmed." };
    const url = serverUrl(item.url).href;
    return { lookupResult: "found", url, message: `Current project .mcp.json contains the selected HTTP registration ${name}. Static configuration only; active tools and authentication are unknown.` };
  } catch (error) {
    return { lookupResult: "unavailable", message: error.code === "ENOENT"
      ? "The current project .mcp.json is absent. Local, user and plugin scopes and the active session were not queried; absence in the host is unconfirmed."
      : `Current project registration projection unavailable (${error.code ?? error.name}). Configuration contents were not retained.` };
  }
}

export function projectNativeLookup(host, name, result) {
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "").trim();
  // Exact completed native no-entry responses only. Nonzero alone is not absence.
  const absent = host === "claude"
    ? `No MCP server named "${name}". Run \`claude mcp add\` to add one.`
    : `Error: No MCP server named '${name}' found.`;
  if (result.code === 1 && text === absent) return { lookupResult: "not_found", message: absent };
  if (result.code === 0) {
    try {
      const config = host === "codex" ? JSON.parse(text) : null;
      const raw = config?.transport?.url ?? (host === "claude" ? text.match(/^\s*URL:\s*(\S+)\s*$/m)?.[1] : undefined);
      const url = serverUrl(raw).href;
      return { lookupResult: "found", url, message: `Native ${host} mcp get completed and returned the selected HTTP registration ${name}. Headers and other configuration fields were discarded. This is not proof of active-session tools or authentication.` };
    } catch { /* Do not echo unrecognized configuration or credentials. */ }
  }
  return { lookupResult: "unavailable", message: `Native registration lookup did not establish existence or absence (exit ${result.code ?? "unknown"}; ${result.errorCode ?? "output_unrecognized"}). Raw configuration output was not retained.` };
}

async function nativeRegistration(host, name, cli) {
  const args = ["mcp", "get", name, ...(host === "codex" ? ["--json"] : [])];
  let result;
  try { result = { ...await execute(cli ?? host, args, { timeout: 12000, maxBuffer: 128 * 1024, windowsHide: true }), code: 0 }; }
  catch (error) { result = { stdout: error.stdout, stderr: error.stderr, code: typeof error.code === "number" ? error.code : null, errorCode: error.killed ? "lookup_timeout" : String(error.code ?? "lookup_failed") }; }
  return projectNativeLookup(host, name, result);
}

export async function capture(options, dependencies = {}) {
  if (!["codex", "claude"].includes(options.host)) throw new Error("--host must be codex or claude");
  const name = options.serverName ?? "chatcut";
  if (!["chatcut", "plugin:chatcut:chatcut"].includes(name)) throw new Error("Select the actual ChatCut server name");
  if (options.operation && !/^[A-Za-z0-9_.:/-]{1,256}$/.test(options.operation)) throw new Error("Invalid known operation");
  if (options.originalError && options.failureRecord) throw new Error("Choose the saved original error or an existing dedicated failure record");
  // Validate explicit endpoint before any optional native connection check.
  const selected = options.serverUrl ? serverUrl(options.serverUrl).href : null;
  const cwd = resolve(options.cwd ?? process.cwd());
  const originalInput = options;
  const base = join(cwd, ".chatcut-doctor");
  await mkdir(base, { recursive: true, mode: 0o700 });
  const dir = await mkdtemp(join(base, "capture-"));
  const startedAt = now();
  const lookup = options.nativeLookup
    ? await (dependencies.nativeRegistration ?? nativeRegistration)(options.host, name, options.cli)
    : options.host === "claude" ? await projectRegistration(cwd, name)
      : { lookupResult: "unavailable", message: "Offline capture did not invoke native CLI or read user configuration. Active registration, tools and authentication remain unconfirmed." };
  const source = options.nativeLookup ? "cli_configuration" : "host_settings";
  const snapshot = { schemaVersion: 1, observedAt: now(), observations: [{
    stage: "host_registration", operation: "lookup_registered_server", source,
    observedAt: now(), outcome: lookup.lookupResult === "found" ? "success" : "failed",
    lookupResult: lookup.lookupResult, message: lookup.message,
  }] };
  const endpoint = selected ?? lookup.url;
  if (lookup.url && (!selected || selected === lookup.url)) snapshot.configuration = { source, serverName: name, url: lookup.url, enabled: null };
  if (selected && lookup.url && selected !== lookup.url) snapshot.observations[0].message += " The explicitly selected endpoint differs; it was preserved without replacing the configured endpoint. No connection or authentication inference is made.";
  const snapshotPath = join(dir, "current.mcp-snapshot.json");
  await save(snapshotPath, snapshot);
  let failureRecord = originalInput.failureRecord;
  if (originalInput.originalError) {
    failureRecord = join(dir, "original.mcp-failure.json");
    await save(failureRecord, { schemaVersion: 1, source: "host_tool_result", serverName: name,
      occurredAt: null, ...(options.operation && { operation: options.operation }), error: { message: await dedicatedText(originalInput.originalError) } });
  }
  const { path, report } = await runDoctor({ host: options.host, serverUrl: endpoint,
    hostSnapshot: snapshotPath, failureRecord, offline: true, output: join(dir, "diagnostic.mcp-report.json") }, dependencies);
  const packet = { diagnosticId: report.diagnosticId, report: path, upload: report.upload, recoveryVerified: false };
  const bytes = await readFile(path), saved = JSON.parse(bytes);
  if (saved.diagnosticId !== report.diagnosticId || saved.schemaVersion !== 2) throw new Error("Saved report identity check failed");
  const sourceReportSha256 = createHash("sha256").update(bytes).digest("hex");
  const receipt = { schemaVersion: 1, startedAt, completedAt: now(), ...packet, snapshot: snapshotPath,
    sourceReportSha256, savedReportVerified: true,
    nativeLookupRequested: Boolean(options.nativeLookup), diagnosticHttpRequests: 0,
    nativeLookupMayConnect: Boolean(options.nativeLookup), lookupResult: lookup.lookupResult,
    originalInput: originalInput.originalError ? resolve(originalInput.originalError) : originalInput.failureRecord ? resolve(originalInput.failureRecord) : null };
  await save(join(dir, "capture-receipt.json"), receipt);
  return receipt;
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { host: { type: "string" }, "server-name": { type: "string" },
    "server-url": { type: "string" }, "original-error": { type: "string" }, operation: { type: "string" },
    "failure-record": { type: "string" }, "native-lookup": { type: "boolean", default: false }, cli: { type: "string" } } });
  console.log(JSON.stringify(await capture({ host: values.host, serverName: values["server-name"], serverUrl: values["server-url"],
    originalError: values["original-error"], operation: values.operation, failureRecord: values["failure-record"],
    nativeLookup: values["native-lookup"], cli: values.cli })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ captureFailed: true, message: redact(error.message) })); process.exitCode = 1;
});

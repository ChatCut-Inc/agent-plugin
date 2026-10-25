import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { redact, runDoctor, serverUrl } from "./mcp-doctor.mjs";
import { writePacket } from "./doctor.mjs";

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
  let failureRecord = options.failureRecord;
  if (options.originalError) {
    failureRecord = join(dir, "original.mcp-failure.json");
    await save(failureRecord, { schemaVersion: 1, source: "host_tool_result", serverName: name,
      occurredAt: null, ...(options.operation && { operation: options.operation }), error: { message: await dedicatedText(options.originalError) } });
  }
  const { path, report } = await runDoctor({ host: options.host, serverUrl: endpoint,
    hostSnapshot: snapshotPath, failureRecord, offline: true, output: join(dir, "diagnostic.mcp-report.json") }, dependencies);
  const packet = await writePacket(path, report);
  const zhPath = path + ".zh-CN.md";
  const note = `# ChatCut MCP 本轮诊断\n\n诊断编号：${report.diagnosticId}\n采集时间：${report.collectedAt}（不是原始错误时间）\n宿主：${report.host}\n\n本轮事实：${lookup.message}\n\n原始错误：${report.originalFailure.status === "recorded" ? report.originalFailure.message : "未提供可见的原始 MCP 错误；未编造。"}\n原始时间：${report.originalFailure.occurredAt ?? "未知"}；调用 ID：${report.originalFailure.callId ?? "未知"}。\n\n程序已保存本轮 snapshot、schema-2 正式报告及诊断 sidecar。结论：${packet.findings.map(x => x.kind).join("、")}。根因尚未确认。\n实际处理：${options.nativeLookup ? "已运行一次用户允许的原生注册查询；该命令可能附带健康连接检查。" : "仅投影当前工程允许的配置字段并离线采集；没有调用原生 CLI 或发送诊断请求。"} 未修改注册、登录或权限。\n复验：尚未执行安全的原生工具读取；配置存在不代表当前连接或账号健康。后续复验单独记录，原报告不变。\n发送：未上报、未开工单，最终存储未验证。\n缺口：${report.evidenceSummary?.gaps?.join("；") || "详见正式报告"}。\n\n正式报告：${path}\n`;
  await writeFile(zhPath, note, { flag: "wx", mode: 0o600 });
  const bytes = await readFile(path), saved = JSON.parse(bytes);
  if (saved.diagnosticId !== report.diagnosticId || saved.schemaVersion !== 2) throw new Error("Saved report identity check failed");
  const receipt = { schemaVersion: 1, startedAt, completedAt: now(), ...packet, snapshot: snapshotPath, chineseNote: zhPath,
    sourceReportSha256: createHash("sha256").update(bytes).digest("hex"), savedReportVerified: true,
    nativeLookupRequested: Boolean(options.nativeLookup), diagnosticHttpRequests: 0,
    nativeLookupMayConnect: Boolean(options.nativeLookup), lookupResult: lookup.lookupResult,
    originalInput: options.originalError ? resolve(options.originalError) : options.failureRecord ? resolve(options.failureRecord) : null };
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

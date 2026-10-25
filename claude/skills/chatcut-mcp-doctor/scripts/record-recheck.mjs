import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readReport } from "./doctor.mjs";
import { redact } from "./mcp-doctor.mjs";
import { readActiveCase } from "./active-case.mjs";

export async function recordRecheck(options) {
  if (Boolean(options.report) === Boolean(options.activeCase)) throw new Error("Choose --active-case for the program-tracked incident, or an explicit --report");
  const active = options.activeCase ? await readActiveCase(options.cwd ?? process.cwd()) : null;
  const path = active ? active.report : resolve(options.report);
  const { report, sourceReportSha256 } = await readReport(path);
  if (!["success", "failed"].includes(options.outcome) || options.operation !== "list_projects" ||
      typeof options.scope !== "string" || !options.scope.trim() || options.scope.length > 1000)
    throw new Error("Record the actual safe list_projects result, outcome and same-host/scope boundary");
  if (!options.result.endsWith(".mcp-recheck.txt")) throw new Error("Use the dedicated .mcp-recheck.txt exposed result only");
  const info = await lstat(options.result);
  if (!info.isFile() || info.size > 64 * 1024) throw new Error("Recheck result must be a regular file of at most 64 KiB");
  const result = redact(await readFile(options.result, "utf8"));
  if (!result.trim()) throw new Error("Recheck result is empty");
  if (options.outcome === "success") {
    let data;
    try { data = JSON.parse(result); } catch { /* CLI configuration text is not a tool result. */ }
    if (!data || data.isError === true || data.error ||
        !Array.isArray(data.projects ?? data.structuredContent?.projects))
      throw new Error("Successful list_projects recording needs the actually exposed projects[] JSON (or structuredContent.projects[]). Native mcp get/configuration text is not a tool result. Preserve it separately and wait for the actual safe native read; do not manufacture JSON or replay a failed tool.");
  }
  const observation = { schemaVersion: 1, diagnosticId: report.diagnosticId, sourceReportSha256,
    recordedAt: new Date().toISOString(), observedAt: null,
    source: "agent_supplied_native_tool_result; not_independently_verified", host: report.host,
    scope: redact(options.scope), operation: options.operation, outcome: options.outcome, message: result,
    originalReportUnchanged: true, originalAttemptAssociation: "unconfirmed", accountAuthentication: "unconfirmed" };
  const output = path + ".recheck.json";
  await writeFile(output, JSON.stringify(observation, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  if (createHash("sha256").update(await readFile(path)).digest("hex") !== sourceReportSha256) throw new Error("Original report changed during recheck recording");
  const note = `${path}.recheck.zh-CN.md`;
  await writeFile(note, `# 本轮安全复验\n\n诊断编号：${report.diagnosticId}\n宿主/范围：${report.host}；${observation.scope}\n实际操作：原生 list_projects；结果：${options.outcome}。\n已暴露结果：${result}\n\n记录时间：${observation.recordedAt}；原生事件时间未提供，保持未知。上述事实由 Agent 从实际工具结果单独记录；配置/账号认证及原故障恢复未据此确认。原始报告及其 SHA-256 保持不变。没有上报或开工单。\n`, { flag: "wx", mode: 0o600 });
  return { ...observation, path: output, chineseNote: note };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { report: { type: "string" }, "active-case": { type: "boolean", default: false }, result: { type: "string" },
    outcome: { type: "string" }, operation: { type: "string" }, scope: { type: "string" } } });
  recordRecheck({ ...values, activeCase: values["active-case"] }).then(x => console.log(JSON.stringify(x))).catch(error => {
    console.error(JSON.stringify({ recheckRecordingFailed: true, message: redact(error.message) })); process.exitCode = 1;
  });
}

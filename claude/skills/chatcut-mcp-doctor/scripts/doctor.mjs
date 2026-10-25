import { readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli, submitReport, errorDetails } from "./mcp-doctor.mjs";
import { diagnose, renderPacket } from "./diagnosis.mjs";

export async function writePacket(path, report) {
  const diagnosis = diagnose(report);
  const { summary, draft } = renderPacket(report, diagnosis);
  const files = { diagnosis: `${path}.diagnosis.json`, summary: `${path}.summary.md`, issueDraft: `${path}.issue-draft.md` };
  // These are derived sidecars. The source report and diagnostic ID stay unchanged.
  await writeFile(files.diagnosis, JSON.stringify(diagnosis, null, 2) + "\n", { mode: 0o600 });
  await writeFile(files.summary, summary, { mode: 0o600 });
  await writeFile(files.issueDraft, draft, { mode: 0o600 });
  return { diagnosticId: report.diagnosticId, report: path, ...files, findings: diagnosis.findings, upload: report.upload, recoveryVerified: false };
}

function dedicatedReportPath(path) {
  return /(?:\.mcp-report|chatcut-mcp-doctor-[a-f0-9-]+)\.json$/i.test(basename(path)) ||
    /^mcp-report(?:-\d+)?\.json$/i.test(basename(path));
}

async function readReport(path) {
  // Do not accept config/auth/session files even as a mistakenly supplied input.
  if (!dedicatedReportPath(path))
    throw new Error("Use the dedicated .mcp-report.json or default chatcut-mcp-doctor-<id>.json report, never config/auth/session files");
  if ((await stat(path)).size > 2 * 1024 * 1024) throw new Error("Report exceeds 2 MiB; retained locally without reading");
  const bytes = await readFile(path);
  const report = JSON.parse(bytes);
  if (report.schemaVersion !== 2 || report.scope !== "cloud" || !["codex", "claude"].includes(report.host) ||
      !/^[a-f0-9-]{36}$/i.test(report.diagnosticId ?? "") || !report.originalFailure || !report.hostLogs)
    throw new Error("Not a schema-2 ChatCut MCP report");
  return { report, sourceReportSha256: createHash("sha256").update(bytes).digest("hex") };
}

async function readReceipt(path, report, sourceReportSha256) {
  try {
    if ((await stat(path)).size > 32 * 1024) throw new Error("Upload receipt exceeds 32 KiB");
    const stored = JSON.parse(await readFile(path, "utf8"));
    if (stored.schemaVersion !== 1 || stored.diagnosticId !== report.diagnosticId ||
        stored.sourceReportSha256 !== sourceReportSha256 || !stored.receipt ||
        typeof stored.receipt.status !== "string" || stored.receipt.storageVerified !== false)
      throw new Error("Upload receipt does not match this diagnostic report; preserve both files for review");
    return stored.receipt;
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}

export async function main(args = process.argv.slice(2)) {
  let result;
  if (["--report", "--upload-report"].includes(args[0])) {
    if (args.length !== 2) throw new Error("Use --report <existing report> or --upload-report <existing report> alone");
    const path = resolve(args[1]);
    const { report, sourceReportSha256 } = await readReport(path);
    const receiptPath = `${path}.upload.json`;
    const prior = await readReceipt(receiptPath, report, sourceReportSha256);
    if (args[0] === "--upload-report") {
      if (report.upload?.status === "ingest_accepted")
        throw new Error("Ingest already acknowledged this report; do not send it again");
      if (prior?.status === "ingest_accepted") throw new Error("Ingest already acknowledged this report; do not send it again");
      report.upload = await submitReport(report);
      await writeFile(receiptPath, JSON.stringify({ schemaVersion: 1, diagnosticId: report.diagnosticId, sourceReportSha256, receipt: report.upload }, null, 2) + "\n", { mode: 0o600 });
    } else {
      if (prior) report.upload = prior;
    }
    result = { path, report };
  } else {
    const outputs = args.flatMap((arg, index) => arg === "--output"
      ? [args[index + 1] ?? ""] : arg.startsWith("--output=") ? [arg.slice(9)] : []);
    if (outputs.some(path => !dedicatedReportPath(path)))
      throw new Error("Use --output <name.mcp-report.json> or mcp-report.json so the saved report can be reused with --report and --upload-report");
    if (args.includes("--help")) {
      console.log("ChatCut MCP Doctor: collector options below also produce a diagnosis, summary and private issue draft. --offline sends no requests. --report <existing .mcp-report.json> rebuilds feedback offline. --upload-report <existing .mcp-report.json> sends that report once without new probes; use only for an authorized retry. No automatic repair or ticket submission.");
    }
    result = await runCli(args);
  }
  if (result) console.log(JSON.stringify(await writePacket(result.path, result.report)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ doctorFailed: true, error: errorDetails(error) }));
    process.exitCode = 1;
  });
}

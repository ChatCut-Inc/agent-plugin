import { lstat, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { submitReport, errorDetails } from "./mcp-doctor.mjs";
import { diagnose, renderPacket } from "./diagnosis.mjs";

export async function writePacket(path, report) {
  const diagnosis = diagnose(report);
  const { summary, draft } = renderPacket(report, diagnosis);
  const files = { diagnosis: `${path}.diagnosis.json`, summary: `${path}.summary.md`, issueDraft: `${path}.issue-draft.md` };
  await writeFile(files.diagnosis, JSON.stringify(diagnosis, null, 2) + "\n", { mode: 0o600 });
  await writeFile(files.summary, summary, { mode: 0o600 });
  await writeFile(files.issueDraft, draft, { mode: 0o600 });
  return { diagnosticId: report.diagnosticId, report: path, ...files, findings: diagnosis.findings, upload: report.upload, recoveryVerified: false };
}

export async function readReport(path) {
  if (/^(?:config|auth|credentials|session)(?:\.|$)/i.test(basename(path)))
    throw new Error("Use a diagnostic report, never configuration, credentials or session files");
  const info = await lstat(path);
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error("Report must be a regular file of at most 2 MiB");
  const bytes = await readFile(path);
  const report = JSON.parse(bytes);
  if (report.schemaVersion !== 2 || report.scope !== "cloud" || !["codex", "claude"].includes(report.host) ||
      !/^[a-f0-9-]{36}$/i.test(report.diagnosticId ?? "") || !report.originalFailure || !report.hostLogs)
    throw new Error("Not a schema-2 Hosted ChatCut MCP report");
  return { report, sourceReportSha256: createHash("sha256").update(bytes).digest("hex") };
}

async function readReceipt(path, report, sourceReportSha256) {
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.size > 32 * 1024) throw new Error("Upload receipt must be a regular file of at most 32 KiB");
    const stored = JSON.parse(await readFile(path, "utf8"));
    if (stored.schemaVersion !== 1 || stored.diagnosticId !== report.diagnosticId ||
        stored.sourceReportSha256 !== sourceReportSha256 || !stored.receipt ||
        typeof stored.receipt.status !== "string" || stored.receipt.storageVerified !== false)
      throw new Error("Upload receipt does not match this diagnostic report; preserve both files for review");
    return stored.receipt;
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}

export async function uploadReport(path, dependencies = {}) {
  path = resolve(path);
  const lockPath = `${path}.upload.lock`;
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Upload already owned or interrupted; inspect the existing receipt and lock before an authorized retry");
    throw error;
  }
  let release = true;
  try {
    const { report, sourceReportSha256 } = await readReport(path);
    const receiptPath = `${path}.upload.json`;
    const prior = await readReceipt(receiptPath, report, sourceReportSha256);
    if (report.upload?.status === "ingest_accepted" || prior?.status === "ingest_accepted")
      throw new Error("Ingest already acknowledged this report; do not send it again");
    const uncertain = receipt => receipt?.deliveryUncertain || ["pending", "sending"].includes(receipt?.status) ||
      (receipt?.status === "failed" && receipt.deliveryUncertain !== false);
    if (uncertain(report.upload) || uncertain(prior))
      throw new Error("Previous delivery is uncertain; verify stored fragments before considering another send");
    const persist = async receipt => {
      const pending = `${receiptPath}.writing-${randomUUID()}`;
      try {
        await writeFile(pending, JSON.stringify({ schemaVersion: 1, diagnosticId: report.diagnosticId, sourceReportSha256, receipt }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
        await rename(pending, receiptPath);
      } catch (error) { await unlink(pending).catch(() => {}); throw error; }
    };
    // A crash after POST must leave an uncertain delivery, never a fresh retry.
    await persist({ status: "sending", storageVerified: false, deliveryUncertain: true });
    release = false;
    const receipt = await submitReport(report, dependencies.fetchImpl);
    await persist(receipt);
    release = true;
    return { diagnosticId: report.diagnosticId, report: path, sourceReportSha256, receiptPath, receipt };
  } finally {
    await lock.close();
    if (release) await unlink(lockPath);
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length !== 2 || !["--report", "--upload-report"].includes(args[0]))
    throw new Error("Use --report <existing report> for optional feedback or --upload-report <existing report> for authorized delivery. Collect only when needed with capture.mjs or mcp-doctor.mjs.");
  const path = resolve(args[1]);
  if (args[0] === "--upload-report") { console.log(JSON.stringify(await uploadReport(path))); return; }
  const { report, sourceReportSha256 } = await readReport(path);
  const prior = await readReceipt(`${path}.upload.json`, report, sourceReportSha256);
  if (prior) report.upload = prior;
  console.log(JSON.stringify(await writePacket(path, report)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(JSON.stringify({ doctorFailed: true, error: errorDetails(error) })); process.exitCode = 1;
  });
}

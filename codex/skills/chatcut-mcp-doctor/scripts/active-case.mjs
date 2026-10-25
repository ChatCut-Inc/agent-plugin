import { lstat, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { readReport } from "./doctor.mjs";

export async function readActiveCase(cwd, host) {
  const base = resolve(cwd, ".chatcut-doctor"), path = join(base, "active-case.json");
  const info = await lstat(path);
  if (!info.isFile() || info.size > 8192) throw new Error("Active case must be a bounded program-generated index");
  const value = JSON.parse(await readFile(path, "utf8"));
  const target = resolve(value.report ?? "");
  if (value.schemaVersion !== 1 || !target.startsWith(base + sep) ||
      !["codex", "claude"].includes(value.host) || (host && value.host !== host))
    throw new Error("Active case does not identify this workspace/host");
  const { report, sourceReportSha256 } = await readReport(target);
  if (report.host !== value.host || report.diagnosticId !== value.diagnosticId || sourceReportSha256 !== value.sourceReportSha256)
    throw new Error("Active case report identity/hash mismatch; preserve files for review");
  return { ...value, report: target };
}

export async function selectActiveCase(cwd, report, path, sourceReportSha256, explicitEvidence) {
  let prior;
  try { prior = await readActiveCase(cwd, report.host); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  // A follow-up entry's baseline must not replace the incident being rechecked.
  // Explicit original evidence or a fresh native missing-entry finding starts
  // a case; otherwise keep a recent same-endpoint case, without claiming recovery.
  const pending = prior && Date.now() - Date.parse(prior.recordedAt) < 30 * 60 * 1000 && prior.serverUrl === report.serverUrl;
  const evidenceFingerprint = report.originalFailure.status === "recorded"
    ? createHash("sha256").update(JSON.stringify(report.originalFailure)).digest("hex") : null;
  if (pending && (!explicitEvidence || (evidenceFingerprint && evidenceFingerprint === prior.evidenceFingerprint))) return prior;
  const selected = { schemaVersion: 1, host: report.host, report: resolve(path), diagnosticId: report.diagnosticId,
    sourceReportSha256, serverUrl: report.serverUrl, evidenceFingerprint, recordedAt: new Date().toISOString() };
  await writeFile(join(cwd, ".chatcut-doctor", "active-case.json"), JSON.stringify(selected, null, 2) + "\n", { mode: 0o600 });
  return selected;
}

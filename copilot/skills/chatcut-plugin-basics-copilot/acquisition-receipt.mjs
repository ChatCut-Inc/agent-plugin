// Shared by the packaged host skills; only touches the optional receipt file.
import { readFileSync, lstatSync, writeFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const [action, environment, host, expectedCode] = process.argv.slice(2);
const PENDING_RECEIPT_TTL_MS = 7 * 86400000;
if (
  !["pending", "acknowledge"].includes(action) ||
  !["production", "beta", "local"].includes(environment) ||
  !["codex", "claude", "copilot"].includes(host)
) {
  throw new Error(
    "Usage: acquisition-receipt.mjs pending|acknowledge production|beta|local codex|claude|copilot [exact-linked-code]",
  );
}
const file = join(
  homedir(),
  ".chatcut",
  "acquisition",
  environment,
  `${host}.json`,
);
let result = {};
try {
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 2048)
    throw new Error("Invalid receipt file");
  const receipt = JSON.parse(readFileSync(file, "utf8"));
  const valid =
    receipt.version === 1 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      receipt.code,
    ) &&
    receipt.environment === environment &&
    receipt.host === host &&
    receipt.target === "web_plugin" &&
    Number.isFinite(receipt.createdAt) &&
    receipt.createdAt <= Date.now() + 300000 &&
    Date.now() - receipt.createdAt < PENDING_RECEIPT_TTL_MS;
  if (valid && !receipt.hostedLinked) {
    if (action === "pending") result = { installationReceipt: receipt.code };
    else if (receipt.code === expectedCode) {
      const temporary = `${file}.${randomUUID()}.tmp`;
      writeFileSync(
        temporary,
        JSON.stringify({ ...receipt, hostedLinked: true }),
        { mode: 0o600, flag: "wx" },
      );
      renameSync(temporary, file);
      result = { acknowledged: true };
    }
  }
} catch {
  /* Optional attribution never blocks a user's editing task. */
}
console.log(JSON.stringify(result));

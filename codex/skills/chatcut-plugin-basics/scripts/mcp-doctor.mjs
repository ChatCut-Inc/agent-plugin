// Compatibility entry; the standalone Doctor owns the collector.
export * from "../../chatcut-mcp-doctor/scripts/mcp-doctor.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "../../chatcut-mcp-doctor/scripts/mcp-doctor.mjs";
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runCli();

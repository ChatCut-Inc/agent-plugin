import { readFile, writeFile } from "node:fs/promises";

// Packages remain self-contained; only this source is edited for collection changes.
const source = new URL("../codex/skills/chatcut-plugin-basics/", import.meta.url);
const targets = [
  "../claude/skills/chatcut-plugin-basics-claude/",
  "../codex/skills/chatcut-mcp-doctor/",
  "../claude/skills/chatcut-mcp-doctor/",
];
for (const file of ["mcp-doctor.mjs", "mcp-evidence.mjs", "mcp-failure.mjs", "mcp-wire.mjs"]) {
  const bytes = await readFile(new URL(`scripts/${file}`, source));
  for (const target of targets) {
    const path = new URL(`${target}scripts/${file}`, import.meta.url);
    if (process.argv.includes("--check")) {
      if (!bytes.equals(await readFile(path))) throw new Error(`Generated MCP helper differs: ${path.pathname}; run node scripts/sync-mcp-helpers.mjs`);
    } else await writeFile(path, bytes);
  }
}

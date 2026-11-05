import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const hosts = [
  ["codex", "codex/skills/chatcut-plugin-basics/", "codex mcp login chatcut"],
  ["claude", "claude/skills/chatcut-plugin-basics-claude/", "claude mcp add-json --scope user chatcut"],
];
const removedResources = [
  "scripts/mcp-doctor.mjs",
  "scripts/mcp-evidence.mjs",
  "scripts/mcp-failure.mjs",
  "scripts/mcp-wire.mjs",
  "references/connection-diagnostics.md",
];
const collectorReferences = /mcp-(?:doctor|evidence|failure|wire|snapshot)|connection-diagnostics|evidenceSummary|--failure-record/;

for (const [host, folder, setupCommand] of hosts) {
  const skillRoot = new URL(`../${folder}`, import.meta.url);

  test(`${host} basics retain hosted setup without the removed diagnostic workflow`, async () => {
    const skill = await readFile(new URL("SKILL.md", skillRoot), "utf8");
    assert.ok(skill.includes(setupCommand));
    assert.ok(skill.includes("https://api.chatcut.io/api/external-mcp/mcp"));
    assert.ok(skill.includes("keep the original error and identify the failing step"));
    assert.doesNotMatch(skill, collectorReferences);
  });

  test(`${host} basics no longer bundle diagnostic scripts or references`, async () => {
    for (const path of removedResources) {
      await assert.rejects(access(new URL(path, skillRoot)), { code: "ENOENT" });
    }
  });
}

test("Claude README no longer advertises the removed diagnostic helper", async () => {
  const readme = await readFile(new URL("../claude/README.md", import.meta.url), "utf8");
  assert.doesNotMatch(readme, collectorReferences);
  assert.doesNotMatch(readme, /bundled diagnostic|telemetry endpoint/);
  await assert.rejects(access(new URL("../docs/mcp-doctor.md", import.meta.url)), { code: "ENOENT" });
});

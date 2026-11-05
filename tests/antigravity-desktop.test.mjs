import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../antigravity-desktop/", import.meta.url));
const read = (path) => readFile(new URL(path, `file://${root}`), "utf8");

test("Antigravity Desktop package ships no MCP server and only the connect Skill", async () => {
  await assert.rejects(access(`${root}mcp_config.json`));
  assert.deepEqual(await readdir(`${root}skills`), ["connect-chatcut-desktop"]);
  const manifest = JSON.parse(await read("plugin.json"));
  // Not `chatcut`, so it can sit next to the hosted Web package and is never
  // mistaken for it when Desktop manages conflicting hosted plugins.
  assert.equal(manifest.name, "chatcut-desktop");
  assert.equal(manifest.mcpServers, undefined);
});

test("Antigravity Desktop Skill installs with its own source and never connects Web", async () => {
  const skill = await read("skills/connect-chatcut-desktop/SKILL.md");
  assert.match(skill, /CHATCUT_INSTALL_SOURCE=antigravity_marketplace sh/);
  assert.match(skill, /\$env:CHATCUT_INSTALL_SOURCE='antigravity_marketplace'/);
  assert.match(skill, /agy mcp add --env CHATCUT_MCP_CLIENT=antigravity chatcut_desktop/);
  assert.match(skill, /\.chatcut-desktop-skills\.json/);
  assert.doesNotMatch(skill, /external-mcp|web-plugin|chatcut_chatcut/);
});

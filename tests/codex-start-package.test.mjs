import assert from "node:assert/strict";
import { readFile, realpath, readdir } from "node:fs/promises";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = async (relative) =>
  JSON.parse(await readFile(path.join(root, relative), "utf8"));

test("each Codex entry resolves to its own contained startup Skill and brand assets", async () => {
  const marketplace = await json(".agents/plugins/marketplace.json");
  assert.equal(new Set(marketplace.plugins.map((entry) => entry.name)).size, marketplace.plugins.length);
  for (const [name, directory] of [
    ["chatcut", "codex"],
    ["chatcut-desktop", "chatcut-desktop-codex-plugin"],
  ]) {
    const entry = marketplace.plugins.find((candidate) => candidate.name === name);
    assert.equal(entry.source.path, `./${directory}`);
    const pluginRoot = await realpath(path.join(root, directory));
    const manifest = await json(`${directory}/.codex-plugin/plugin.json`);
    assert.equal(manifest.name, name);
    assert.equal(entry.category, manifest.interface.category);
    const onboarding = manifest.extensions["com.openai"].onboardingSkill;
    assert.ok(onboarding.startsWith(manifest.skills));
    for (const relative of [onboarding, manifest.interface.logo, manifest.interface.composerIcon]) {
      assert.ok(relative.startsWith("./"));
      const resolved = await realpath(path.join(pluginRoot, relative));
      assert.ok(resolved.startsWith(`${pluginRoot}${path.sep}`));
      assert.ok((await readFile(resolved)).length > 0);
    }
    const skill = await readFile(path.join(pluginRoot, onboarding), "utf8");
    assert.match(skill, /^---\nname: [a-z0-9-]+\ndescription: [^\n]+\n---\n/);
  }
});

test("Desktop onboarding stays instructions-only and cannot replace the hosted runtime", async () => {
  const manifest = await json("chatcut-desktop-codex-plugin/.codex-plugin/plugin.json");
  for (const key of ["mcpServers", "apps", "hooks"]) assert.equal(manifest[key], undefined);
  const files = await readdir(path.join(root, "chatcut-desktop-codex-plugin"), { recursive: true });
  assert.ok(!files.some((file) => /(^|[/\\])(\.?mcp\.json|scripts|hooks)([/\\]|$)/.test(file)));
  const hosted = await json("codex/.mcp.json");
  assert.equal(hosted.mcpServers.chatcut.url, "https://api.chatcut.io/api/external-mcp/mcp");
  assert.equal(hosted.mcpServers.chatcut.http_headers["x-chatcut-home"], undefined);
});

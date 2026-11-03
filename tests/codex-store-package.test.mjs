import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildStoreManifest,
  buildStoreMcpConfig,
  codexOAuthCallbackId,
  markSkillRegistration,
  stageStorePackage,
  validateStorePackage,
} from "../codex-store/build.mjs";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

const listing = await readJson("codex-store/listing.json");
const manifest = await readJson("codex/.codex-plugin/plugin.json");
const mcp = await readJson("codex/.mcp.json");
const hostedUrl = "https://api.chatcut.io/api/external-mcp/mcp";

test("the staged directory package passes every submission check", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "chatcut-codex-store-"));
  try {
    const staged = await stageStorePackage({ outDir });
    assert.deepEqual(staged.problems, []);
    const skill = await readFile(join(staged.stageDir, "skills/chatcut-plugin-basics/SKILL.md"), "utf8");
    assert.ok(skill.includes(`--url '${staged.mcp.mcpServers.chatcut.url}' --oauth-resource`));
    const shipped = JSON.parse(await readFile(join(staged.stageDir, ".codex-plugin/plugin.json"), "utf8"));
    assert.equal(shipped.name, "chatcut-desktop");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("the skills-only fallback drops the MCP server but keeps the marked registration", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "chatcut-codex-store-repo-"));
  const outDir = join(repoRoot, "dist");
  try {
    await cp(new URL("../codex/", import.meta.url), join(repoRoot, "codex"), { recursive: true });
    await mkdir(join(repoRoot, "codex-store"));
    await writeFile(
      join(repoRoot, "codex-store/listing.json"),
      JSON.stringify({ ...listing, includeMcpServer: false }),
    );
    const staged = await stageStorePackage({ repoRoot, outDir });
    assert.deepEqual(staged.problems, []);
    assert.equal(staged.manifest.mcpServers, undefined);
    assert.ok(!staged.entries.includes(".mcp.json"));
    await assert.rejects(stat(join(staged.stageDir, ".mcp.json")));
    const skill = await readFile(join(staged.stageDir, "skills/chatcut-plugin-basics/SKILL.md"), "utf8");
    assert.ok(skill.includes(`--url '${staged.serverUrl}' --oauth-resource`));
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("the store build keeps the dashboard identity and the shared listing", () => {
  const store = buildStoreManifest(manifest, listing);
  assert.equal(store.name, listing.pluginName);
  assert.ok(!store.name.startsWith("chatcut@") && store.name !== "chatcut");
  assert.equal(store.version, manifest.version);
  assert.equal(store.skills, manifest.skills);
  assert.equal(store.interface.defaultPrompt, manifest.interface.defaultPrompt);
  assert.equal(manifest.name, "chatcut", "git installs keep their plugin id");
});

test("directory installs send no headers and carry a stable channel in the URL", () => {
  const server = buildStoreMcpConfig(mcp, listing).mcpServers.chatcut;
  assert.equal(server.http_headers, undefined);
  assert.equal(server.oauth_resource, hostedUrl);
  const url = new URL(server.url);
  assert.equal(url.origin + url.pathname, hostedUrl);
  assert.equal(url.searchParams.get("chatcutInstallSource"), listing.installSource);
  assert.equal(url.searchParams.get("chatcutMcpSurface"), "codex");
  // Codex keys sign-ins by URL, so a per-release value would log users out.
  assert.equal(url.searchParams.get("chatcutPluginVersion"), null);
  assert.match(listing.installSource, /^[a-z][a-z0-9_]{1,47}$/);

  const unmarked = buildStoreMcpConfig(mcp, { ...listing, markChannelInMcpUrl: false });
  assert.equal(unmarked.mcpServers.chatcut.url, hostedUrl);
});

test("the callback id matches the one production Codex installs register", () => {
  assert.equal(codexOAuthCallbackId(hostedUrl), "ZQAWwulZeXV1");
});

test("the registration command is rewritten exactly once", () => {
  const command = `codex mcp add chatcut --url ${hostedUrl} --oauth-resource ${hostedUrl}`;
  const url = `${hostedUrl}?chatcutInstallSource=x&chatcutMcpSurface=codex`;
  assert.equal(markSkillRegistration(command, url), `codex mcp add chatcut --url '${url}' --oauth-resource ${hostedUrl}`);
  assert.equal(markSkillRegistration(command, hostedUrl), command);
  assert.throws(() => markSkillRegistration("no command here", url), /expected one/);
  assert.throws(() => markSkillRegistration(`${command}\n${command}`, url), /found 2/);
});

test("the validator rejects listings the directory would refuse", async () => {
  const root = new URL("../codex/", import.meta.url).pathname;
  const bad = {
    ...manifest,
    apps: "./.app.json",
    interface: {
      ...manifest.interface,
      shortDescription: "Install and connect ChatCut Desktop",
      privacyPolicyURL: "http://chatcut.io/privacy",
      defaultPrompt: ["Help me connect to ChatCut Web"],
    },
  };
  const problems = await validateStorePackage({ manifest: bad, mcp, root });
  const expected = [
    /apps/,
    /shortDescription exceeds 30/,
    /shortDescription should describe value/,
    /privacyPolicyURL must be HTTPS/,
    /must list 3 starter prompts/,
    /http_headers must be empty/,
  ];
  for (const pattern of expected) {
    assert.ok(problems.some((problem) => pattern.test(problem)), `missing ${pattern}: ${problems.join("; ")}`);
  }
});

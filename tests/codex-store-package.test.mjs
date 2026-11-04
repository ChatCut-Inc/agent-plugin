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
  storeRegistrationUrl,
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
    assert.equal(staged.mcp.mcpServers.chatcut.url, hostedUrl, "existing sign-ins stay valid");
    assert.notEqual(staged.registrationUrl, hostedUrl);
    const skill = await readFile(join(staged.stageDir, "skills/chatcut-plugin-basics/SKILL.md"), "utf8");
    assert.ok(skill.includes(`--url '${staged.registrationUrl}' --oauth-resource`));
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
    assert.ok(skill.includes(`--url '${staged.registrationUrl}' --oauth-resource`));
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("setup runs a packaged onboarding skill that offers the listing's starter prompts", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "chatcut-codex-store-"));
  try {
    const staged = await stageStorePackage({ outDir });
    const path = staged.manifest.extensions["com.openai"].onboardingSkill;
    assert.equal(path, "./skills/get-started/SKILL.md");
    assert.equal(staged.manifest.interface.onboardingSkill, undefined, "the field sits outside interface");
    const skill = await readFile(join(staged.stageDir, path), "utf8");
    assert.match(skill, /^---\nname: get-started\n/);
    for (const prompt of manifest.interface.defaultPrompt) {
      assert.ok(skill.includes(prompt), `onboarding skill should offer: ${prompt}`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
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

test("directory installs send no headers and keep the signed-in MCP URL", () => {
  const server = buildStoreMcpConfig(mcp, listing).mcpServers.chatcut;
  assert.equal(server.http_headers, undefined);
  assert.equal(server.oauth_resource, hostedUrl);
  // Codex keys sign-ins by exact URL and signs plugin servers in only on a
  // fresh install, so a changed URL would strand users after the update.
  assert.equal(server.url, hostedUrl);
  assert.equal(listing.markChannelInMcpUrl, false);
});

test("manual registrations carry a stable channel in the URL", () => {
  assert.equal(listing.markChannelInRegistration, true);
  const url = new URL(storeRegistrationUrl(hostedUrl, listing));
  assert.equal(url.origin + url.pathname, hostedUrl);
  assert.equal(url.searchParams.get("chatcutInstallSource"), listing.installSource);
  assert.equal(url.searchParams.get("chatcutMcpSurface"), "codex");
  // A per-release value would force a new sign-in on every version.
  assert.equal(url.searchParams.get("chatcutPluginVersion"), null);
  assert.match(listing.installSource, /^[a-z][a-z0-9_]{1,47}$/);

  assert.equal(storeRegistrationUrl(hostedUrl, { ...listing, markChannelInRegistration: false }), hostedUrl);
  const marked = buildStoreMcpConfig(mcp, { ...listing, markChannelInMcpUrl: true }).mcpServers.chatcut;
  assert.equal(marked.url, storeRegistrationUrl(hostedUrl, listing));
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

  const onboarding = (onboardingSkill) => ({ ...manifest, extensions: { "com.openai": { onboardingSkill } } });
  const missing = await validateStorePackage({ manifest: onboarding("./skills/missing/SKILL.md"), mcp, root });
  assert.ok(missing.some((problem) => /onboardingSkill .* missing/.test(problem)), missing.join("; "));
  const outside = await validateStorePackage({ manifest: onboarding("./README.md"), mcp, root });
  assert.ok(outside.some((problem) => /onboardingSkill must point to a SKILL\.md/.test(problem)), outside.join("; "));
  const bare = await validateStorePackage({ manifest: onboarding("skills/get-started/SKILL.md"), mcp, root });
  assert.ok(!bare.some((problem) => /onboardingSkill/.test(problem)), "Codex accepts the path without ./");
});

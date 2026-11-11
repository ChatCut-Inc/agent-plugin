import assert from "node:assert/strict";
import { lstat, readdir, readFile, readlink, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));

// Grok Bot and Cursor load the same Cursor-format packages, and Grok Bot's
// remote MCP User-Agent matches the Cursor CLI. Each listing therefore declares
// its own host in a header and hides itself from the other host. Grok Bot 0.78
// parses only cursor/sand/sandMobile here; grokbot is the current schema name.
const listings = [
  { source: "grok", name: "chatcut", client: "grok", hiddenFrom: { cursor: "never" } },
  {
    source: "cursor",
    name: "chatcut-cursor",
    client: "cursor",
    hiddenFrom: { grokbot: "never", sand: "never", sandMobile: "never" },
  },
];

const marketplace = await readJson(".cursor-plugin/marketplace.json");

for (const { source, name, client, hiddenFrom } of listings) {
  test(`${source} listing declares ${client} and is hidden from the other host`, async () => {
    const entry = marketplace.plugins.find((plugin) => plugin.source === source);
    assert.ok(entry, `marketplace lists ${source}`);
    assert.equal(entry.name, name);
    assert.deepEqual(entry.minClientVersions, hiddenFrom);

    const manifest = await readJson(`${source}/.cursor-plugin/plugin.json`);
    assert.equal(manifest.name, name);
    assert.deepEqual(manifest.minClientVersions, hiddenFrom);

    const headers = (await readJson(`${source}/mcp.json`)).mcpServers.chatcut.headers;
    assert.equal(headers["x-chatcut-mcp-client"], client);
  });
}

test("marketplace lists exactly the Grok Bot and Cursor packages", () => {
  assert.deepEqual(
    marketplace.plugins.map((plugin) => plugin.source).sort(),
    listings.map((listing) => listing.source).sort(),
  );
});

const listFiles = async (dir) => {
  const files = [];
  const walk = async (relative) => {
    for (const name of await readdir(new URL(`${dir}${relative}`, root))) {
      const path = `${relative}${name}`;
      if ((await stat(new URL(`${dir}${path}`, root))).isDirectory()) await walk(`${path}/`);
      else files.push(path);
    }
  };
  await walk("");
  return files.sort();
};

const sameFiles = async (a, b) => {
  const files = await listFiles(a);
  assert.deepEqual(await listFiles(b), files);
  for (const file of files) {
    assert.ok(
      (await readFile(new URL(`${a}${file}`, root))).equals(await readFile(new URL(`${b}${file}`, root))),
      `${b}${file} differs from ${a}${file}`,
    );
  }
};

// Until Cursor gets its own host adapters, share the directories directly so
// the two listings cannot drift apart.
test("cursor/assets/ mirrors grok/assets/", async () => {
  assert.equal(await readlink(new URL("cursor/assets", root)), "../grok/assets");
  await sameFiles("grok/assets/", "cursor/assets/");
});

// Grok Bot's cloud-computer browser drops too often for local renders, so only
// Grok's export guidance is cloud-first; Cursor keeps its own browser-first copy.
const grokOnlySkills = ["chatcut-plugin-basics", "export"];

test("cursor/skills/ shares every Grok skill except the Grok-only export guidance", async () => {
  const grokSkills = (await readdir(new URL("grok/skills/", root))).sort();
  assert.deepEqual((await readdir(new URL("cursor/skills/", root))).sort(), grokSkills);
  for (const skill of grokSkills) {
    const cursorSkill = new URL(`cursor/skills/${skill}`, root);
    if (grokOnlySkills.includes(skill)) {
      assert.ok((await lstat(cursorSkill)).isDirectory(), `cursor/skills/${skill} is Cursor's own copy`);
    } else {
      assert.equal(await readlink(cursorSkill), `../../grok/skills/${skill}`);
      await sameFiles(`grok/skills/${skill}/`, `cursor/skills/${skill}/`);
    }
  }
  const cursorExport = await readFile(new URL("cursor/skills/export/SKILL.md", root), "utf8");
  const grokExport = await readFile(new URL("grok/skills/export/SKILL.md", root), "utf8");
  assert.match(cursorExport, /Video and audio default to `renderMode:"local"`/);
  assert.match(grokExport, /Video and audio can render in the cloud or locally/);
});

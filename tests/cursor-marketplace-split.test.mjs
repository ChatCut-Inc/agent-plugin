import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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
  const entries = await readdir(new URL(dir, root), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath ?? entry.path}/${entry.name}`.slice(new URL(dir, root).pathname.length))
    .sort();
};

// Until Cursor gets its own host adapters, its skills are a verbatim copy so
// the two listings cannot drift apart.
for (const dir of ["skills/", "assets/"]) {
  test(`cursor/${dir} mirrors grok/${dir}`, async () => {
    const grokFiles = await listFiles(`grok/${dir}`);
    assert.deepEqual(await listFiles(`cursor/${dir}`), grokFiles);
    for (const file of grokFiles) {
      assert.ok(
        (await readFile(new URL(`grok/${dir}${file}`, root))).equals(
          await readFile(new URL(`cursor/${dir}${file}`, root)),
        ),
        `cursor/${dir}${file} differs from grok/${dir}${file}`,
      );
    }
  });
}

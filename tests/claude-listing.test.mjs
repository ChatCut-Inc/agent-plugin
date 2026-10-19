import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";

const pluginRoot = new URL("../claude/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL(".claude-plugin/plugin.json", pluginRoot), "utf8"));

test("Claude listing has the correct brand and public links", () => {
  assert.equal(manifest.displayName, "ChatCut");
  assert.equal(manifest.documentationUrl, "https://chatcut.io/claude");
  assert.equal(manifest.supportUrl, "https://chatcut.io/contact");
  assert.equal(manifest.privacyPolicyUrl, "https://chatcut.io/privacy");
  assert.equal(manifest.termsOfServiceUrl, "https://chatcut.io/terms");
});

test("listing icon is a bundled square PNG within the directory limits", async () => {
  const icon = new URL(manifest.icon, pluginRoot);
  assert.ok(icon.href.startsWith(pluginRoot.href));
  assert.equal((await lstat(icon)).isSymbolicLink(), false);
  const png = await readFile(icon);
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = png.readUInt32BE(16);
  assert.equal(width, png.readUInt32BE(20));
  assert.ok(width >= 512 && width <= 2048);
  assert.ok(png.length < 2 * 1024 * 1024);
});

test("plugin README discloses the helpers and links to the privacy policy", async () => {
  const readme = await readFile(new URL("README.md", pluginRoot), "utf8");
  assert.ok(readme.split(/\s+/).length >= 40);
  assert.match(readme, /https:\/\/chatcut\.io\/privacy/);
  assert.match(readme, /Same-machine editor import/);
  assert.match(readme, /Upload-helper fallback/);
  assert.match(readme, /not credentials/);
});

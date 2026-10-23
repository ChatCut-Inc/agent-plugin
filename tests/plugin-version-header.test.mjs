import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) =>
  JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));

// The backend records this header to compare export behavior across plugin
// releases, so a version bump that misses it would mislabel every request.
const hosts = [
  ["codex", "codex/.codex-plugin/plugin.json", "codex/.mcp.json", "http_headers"],
  ["claude", "claude/.claude-plugin/plugin.json", "claude/.claude-plugin/plugin.json", "headers"],
  ["grok", "grok/.cursor-plugin/plugin.json", "grok/mcp.json", "headers"],
  ["kimi", "kimi/kimi.plugin.json", "kimi/.mcp.json", "http_headers"],
  ["kimi manifest", "kimi/kimi.plugin.json", "kimi/kimi.plugin.json", "headers"],
];

for (const [host, manifestPath, mcpPath, headersKey] of hosts) {
  test(`${host} sends its plugin version with the existing ChatCut headers`, async () => {
    const { version } = await readJson(manifestPath);
    const headers = (await readJson(mcpPath)).mcpServers.chatcut[headersKey];
    assert.equal(headers["x-chatcut-plugin-version"], version);
    assert.ok(headers["x-chatcut-mcp-surface"]);
  });
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const codexExport = await read("codex/skills/export/SKILL.md");
const claudeExport = await read("claude/skills/export/SKILL.md");
const grokExport = await read("grok/skills/export/SKILL.md");
const kimiExport = await read("kimi/skills/chatcut-export-guide/SKILL.md");

// An earlier local-delivery rewrite never reached the published plugin, and the
// cloud-link wording kept sending agents to cloud rendering.
test("host packages ship consistent export recovery", () => {
  assert.equal(claudeExport, codexExport);
  const recovery = (skill) =>
    skill.split("## Local Export Recovery")[1]?.split(/^## /m)[0].trim();
  assert.ok(recovery(codexExport));
  assert.equal(recovery(kimiExport), recovery(codexExport));
});

test("export delivers the downloaded file and keeps cloud fallback scoped", () => {
  assert.match(codexExport, /omit `renderMode`/);
  assert.match(codexExport, /`expectedFilename`, allowing a browser suffix/);
  assert.match(codexExport, /entry.s `name` \(the submitted name plus/);
  assert.match(codexExport, /\*\*Download again\*\*/);
  assert.match(codexExport, /click \*\*Save\*\* in the save dialog/);
  assert.match(codexExport, /Do not skip these steps to switch to cloud/);
  assert.match(codexExport, /a free cloud quote needs no extra confirmation and a nonzero charge needs one explicit confirmation/);
  assert.match(codexExport, /Honor explicit local-only, no-upload/);
  assert.match(codexExport, /no usable local path exists or the user chooses it/);
  assert.match(codexExport, /`videoBitrateMode:"recommended"`/);
  assert.doesNotMatch(codexExport, /Only when cloud cannot do it either/);
  assert.match(codexExport, /`renderMode:"cloud"` when the user asks for it/);
  assert.doesNotMatch(codexExport, /return its `downloadUrl`/);
});

// Grok's default render path is set by the hosted connector (cloud while Grok
// Bot's cloud-computer browser is unreliable). The skill explains both paths and
// their delivery but never states the default, so switching needs no release.
test("Grok export skill covers both paths without stating the default", async () => {
  assert.match(grokExport, /^description: Use when a Grok Bot user wants a finished file/m);
  assert.match(grokExport, /Video and audio can render in the cloud or locally/);
  assert.match(grokExport, /4K needs a local export/);
  assert.match(grokExport, /`requiresConfirmation:false`/);
  assert.match(grokExport, /`curl -fL -o "<file name>" "<downloadUrl>"`/);
  assert.match(grokExport, /open the project's `browserHandoff.url` once/);
  assert.match(grokExport, /fetch `delivery.downloadUrl` the same way/);
  assert.match(grokExport, /`target:"upload"` reports them uploaded/);
  assert.match(grokExport, /reads captions from the agent's active timeline/);
  assert.doesNotMatch(grokExport, /cloud by default|Cloud is Grok's default|default to `renderMode:"local"`/);
  assert.doesNotMatch(grokExport, /## Local Export Recovery|desktopExportSettings/);
  const grokBasics = await read("grok/skills/chatcut-plugin-basics/SKILL.md");
  assert.match(grokBasics, /Both cloud and browser-local export are supported/);
  assert.doesNotMatch(grokBasics, /cloud by default/);
  assert.doesNotMatch(grokBasics, /The default browser export downloads on/);
});

test("basics no longer say export needs a download URL or is unavailable", async () => {
  for (const path of [
    "codex/skills/chatcut-plugin-basics/SKILL.md",
    "claude/skills/chatcut-plugin-basics-claude/SKILL.md",
  ]) {
    const basics = await read(path);
    assert.doesNotMatch(basics, /upload, export, or capture/, path);
    assert.doesNotMatch(basics, /returns the finished render `downloadUrl`/, path);
    assert.doesNotMatch(basics, /Download the finished render locally/, path);
    assert.match(basics, /do not switch to cloud rendering just to get a download URL/, path);
  }
});

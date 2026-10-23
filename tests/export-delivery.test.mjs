import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const codexExport = await read("codex/skills/export/SKILL.md");
const claudeExport = await read("claude/skills/export/SKILL.md");

// An earlier local-delivery rewrite never reached the published plugin, and the
// cloud-link wording kept sending agents to cloud rendering.
test("Codex and Claude ship the same export skill", () => {
  assert.equal(claudeExport, codexExport);
});

test("export delivers the downloaded file and keeps cloud opt-in", () => {
  assert.match(codexExport, /omit `renderMode`/);
  assert.match(codexExport, /`expectedFilename`, allowing a browser suffix/);
  assert.match(codexExport, /entry.s `name` \(the submitted name plus/);
  assert.match(codexExport, /\*\*Download again\*\*/);
  assert.match(codexExport, /click \*\*Save\*\* in the save dialog/);
  assert.match(codexExport, /Do not skip these steps to switch to cloud/);
  assert.match(codexExport, /explain the local blocker in one sentence and ask whether to export in the cloud/);
  assert.match(codexExport, /Do not offer cloud before the user has had that chance/);
  assert.match(codexExport, /Only when cloud cannot do it either/);
  assert.match(codexExport, /`renderMode:"cloud"` only when the user asks for it/);
  assert.doesNotMatch(codexExport, /return its `downloadUrl`/);
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

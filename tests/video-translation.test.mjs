import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skill = await readFile(new URL("../claude/skills/video-translation/SKILL.md", import.meta.url), "utf8");

test("translation delegates authentication to the host without reading local credentials", () => {
  assert.match(skill, /host manages\s+authentication/);
  assert.match(skill, /Do not read passwords, API keys, or OAuth credentials/);
  assert.match(skill, /not authentication values/);
});

test("translation retains transcript approval and the audio-only exception", () => {
  assert.match(skill, /user has edited or approved that form and submitted it/);
  assert.match(skill, /Stop here and wait/);
  assert.match(skill, /Never\s+submit a translation in the same turn/);
  assert.match(skill, /audioOnly: true/);
  assert.match(skill, /For `audioOnly: true`, omit\s+`reviewedSourceTranscript`/);
  assert.match(skill, /reviewedSourceTranscript` as the exact complete textarea value/);
});

test("translation retains the live catalog, paid confirmation, and job tracking", () => {
  assert.match(skill, /action: "list_languages"/);
  assert.match(skill, /action: "submit"/);
  assert.match(skill, /Do not submit a paid video-translation job until/);
  assert.match(skill, /do not\s+resubmit after a denial/);
  assert.match(skill, /track_progress\(action="wait"\)/);
});

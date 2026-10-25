import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const hosts = ["codex", "claude", "grok", "kimi"];
const reference = "references/scene-breakdown.md";
const read = (host, file) =>
  readFile(
    new URL(`../${host}/skills/visual-analysis/${file}`, import.meta.url),
    "utf8",
  );

test("all plugin hosts ship one visual-analysis entrypoint and the same portable scene reference", async () => {
  const expected = await read("codex", reference);
  for (const host of hosts) {
    const skill = await read(host, "SKILL.md");
    assert.match(skill, /^name: visual-analysis$/m);
    assert.ok(skill.includes(`](${reference})`));
    assert.equal(await read(host, reference), expected);
    await read(host, "scripts/concat-images.mjs");
  }
});

test("the portable JSON example preserves source coordinates and the seven scene fields", async () => {
  const text = await read("codex", reference);
  const examples = [...text.matchAll(/```json\s*([\s\S]*?)```/g)].map((m) =>
    JSON.parse(m[1]),
  );
  assert.ok(examples.length);
  for (const example of examples) {
    assert.equal(example.time_domain, "source");
    for (const scene of example.scenes) {
      assert.deepEqual(Object.keys(scene).sort(), [
        "audio",
        "label",
        "scene_number",
        "shot_type",
        "timestamp_end",
        "timestamp_start",
        "visual",
      ]);
    }
    assert.equal(example.evidence.audio_basis, "chatcut_transcript");
  }
});

test("Grok and Kimi verification retain a working route to the shipped analysis skill", async () => {
  for (const [host, entry] of [
    ["grok", "verification"],
    ["kimi", "chatcut-verification-guide"],
  ]) {
    const text = await readFile(
      new URL(`../${host}/skills/${entry}/SKILL.md`, import.meta.url),
      "utf8",
    );
    assert.ok(text.includes("](../visual-analysis/SKILL.md)"));
    await read(host, "SKILL.md");
  }
});

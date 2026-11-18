import assert from "node:assert/strict";
import { readFile, readlink } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

for (const host of ["codex", "claude", "antigravity", "grok", "kimi", "qwen"]) {
  test(`${host} digital-human uses characters without retired avatar actions`, async () => {
    const skill = await read(`${host}/skills/digital-human/SKILL.md`);
    assert.match(skill, /manage_character/);
    assert.match(skill, /characterId/);
    assert.match(skill, /confirmedConsent/);
    assert.doesNotMatch(skill, /manage_avatar|identityId|create_avatar|avatar_choice/);
  });
}

test("Claude and Antigravity share the character skill through repository-relative links", async () => {
  for (const host of ["claude", "antigravity"]) {
    assert.equal(
      await readlink(new URL(`${host}/skills/digital-human/SKILL.md`, root)),
      "../../../codex/skills/digital-human/SKILL.md",
    );
  }
});

test("character forms preserve portrait layout, creation and Other without legacy identities", async () => {
  const forms = await read("codex/skills/widget-forms/SKILL.md");
  const codex = forms.split("## Codex\n")[1].split("## Claude Code\n")[0];
  const characters = codex.split("Map a character choice")[1].split("Map a caption style choice")[0];
  assert.match(characters, /variant:"visual"/);
  assert.match(characters, /id:"avatar"/);
  assert.match(characters, /characterId/);
  assert.match(characters, /manage_character get/);
  assert.match(characters, /create_character/);
  assert.match(characters, /__other__/);
  assert.match(characters, /otherPlaceholder/);
  assert.match(characters, /asset-import/);
  assert.doesNotMatch(forms, /identityId|create_avatar|Digital Humans|AI Avatars/);
});

test("Claude retains private-media fallbacks and voice Other alongside character choices", async () => {
  const forms = (await read("codex/skills/widget-forms/SKILL.md")).split("## Claude Code\n")[1];
  assert.match(forms, /sampleMediaKey/);
  assert.match(forms, /Ready custom voices[\s\S]*label-only/);
  assert.match(forms, /data-other/);
  assert.match(forms, /elicit-other/);
  assert.match(forms, /characterId/);
  assert.match(forms, /label-only selectable cards/);
  assert.match(forms, /My Assets/);
  assert.match(forms, /Never embed or print image or\s+private preview URLs/);
  const skill = await read("codex/skills/digital-human/SKILL.md");
  assert.match(skill, /Other returns to discovery/);
  assert.match(skill, /do not discard a ready custom voice/);
});

test("caption preview and custom-style application guidance survives character migration", async () => {
  const forms = await read("codex/skills/widget-forms/SKILL.md");
  assert.match(forms, /publishedTemplates/);
  assert.match(forms, /captionTarget/);
  assert.match(forms, /catalogTemplateId/);
  assert.match(forms, /project-bound custom styles/);
  assert.match(forms, /edit_captions action:"style"/);
  assert.match(forms, /Claude Code does not render `captionPreview`/);
});

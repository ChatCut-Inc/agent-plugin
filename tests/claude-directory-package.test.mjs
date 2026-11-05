import assert from "node:assert/strict";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// The Claude directory scans only the plugin folder and refuses symbolic
// links, so this package carries regular copies of the shared skills. It pairs
// with the edit-only connector at /api/external-mcp/claude and must not ship
// generation workflows.
const root = fileURLToPath(new URL("../", import.meta.url));
const folder = join(root, "claude-directory");
const manifest = JSON.parse(await readFile(join(folder, ".claude-plugin/plugin.json"), "utf8"));
const directoryUrl = "https://api.chatcut.io/api/external-mcp/claude";

// Directory files copied byte for byte from the shared Claude package. A change
// to the shared file must be copied here (or moved to EDITED_COPIES) on purpose.
const VERBATIM_COPIES = [
  "assets/logo-light.png",
  "skills/multicam-sync/SKILL.md",
  "skills/multicam-sync/scripts/transcript-offset.mjs",
  "skills/talking-head-guide/references/captions.md",
  "skills/talking-head-guide/references/multicam.md",
  "skills/visual-analysis/scripts/concat-images.mjs",
];
// Copies trimmed of generation, upload-helper and other-host guidance.
const EDITED_COPIES = [
  "skills/create-motion-graphics/SKILL.md",
  "skills/create-motion-graphics/references/font-matching.md",
  "skills/create-motion-graphics/references/overlay-composition.md",
  "skills/talking-head-guide/SKILL.md",
  "skills/talking-head-guide/references/audio-and-music.md",
  "skills/talking-head-guide/references/b-roll.md",
  "skills/talking-head-guide/references/motion-graphics.md",
  "skills/talking-head-guide/references/other-a-roll-editing-scenarios.md",
  "skills/transcription/SKILL.md",
  "skills/verification/SKILL.md",
  "skills/visual-analysis/SKILL.md",
];
const DIRECTORY_ONLY = [".claude-plugin/plugin.json", "README.md", "skills/chatcut-editing-basics/SKILL.md"];

// Tools, skills and flows the edit-only listing does not carry.
const FORBIDDEN =
  /submit_(?!export\b)\w+|video_translation|manage_(?:voice|custom_voice|avatar|memory|skill|user_files)\b|report_user_friction|web_browser|isolate_voice|estimate_generation|read_billing|ask_followup_questions|\b(?:image-gen|video-gen|music|voice|shader-gen|digital-human|video-translation|motion-graphic-gen|voice-isolation|asset-import|widget-forms)\b(?= skill|`)|`(?:image-gen|video-gen|music|voice|shader-gen|digital-human|video-translation|motion-graphic-gen|voice-isolation|asset-import|widget-forms)`|upload-media|serve-local-media|external-mcp\/mcp\b|openPricing|Gemini|Seedance/u;

async function files(directory) {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) entries.push(...(await files(path)));
    else entries.push(path);
  }
  return entries;
}

const packaged = (await files(folder)).map((path) => relative(folder, path)).sort();

test("the directory package holds only regular files the plugin loads", async () => {
  for (const path of packaged) {
    const info = await lstat(join(folder, path));
    assert.equal(info.isSymbolicLink(), false, `${path} must be a regular file`);
    assert.ok(info.size < 256 * 1024 || path.endsWith(".png"), `${path} exceeds 256 KiB`);
    assert.doesNotMatch(path, /\.DS_Store|Thumbs\.db|__MACOSX/);
  }
  assert.deepEqual(packaged, [...VERBATIM_COPIES, ...EDITED_COPIES, ...DIRECTORY_ONLY].sort());
});

test("verbatim copies match the shared Claude package", async () => {
  for (const path of VERBATIM_COPIES) {
    const shared = await readFile(join(root, "claude", path));
    const copy = await readFile(join(folder, path));
    assert.ok(shared.equals(copy), `${path} drifted from claude/${path}`);
  }
});

test("the manifest pairs with the edit-only connector", () => {
  assert.equal(manifest.name, "chatcut-editor");
  assert.match(manifest.name, /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/);
  assert.notEqual(manifest.name, "chatcut", "the existing Claude plugin keeps its id");
  assert.equal(manifest.license, "Apache-2.0");
  assert.equal(manifest.privacyPolicyUrl, "https://chatcut.io/privacy");
  assert.equal(manifest.skills, "./skills/");
  const servers = Object.keys(manifest.mcpServers);
  assert.deepEqual(servers, ["chatcut"]);
  const server = manifest.mcpServers.chatcut;
  assert.equal(server.type, "http");
  assert.equal(server.url, directoryUrl);
  assert.equal(server.oauth_resource, directoryUrl);
  // A client or surface header would override how the backend recognizes
  // claude.ai, Cowork and Claude Code, so only attribution headers are sent.
  assert.deepEqual(server.headers, {
    "x-chatcut-install-source": "claude_directory_plugin",
    "x-chatcut-plugin-version": manifest.version,
  });
});

test("the package ships no generation skills or generation guidance", async () => {
  const skills = (await readdir(join(folder, "skills"))).sort();
  assert.deepEqual(skills, [
    "chatcut-editing-basics",
    "create-motion-graphics",
    "multicam-sync",
    "talking-head-guide",
    "transcription",
    "verification",
    "visual-analysis",
  ]);
  for (const path of packaged.filter((entry) => !entry.endsWith(".png"))) {
    const text = await readFile(join(folder, path), "utf8");
    assert.doesNotMatch(text, FORBIDDEN, path);
  }
  for (const skill of skills) {
    const text = await readFile(join(folder, "skills", skill, "SKILL.md"), "utf8");
    assert.match(text, new RegExp(`^---\\nname: ${skill}\\ndescription: `), skill);
  }
});

test("the README describes only editing and links the privacy policy", async () => {
  const readme = await readFile(join(folder, "README.md"), "utf8");
  const words = readme.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean);
  assert.ok(words.length >= 40);
  assert.match(readme, /https:\/\/chatcut\.io\/privacy/);
  const urls = new Set(readme.match(/https:\/\/[^\s`)]+/g));
  assert.ok(urls.has(directoryUrl), "README names the MCP server URL");
  assert.match(readme, /does not generate/);
  assert.doesNotMatch(readme, /translate this video|generate video|voiceover|music generation/i);
});

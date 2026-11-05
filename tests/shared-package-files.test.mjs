import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readdir, readFile, readlink, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const packages = ["codex", "claude", "grok", "cursor", "kimi", "antigravity", "antigravity-desktop", "qwen", "workbuddy", "doubao", "chatcut-desktop-codex-plugin"];

async function physicalFiles(directory) {
  const files = [];
  for (const name of await readdir(join(root, directory))) {
    const path = join(directory, name);
    const info = await lstat(join(root, path));
    if (info.isDirectory()) files.push(...await physicalFiles(path));
    else files.push(path);
  }
  return files;
}

test("shared package symlinks are relative, unbroken, and stay in the repository", async () => {
  let links = 0;
  for (const folder of packages) {
    for (const path of await physicalFiles(folder)) {
      const absolute = join(root, path);
      if (!(await lstat(absolute)).isSymbolicLink()) continue;
      links++;
      assert.equal(isAbsolute(await readlink(absolute)), false, path);
      const target = relative(root, await realpath(absolute));
      assert.notEqual(target.split(sep)[0], "..", path);
      assert.equal(isAbsolute(target), false, path);
      await stat(absolute);
    }
  }
  assert.ok(links > 0);
});

test("identical package files share a canonical file instead of regular copies", async () => {
  const hashes = new Map();
  for (const path of ["LICENSE", ...(await Promise.all(packages.map(physicalFiles))).flat()]) {
    const absolute = join(root, path);
    if (!(await lstat(absolute)).isFile()) continue;
    const hash = createHash("sha256").update(await readFile(absolute)).digest("hex");
    assert.equal(hashes.has(hash), false, `${path} duplicates ${hashes.get(hash)}; use a relative symlink`);
    hashes.set(hash, path);
  }
});

test("Antigravity entry skills fit the host's 24,000-byte limit", async () => {
  for (const folder of ["antigravity", "antigravity-desktop"]) {
    for (const name of await readdir(join(root, folder, "skills"))) {
      const path = join(root, folder, "skills", name, "SKILL.md");
      const text = await readFile(path);
      assert.ok(text.length <= 24_000, `${folder}/${name}: ${text.length} bytes`);
      assert.match(text.toString(), /^---\r?\nname: .+\r?\ndescription: /);
    }
  }
});

for (const [folder, manifestPath] of [
  ["qwen", ".qoder-plugin/plugin.json"],
  ["workbuddy", ".codebuddy-plugin/plugin.json"],
]) {
  test(`${folder} manifest skills and agent entry points are packaged`, async () => {
    const manifest = JSON.parse(await readFile(join(root, folder, manifestPath), "utf8"));
    for (const skill of manifest.skills) {
      const text = await readFile(join(root, folder, skill, "SKILL.md"), "utf8");
      assert.match(text, /^---\r?\n/);
    }
    for (const agent of manifest.agents ?? []) await stat(join(root, folder, agent));
  });
}

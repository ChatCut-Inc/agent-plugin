import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { materializeMediaTool } from "../codex/skills/asset-import/scripts/media-tools.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fixture(version = "test-v1") {
  const extracted = Buffer.from("fake deterministic ffmpeg executable\n");
  const archive = gzipSync(extracted, { mtime: 0 });
  const asset = {
    filename: "ffmpeg-test",
    url: "https://downloads.example.invalid/ffmpeg-test.gz",
    archiveBytes: archive.length,
    archiveSha256: sha256(archive),
    extractedBytes: extracted.length,
    extractedSha256: sha256(extracted),
  };
  return {
    archive,
    asset,
    extracted,
    manifest: {
      version,
      platforms: {
        "test-current": { ffmpeg: asset },
        "test-other": {
          ffmpeg: {
            ...asset,
            url: "https://downloads.example.invalid/wrong-platform.gz",
          },
        },
      },
    },
  };
}

function responseFor(bytes) {
  return new Response(bytes, {
    status: 200,
    headers: { "content-length": String(bytes.length) },
  });
}

async function withCache(run) {
  const cacheRoot = await mkdtemp(join(tmpdir(), "chatcut-media-tools-test-"));
  try {
    await run(cacheRoot);
  } finally {
    await rm(cacheRoot, { recursive: true, force: true });
  }
}

test("twenty concurrent first uses perform one platform-specific download", async () => {
  await withCache(async (cacheRoot) => {
    const { archive, extracted, manifest } = fixture();
    const requested = [];
    const fetchImpl = async (url) => {
      requested.push(url);
      return responseFor(archive);
    };

    const paths = await Promise.all(
      Array.from({ length: 20 }, () =>
        materializeMediaTool("ffmpeg", {
          cacheRoot,
          fetchImpl,
          manifest,
          platform: "test-current",
        }),
      ),
    );

    assert.equal(new Set(paths).size, 1);
    assert.equal(requested.length, 1);
    assert.equal(requested[0], manifest.platforms["test-current"].ffmpeg.url);
    assert.deepEqual(await readFile(paths[0]), extracted);
  });
});

test("checksum failure leaves no executable or partial file", async () => {
  await withCache(async (cacheRoot) => {
    const { archive, manifest } = fixture();
    manifest.platforms["test-current"].ffmpeg.archiveSha256 = "0".repeat(64);

    await assert.rejects(
      materializeMediaTool("ffmpeg", {
        cacheRoot,
        fetchImpl: async () => responseFor(archive),
        manifest,
        platform: "test-current",
      }),
      /archive checksum mismatch/,
    );

    const cacheDir = join(cacheRoot, manifest.version, "test-current");
    const entries = await readdir(cacheDir);
    assert.equal(entries.some((name) => name === "ffmpeg-test"), false);
    assert.equal(
      entries.some((name) => name.endsWith(".partial") || name.endsWith(".tmp")),
      false,
    );
    assert.equal(existsSync(join(cacheRoot, manifest.version, ".install.lock")), false);
  });
});

test("managed cache retains at most two confirmed-unused versions", async () => {
  await withCache(async (cacheRoot) => {
    for (const version of ["old-a", "old-b", "old-c"]) {
      const versionDir = join(cacheRoot, version);
      await mkdir(versionDir, { recursive: true });
      await writeFile(
        join(versionDir, ".chatcut-managed.json"),
        JSON.stringify({ version }),
      );
      await writeFile(join(versionDir, "tool"), version);
    }
    const { archive, manifest } = fixture("current");

    await materializeMediaTool("ffmpeg", {
      cacheRoot,
      fetchImpl: async () => responseFor(archive),
      manifest,
      platform: "test-current",
    });

    const versions = (await readdir(cacheRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    assert.equal(versions.includes("current"), true);
    assert.equal(versions.length, 2);
  });
});

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

export const MEDIA_TOOLS_MANIFEST = JSON.parse(
  readFileSync(new URL("./media-tools-manifest.json", import.meta.url), "utf8"),
);
export const MEDIA_TOOLS_VERSION = MEDIA_TOOLS_MANIFEST.version;

const CACHE_MAX_BYTES = 500 * 1024 * 1024;
const CACHE_MAX_VERSIONS = 2;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const LOCK_TIMEOUT_MS = 125_000;
const STALE_LOCK_MS = 10 * 60_000;
const MIN_FFMPEG_MAJOR = 6;
const leases = new Set();
let exitHookRegistered = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256File(path) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest("hex") };
}

function assertTool(bin, label) {
  const result = spawnSync(bin, ["-version"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const major = Number.parseInt(
    output.match(/ff(?:mpeg|probe) version\s+(?:n)?(\d+)/i)?.[1] || "",
    10,
  );
  if (
    result.error ||
    result.status !== 0 ||
    !Number.isFinite(major) ||
    major < MIN_FFMPEG_MAJOR
  ) {
    throw new Error(
      `${label} ${MIN_FFMPEG_MAJOR}+ is required for ChatCut media import.`,
    );
  }
  if (label === "ffmpeg") {
    const encoders = spawnSync(bin, ["-hide_banner", "-encoders"], {
      encoding: "utf8",
      maxBuffer: 128 * 1024,
    });
    const available = `${encoders.stdout || ""}\n${encoders.stderr || ""}`;
    const missing = ["libx264", "aac", "libopus"].filter(
      (encoder) => !new RegExp(`\\b${encoder}\\b`).test(available),
    );
    if (encoders.error || encoders.status !== 0 || missing.length) {
      throw new Error(
        `ffmpeg is missing required encoders: ${missing.join(", ") || "unknown"}`,
      );
    }
  }
}

async function acquireInstallLock(lockPath) {
  const started = Date.now();
  for (;;) {
    try {
      await mkdir(lockPath);
      await writeFile(
        join(lockPath, "owner.json"),
        JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }),
      );
      return async () => rm(lockPath, { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > STALE_LOCK_MS) {
          await rm(lockPath, { recursive: true, force: true });
          continue;
        }
      } catch (statError) {
        if (statError?.code === "ENOENT") continue;
        throw statError;
      }
      if (Date.now() - started >= LOCK_TIMEOUT_MS) {
        throw new Error(`timed out waiting for media tool lock ${lockPath}`);
      }
      await sleep(75 + Math.floor(Math.random() * 75));
    }
  }
}

function checkedByteStream(expectedBytes, hash) {
  let bytes = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > expectedBytes) {
        callback(new Error(`download exceeded declared size ${expectedBytes}`));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
    flush(callback) {
      if (bytes !== expectedBytes) {
        callback(
          new Error(`download size mismatch: expected ${expectedBytes}, got ${bytes}`),
        );
        return;
      }
      callback();
    },
  });
}

async function downloadArchive(asset, destination, fetchImpl) {
  const url = new URL(asset.url);
  if (url.protocol !== "https:") {
    throw new Error(`refusing non-HTTPS media tool URL: ${asset.url}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetchImpl(asset.url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`media tool download failed with HTTP ${response.status}`);
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength !== asset.archiveBytes) {
      throw new Error(
        `media tool Content-Length mismatch: expected ${asset.archiveBytes}, got ${contentLength}`,
      );
    }
    const hash = createHash("sha256");
    await pipeline(
      Readable.fromWeb(response.body),
      checkedByteStream(asset.archiveBytes, hash),
      createWriteStream(destination, { flags: "wx" }),
    );
    const actual = hash.digest("hex");
    if (actual !== asset.archiveSha256) {
      throw new Error(
        `media tool archive checksum mismatch: expected ${asset.archiveSha256}, got ${actual}`,
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

async function extractArchive(asset, archive, destination) {
  const hash = createHash("sha256");
  await pipeline(
    createReadStream(archive),
    createGunzip(),
    checkedByteStream(asset.extractedBytes, hash),
    createWriteStream(destination, { flags: "wx", mode: 0o755 }),
  );
  const actual = hash.digest("hex");
  if (actual !== asset.extractedSha256) {
    throw new Error(
      `media tool checksum mismatch: expected ${asset.extractedSha256}, got ${actual}`,
    );
  }
  await chmod(destination, 0o755);
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function versionHasLiveLease(versionDir) {
  const entries = await readdir(versionDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.startsWith(".in-use-")) continue;
    const path = join(versionDir, entry.name);
    try {
      const lease = JSON.parse(await readFile(path, "utf8"));
      if (processIsAlive(lease.pid)) return true;
    } catch {}
    await rm(path, { force: true });
  }
  return false;
}

async function directorySize(root) {
  let total = 0;
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true }).catch(
      (error) => {
        if (error?.code === "ENOENT") return [];
        throw error;
      },
    );
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) total += (await stat(path)).size;
    }
  }
  return total;
}

async function pruneManagedCache(
  cacheRoot,
  currentVersion,
  log,
  requiredBytes = 0,
) {
  const entries = await readdir(cacheRoot, { withFileTypes: true }).catch(() => []);
  const versions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(cacheRoot, entry.name);
    if (!existsSync(join(path, ".chatcut-managed.json"))) continue;
    const info = await stat(path);
    versions.push({ name: entry.name, path, mtimeMs: info.mtimeMs });
  }
  versions.sort((a, b) => b.mtimeMs - a.mtimeMs);
  let total = await directorySize(cacheRoot);
  let count = versions.length;
  for (const version of [...versions].reverse()) {
    if (
      count <= CACHE_MAX_VERSIONS &&
      total + requiredBytes <= CACHE_MAX_BYTES
    )
      break;
    if (version.name === currentVersion) continue;
    if (existsSync(join(version.path, ".install.lock"))) continue;
    if (await versionHasLiveLease(version.path)) continue;
    const bytes = await directorySize(version.path);
    try {
      await rm(version.path, { recursive: true, force: true });
      count -= 1;
      total = Math.max(0, total - bytes);
      log?.(`removed unused media tool cache ${version.name}`);
    } catch (error) {
      log?.(`could not remove unused media tool cache ${version.name}: ${error.message}`);
    }
  }
  if (total + requiredBytes > CACHE_MAX_BYTES) {
    throw new Error(
      `ChatCut media tool cache cannot reserve ${requiredBytes} bytes within its ${CACHE_MAX_BYTES} byte limit because no confirmed-unused version can be removed.`,
    );
  }
}

async function markVersionInUse(versionDir) {
  const key = `${versionDir}:${process.pid}`;
  if (leases.has(key)) return;
  const lease = join(versionDir, `.in-use-${process.pid}-${randomUUID()}`);
  await writeFile(lease, JSON.stringify({ pid: process.pid }));
  leases.add(key);
  leases.add(lease);
  if (!exitHookRegistered) {
    exitHookRegistered = true;
    process.once("exit", () => {
      for (const path of leases) {
        if (path.includes(".in-use-")) rmSync(path, { force: true });
      }
    });
  }
}

export async function materializeMediaTool(
  label,
  {
    platform = `${process.platform}-${process.arch}`,
    cacheRoot =
      process.env.CHATCUT_MEDIA_IMPORT_CACHE_DIR ||
      join(homedir(), ".chatcut", "cache", "ffmpeg"),
    manifest = MEDIA_TOOLS_MANIFEST,
    fetchImpl = fetch,
    log,
  } = {},
) {
  const asset = manifest.platforms[platform]?.[label];
  if (!asset) return undefined;
  const versionDir = join(cacheRoot, manifest.version);
  const cacheDir = join(versionDir, platform);
  const destination = join(cacheDir, asset.filename);
  await mkdir(cacheDir, { recursive: true });

  const existing = existsSync(destination)
    ? await sha256File(destination)
    : undefined;
  if (
    existing?.bytes === asset.extractedBytes &&
    existing?.sha256 === asset.extractedSha256
  ) {
    await markVersionInUse(versionDir);
    return destination;
  }

  const lockPath = join(versionDir, ".install.lock");
  const release = await acquireInstallLock(lockPath);
  try {
    const afterLock = existsSync(destination)
      ? await sha256File(destination)
      : undefined;
    if (
      afterLock?.bytes === asset.extractedBytes &&
      afterLock?.sha256 === asset.extractedSha256
    ) {
      await markVersionInUse(versionDir);
      return destination;
    }
    await pruneManagedCache(
      cacheRoot,
      manifest.version,
      log,
      asset.extractedBytes,
    );
    await rm(destination, { force: true });
    const token = `${process.pid}.${randomUUID()}`;
    const partial = join(cacheDir, `${asset.filename}.${token}.partial`);
    const extracted = join(cacheDir, `${asset.filename}.${token}.tmp`);
    try {
      log?.(`downloading ${label} ${manifest.version} for ${platform}`);
      await downloadArchive(asset, partial, fetchImpl);
      await extractArchive(asset, partial, extracted);
      await rename(extracted, destination);
      await writeFile(
        join(versionDir, ".chatcut-managed.json"),
        JSON.stringify({ version: manifest.version }),
      );
    } finally {
      await rm(partial, { force: true });
      await rm(extracted, { force: true });
    }
    await markVersionInUse(versionDir);
  } finally {
    await release();
  }
  await pruneManagedCache(cacheRoot, manifest.version, log);
  return destination;
}

export async function resolveMediaTool(configured, label, options = {}) {
  if (configured) {
    assertTool(configured, label);
    return configured;
  }
  try {
    assertTool(label, label);
    options.log?.(`using ${label} from PATH`);
    return label;
  } catch {}
  try {
    const downloaded = await materializeMediaTool(label, options);
    if (downloaded) {
      assertTool(downloaded, label);
      options.log?.(`using cached ${label} ${options.manifest?.version || MEDIA_TOOLS_VERSION}`);
      return downloaded;
    }
  } catch (error) {
    throw new Error(
      `${label} is unavailable on PATH and the managed download failed: ${error.message}`,
    );
  }
  throw new Error(`${label} is unsupported on ${process.platform}-${process.arch}`);
}

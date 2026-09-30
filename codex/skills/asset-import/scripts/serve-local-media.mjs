#!/usr/bin/env node
// Tokenized loopback file server shared by the Claude and Codex import skills.
// Serves ONLY the explicitly listed
// files, only to the ChatCut editor origin, only on 127.0.0.1, and shuts
// itself down after --ttl seconds (default 900) so no ambient file server
// outlives the import.
//
// Usage:
//   node serve-local-media.mjs [--port 43991] [--ttl 900] \
//     [--origin <editor-origin>] /abs/path/a.mp4 /abs/path/b.mov
// Use the origin from the actual editor/browserHandoff URL for beta, preview,
// or production sessions.
//
// The imports array contains ready-to-call import_media arguments.
// Browser local-network permission may still be required despite CORS/PNA headers.
// Range requests are honoured so an interrupted editor download resumes
// instead of starting over, and so the editor can read the file's index and
// first frame for its import card while the copy is still running.

import { createServer } from "node:http";
import { pipeline } from "node:stream";
import { createReadStream, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

function usageExit(message) {
  if (message) console.error(message);
  console.error(
    "usage: serve-local-media.mjs [--port N] [--ttl S] [--origin URL] <file>...",
  );
  process.exit(2);
}

function numberArg(flag, raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    usageExit(`invalid ${flag} value: ${raw}`);
  }
  return value;
}

const args = process.argv.slice(2);
let port = 0; // 0 = ephemeral
let ttlSeconds = 900;
let origin = "https://app.chatcut.io";
const paths = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port") port = numberArg("--port", args[++i]);
  else if (args[i] === "--ttl") ttlSeconds = numberArg("--ttl", args[++i]);
  else if (args[i] === "--origin") {
    const raw = args[++i];
    try {
      origin = new URL(raw).origin;
    } catch {
      usageExit(`invalid --origin value: ${raw}`);
    }
  } else paths.push(resolve(args[i]));
}
if (paths.length === 0) usageExit();
const files = new Map();
for (const p of paths) {
  let st;
  try {
    st = statSync(p);
  } catch (error) {
    usageExit(
      `cannot read file: ${p}${error instanceof Error ? ` (${error.message})` : ""}`,
    );
  }
  if (!st.isFile()) usageExit(`not a file: ${p}`);
  const name = basename(p);
  if (files.has(name)) {
    usageExit(
      `duplicate basename "${name}" (${files.get(name).path} vs ${p}); rename one copy first`,
    );
  }
  files.set(name, { path: p, size: st.size, assetId: randomUUID() });
}

const token = randomBytes(16).toString("base64url");
// Node's default 64 KiB reads mean tens of thousands of syscalls per file;
// 1 MiB keeps the loopback socket fed on multi-GB originals.
const READ_HIGH_WATER_MARK = 1024 * 1024;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  // Chrome Private Network Access preflight for public->loopback fetches.
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Accept-Ranges, Content-Length, Content-Range",
  );
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-store");
}

// Only the open-ended "bytes=N-" form a resuming download sends is accepted;
// anything else falls back to the whole file.
function parseRangeStart(header, size) {
  const match = /^bytes=(\d+)-$/.exec(header ?? "");
  if (!match) return null;
  const start = Number(match[1]);
  return Number.isSafeInteger(start) && start < size ? start : undefined;
}

const server = createServer((req, res) => {
  cors(res);
  // Browsers always send Origin on cross-origin fetches; reject anything
  // that is not the editor origin. Origin-less requests (curl debugging on
  // the same machine) are allowed — the per-run token is the real gate.
  const reqOrigin = req.headers.origin;
  if (reqOrigin && reqOrigin !== origin) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(req.url ?? "/");
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const [, reqToken, ...rest] = decodedPath.split("/");
  const name = rest.join("/");
  const entry = reqToken === token ? files.get(name) : undefined;
  if (!entry) {
    res.writeHead(reqToken === token ? 404 : 403);
    res.end();
    return;
  }
  const rangeStart = parseRangeStart(req.headers.range, entry.size);
  if (rangeStart === undefined) {
    res.writeHead(416, { "content-range": `bytes */${entry.size}` });
    res.end();
    return;
  }
  const start = rangeStart ?? 0;
  // Any Range request gets 206, even from byte 0: a 200 tells range-probing
  // readers such as Mediabunny's UrlSource to stream the whole file.
  const ranged = rangeStart !== null;
  res.writeHead(ranged ? 206 : 200, {
    "content-type": "application/octet-stream",
    "content-length": entry.size - start,
    ...(ranged
      ? { "content-range": `bytes ${start}-${entry.size - 1}/${entry.size}` }
      : {}),
  });
  const stream = createReadStream(entry.path, {
    highWaterMark: READ_HIGH_WATER_MARK,
    start,
  });
  // pipeline, not pipe: a reader that cancels once it has the bytes it wanted
  // must close the file too.
  pipeline(stream, res, () => {});
});

server.listen(port, "127.0.0.1", () => {
  const addr = server.address();
  const base = `http://127.0.0.1:${addr.port}/${token}`;
  const out = {
    port: addr.port,
    token,
    origin,
    ttlSeconds,
    files: Object.fromEntries(
      [...files.keys()].map((n) => [n, `${base}/${encodeURIComponent(n)}`]),
    ),
    imports: [...files].map(([filename, entry]) => ({
      action: "from_editor",
      assetId: entry.assetId,
      filename,
      sizeBytes: entry.size,
      url: `${base}/${encodeURIComponent(filename)}`,
    })),
  };
  console.log(JSON.stringify(out));
});

server.on("error", (error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});

setTimeout(() => {
  server.close(() => process.exit(0));
  // Do not linger on open sockets past the TTL.
  setTimeout(() => process.exit(0), 2000).unref();
}, ttlSeconds * 1000).unref();

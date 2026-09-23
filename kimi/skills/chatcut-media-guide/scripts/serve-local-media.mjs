#!/usr/bin/env node
// Tokenized loopback file server shared by hosted plugin import skills.
// Serves only explicitly listed files to the selected ChatCut editor origin.

import { randomBytes, randomUUID } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { pipeline } from "node:stream";
import { basename, resolve } from "node:path";

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
let port = 0;
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
for (const path of paths) {
  let stat;
  try {
    stat = statSync(path);
  } catch (error) {
    usageExit(
      `cannot read file: ${path}${error instanceof Error ? ` (${error.message})` : ""}`,
    );
  }
  if (!stat.isFile()) usageExit(`not a file: ${path}`);
  const name = basename(path);
  if (files.has(name)) {
    usageExit(
      `duplicate basename "${name}" (${files.get(name).path} vs ${path}); rename one copy first`,
    );
  }
  files.set(name, { assetId: randomUUID(), path, size: stat.size });
}

const token = randomBytes(16).toString("base64url");
// Node's default 64 KiB reads mean tens of thousands of syscalls per file;
// 1 MiB keeps the loopback socket fed on multi-GB originals.
const READ_HIGH_WATER_MARK = 1024 * 1024;

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Allow-Private-Network", "true");
  response.setHeader(
    "Access-Control-Expose-Headers",
    "Accept-Ranges, Content-Length, Content-Range",
  );
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Cache-Control", "no-store");
}

// Only the open-ended "bytes=N-" form a resuming download sends is accepted;
// anything else falls back to the whole file.
function parseRangeStart(header, size) {
  const match = /^bytes=(\d+)-$/.exec(header ?? "");
  if (!match) return null;
  const start = Number(match[1]);
  return Number.isSafeInteger(start) && start < size ? start : undefined;
}

const server = createServer((request, response) => {
  setCorsHeaders(response);
  const requestOrigin = request.headers.origin;
  if (requestOrigin && requestOrigin !== origin) {
    response.writeHead(403);
    response.end();
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method !== "GET") {
    response.writeHead(405);
    response.end();
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(request.url ?? "/");
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  const [, requestToken, ...rest] = decodedPath.split("/");
  const entry = requestToken === token ? files.get(rest.join("/")) : undefined;
  if (!entry) {
    response.writeHead(requestToken === token ? 404 : 403);
    response.end();
    return;
  }

  const rangeStart = parseRangeStart(request.headers.range, entry.size);
  if (rangeStart === undefined) {
    response.writeHead(416, { "content-range": `bytes */${entry.size}` });
    response.end();
    return;
  }
  const start = rangeStart ?? 0;
  // Any Range request gets 206, even from byte 0: a 200 tells range-probing
  // readers such as Mediabunny's UrlSource to stream the whole file.
  const ranged = rangeStart !== null;
  response.writeHead(ranged ? 206 : 200, {
    "content-length": entry.size - start,
    "content-type": "application/octet-stream",
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
  pipeline(stream, response, () => {});
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/${token}`;
  console.log(
    JSON.stringify({
      files: Object.fromEntries(
        [...files.keys()].map((name) => [
          name,
          `${base}/${encodeURIComponent(name)}`,
        ]),
      ),
      imports: [...files].map(([filename, entry]) => ({
        action: "from_editor",
        assetId: entry.assetId,
        filename,
        sizeBytes: entry.size,
        url: `${base}/${encodeURIComponent(filename)}`,
      })),
      origin,
      port: address.port,
      token,
      ttlSeconds,
    }),
  );
});

server.on("error", (error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});

setTimeout(() => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}, ttlSeconds * 1000).unref();

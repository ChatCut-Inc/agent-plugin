import assert from "node:assert/strict";
import { createServer } from "node:net";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { probeMetadataWire } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-wire.mjs";
import { errorDetails, redact } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";
import { validateSnapshot } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-evidence.mjs";
import { runDoctor } from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";

async function serve(t, response, keepOpen = false) {
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    socket.once("data", () => (keepOpen ? socket.write(response) : socket.end(response)));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(resolve);
      }),
  );
  return `http://127.0.0.1:${server.address().port}/.well-known/oauth-protected-resource`;
}

test("complete length and chunk boundaries finish without waiting for a keep-alive peer to close", async (t) => {
  for (const [response, bytes] of [
    ["HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: keep-alive\r\n\r\n{}", 2],
    ["HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n", 0],
    ["HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n0\r\n\r\n", 2],
    [
      "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n0\r\nX-Fixture: yes\r\n\r\n",
      2,
    ],
  ]) {
    const result = await probeMetadataWire(
      await serve(t, response, true),
      randomUUID(),
      errorDetails,
    );
    assert.equal(result.outcome, "response_observed");
    assert.equal(result.error, undefined);
    assert.equal(result.framing.bodyBytes, bytes);
    assert.equal(result.completionReason, "message_boundary");
    assert.equal(result.peerEndObserved, false);
  }
  const closed = await probeMetadataWire(
    await serve(t, "HTTP/1.0 200 OK\r\n\r\n{}"),
    randomUUID(),
    errorDetails,
  );
  assert.equal(closed.outcome, "response_observed");
  assert.equal(closed.completionReason, "peer_end");
  assert.equal(closed.peerEndObserved, true);
});

test("an incomplete keep-alive response still times out with its original transport error", async (t) => {
  const result = await probeMetadataWire(
    await serve(t, "HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\n{}", true),
    randomUUID(),
    errorDetails,
  );
  assert.equal(result.outcome, "failed");
  assert.equal(result.error.code, "DIAGNOSTIC_WIRE_TIMEOUT");
  assert.equal(result.framing.status, "incomplete");
  assert.equal(result.framing.bodySha256, undefined);
});

test("invalid status lines and unsupported interim responses never become complete HTTP responses", async (t) => {
  for (const line of [
    "NOT-HTTP",
    "",
    "Content-Length: 2",
    "HTTP/1.1 700 Invalid",
    "HTTP/1.1 200OK",
  ]) {
    const result = await probeMetadataWire(
      await serve(t, `${line}\r\nContent-Length: 2\r\n\r\n{}`, true),
      randomUUID(),
      errorDetails,
    );
    assert.equal(result.status, null);
    assert.equal(result.outcome, "invalid_response");
    assert.equal(result.responseState, "invalid_status_line");
    assert.equal(result.framing.status, "not_evaluated");
    assert.equal(result.framing.bodySha256, undefined);
    assert.ok(result.capturedBytes > 0);
  }
  const interim = await probeMetadataWire(
    await serve(
      t,
      "HTTP/1.1 100 Continue\r\n\r\nHTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}",
      true,
    ),
    randomUUID(),
    errorDetails,
  );
  assert.equal(interim.status, 100);
  assert.equal(interim.outcome, "unsupported_response");
  assert.equal(interim.framing.bodySha256, undefined);
});

test("wire evidence distinguishes a chunk header followed by raw JSON from valid chunk framing", async (t) => {
  const body = '{"resource":"https://fixture.invalid/mcp"}';
  const head =
    "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nX-Request-ID: same-request\r\n\r\n";
  const bad = await probeMetadataWire(await serve(t, head + body), randomUUID(), errorDetails);
  assert.equal(bad.status, 200);
  assert.equal(bad.responseHeaders["x-request-id"], "same-request");
  assert.equal(bad.framing.firstBodyByteHex, "7b");
  assert.equal(bad.framing.status, "invalid");
  assert.equal(bad.framing.reason, "invalid_chunk_size");
  assert.equal(bad.outcome, "invalid_framing");
  assert.match(bad.route, /host_and_fetch_route_not_reproduced/);
  assert.equal(JSON.stringify(bad).includes('"resource"'), false);
  const good = await probeMetadataWire(
    await serve(t, head + Buffer.byteLength(body).toString(16) + "\r\n" + body + "\r\n0\r\n\r\n"),
    randomUUID(),
    errorDetails,
  );
  assert.equal(good.framing.status, "valid");
  assert.equal(good.framing.bodySha256, createHash("sha256").update(body).digest("hex"));
});

test("truncated and contradictory responses remain failures, while bounded capture stays explicitly incomplete", async (t) => {
  for (const [response, expected] of [
    ["HTTP/1.1 200 OK\r\nContent-Length: 30\r\n\r\n{}", "content_length_mismatch"],
    [
      "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n",
      "both_transfer_encoding_and_content_length",
    ],
    ["HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n", "missing_terminal_chunk"],
    ["HTTP/1.1 200 OK\r\nContent-Length: 1\r\n\r\n{}", "content_length_mismatch"],
    [
      "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nextra",
      "bytes_after_terminal_chunk",
    ],
  ]) {
    const result = await probeMetadataWire(await serve(t, response), randomUUID(), errorDetails);
    assert.equal(result.framing.reason, expected);
    assert.equal(result.framing.status, "invalid");
  }
  const large = await probeMetadataWire(
    await serve(t, "HTTP/1.1 200 OK\r\nContent-Length: 200000\r\n\r\n" + "x".repeat(140000)),
    randomUUID(),
    errorDetails,
  );
  assert.equal(large.captureLimited, true);
  assert.equal(large.framing.status, "incomplete");
  assert.equal(large.framing.bodySha256, undefined);
});

test("wire probes reject non-metadata and off-product targets before connecting", async () => {
  for (const url of [
    "https://example.org/.well-known/oauth-protected-resource",
    "https://api.chatcut.io/auth/mcp/token",
    "https://api.chatcut.io/.well-known/oauth-protected-resource?token=private",
  ]) {
    await assert.rejects(probeMetadataWire(url, randomUUID(), errorDetails), /restricted/);
  }
});

test("credential redaction preserves the Bearer metadata challenge while removing actual credentials", () => {
  const challenge =
    'Bearer resource_metadata="https://api.chatcut.io/.well-known/oauth-protected-resource"';
  assert.equal(redact(challenge), challenge);
  assert.equal(redact("Bearer fixture-private-token"), "Bearer [REDACTED]");
});

test("snapshot creation and preflight avoid the observed schema/time mistakes without inventing unknown event time", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-snapshot-preflight-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "current.mcp-snapshot.json");
  const script = fileURLToPath(
    new URL("../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs", import.meta.url),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
  assert.equal(run("--create-snapshot", path).status, 0);
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  snapshot.observations.push({
    stage: "unfamiliar_transport_stage",
    source: "runtime_log",
    observedAt: null,
    outcome: "failed",
    message: "E_UNKNOWN_472",
  });
  await writeFile(path, JSON.stringify(snapshot));
  const preflight = run("--validate-snapshot", path);
  assert.equal(preflight.status, 0, preflight.stderr);
  assert.equal(JSON.parse(preflight.stdout).networkRequests, 0);
  assert.equal(validateSnapshot(snapshot).observations[0].observedAt, null);
  snapshot.schemaVersion = 2;
  assert.throws(() => validateSnapshot(snapshot), /outer Doctor report/);
  snapshot.schemaVersion = 1;
  snapshot.observedAt = "2026-10-23T01:00:00";
  assert.throws(() => validateSnapshot(snapshot), /timezone/);
  assert.notEqual(run("--create-snapshot", path).status, 0);
});

test("the independently installed Codex and Claude packages contain identical wire helpers", async () => {
  assert.equal(
    await readFile(
      new URL("../codex/skills/chatcut-plugin-basics/scripts/mcp-wire.mjs", import.meta.url),
      "utf8",
    ),
    await readFile(
      new URL(
        "../claude/skills/chatcut-plugin-basics-claude/scripts/mcp-wire.mjs",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});

test("an invalid snapshot and unknown network failure still produce a complete, locally retained report with actionable gaps", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-evidence-gaps-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const snapshot = join(dir, "current.mcp-snapshot.json");
  const original = join(dir, "original.txt");
  await writeFile(snapshot, JSON.stringify({ schemaVersion: 2, observedAt: "invalid" }));
  await writeFile(original, "Original unknown error E_NEVER_SEEN_761");
  const { report, path } = await runDoctor(
    {
      host: "codex",
      serverUrl: "http://127.0.0.1:1/api/external-mcp/mcp",
      hostSnapshot: snapshot,
      originalError: original,
      output: join(dir, "report.json"),
      wireEvidence: true,
      upload: true,
    },
    {
      collectLogs: async () => ({ entries: [], gaps: [] }),
      fetchImpl: async () => {
        throw Object.assign(new Error("Unfamiliar network failure"), { code: "E_FUTURE_NETWORK" });
      },
      probeWire: async () => {
        throw Object.assign(new Error("Unfamiliar wire failure"), { code: "E_FUTURE_WIRE" });
      },
    },
  );
  assert.match(report.originalFailure.message, /E_NEVER_SEEN_761/);
  assert.equal(report.entryProbe.error.code, "E_FUTURE_NETWORK");
  assert.equal(report.upload.status, "failed");
  assert.match(
    report.gaps.find((gap) => gap.source === "host_snapshot").action,
    /--create-snapshot/,
  );
  assert.ok(report.gaps.some((gap) => gap.error?.code === "E_FUTURE_WIRE"));
  assert.ok(report.evidenceSummary.gaps.includes("original_request_id_unavailable"));
  assert.match(JSON.parse(await readFile(path)).originalFailure.message, /E_NEVER_SEEN_761/);
});

test("a schema-rejected snapshot cannot override an explicitly disabled connection", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-disabled-snapshot-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "current.mcp-snapshot.json");
  await writeFile(path, JSON.stringify({ schemaVersion: 2, configuration: { enabled: false } }));
  const { report } = await runDoctor(
    {
      host: "codex",
      serverUrl: "http://127.0.0.1:1/api/external-mcp/mcp",
      hostSnapshot: path,
      wireEvidence: true,
      upload: true,
      output: join(dir, "report.json"),
    },
    {
      collectLogs: async () => ({ entries: [], gaps: [] }),
      fetchImpl: async () => {
        throw new Error("Disabled connection must make no network request");
      },
      probeWire: async () => {
        throw new Error("Disabled connection must make no wire probe");
      },
    },
  );
  assert.equal(report.entryProbe, undefined);
  assert.equal(report.wireProbes.length, 0);
  assert.equal(report.upload.status, "skipped_intentionally_disabled");
  assert.ok(
    report.gaps.some(
      (gap) => gap.reason === "host_reports_intentionally_disabled; no_requests_sent",
    ),
  );
});

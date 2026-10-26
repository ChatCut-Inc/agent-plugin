import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { runDoctor } from "../codex/skills/chatcut-mcp-doctor/scripts/mcp-doctor.mjs";
import { uploadReport } from "../codex/skills/chatcut-mcp-doctor/scripts/doctor.mjs";

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "doctor-upload-owned-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "original.json");
  await runDoctor({ host: "codex", serverUrl: "http://127.0.0.1:1234/api/external-mcp/mcp", offline: true, output: path }, { collectLogs: async () => ({ entries: [], gaps: [] }) });
  return { path, bytes: await readFile(path) };
}

test("concurrent saved-report transfers have one owner and one POST; original remains identical", async t => {
  const { path, bytes } = await fixture(t);
  let posts = 0, release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const began = new Promise(resolve => { started = resolve; });
  const fetchImpl = async () => { posts++; started(); await gate; return new Response('{"ok":true}'); };
  const first = uploadReport(path, { fetchImpl });
  await began;
  await assert.rejects(uploadReport(path, { fetchImpl }), /already owned/);
  release();
  const sent = await first;
  assert.equal(sent.receipt.status, "ingest_accepted");
  assert.equal(sent.receipt.storageVerified, false);
  await assert.rejects(uploadReport(path, { fetchImpl }), /already acknowledged/);
  assert.equal(posts, 1);
  assert.deepEqual(await readFile(path), bytes);
});

test("lost ACK preserves original cause and blocks blind resend", async t => {
  const { path, bytes } = await fixture(t); let posts = 0;
  const fetchImpl = async () => { posts++; throw Object.assign(new Error("original ACK read failed"), { cause: { code: "E_SOCKET" } }); };
  const sent = await uploadReport(path, { fetchImpl });
  assert.equal(sent.receipt.status, "failed");
  assert.equal(sent.receipt.deliveryUncertain, true);
  assert.match(JSON.stringify(sent.receipt.error), /original ACK read failed/);
  assert.match(JSON.stringify(sent.receipt.error), /E_SOCKET/);
  await assert.rejects(uploadReport(path, { fetchImpl }), /delivery is uncertain/);
  assert.equal(posts, 1);
  assert.deepEqual(await readFile(path), bytes);
});

test("interrupted owner and persisted sending receipt never become automatic retries", async t => {
  const { path } = await fixture(t);
  await writeFile(path + ".upload.lock", "interrupted fixture owner", { flag: "wx" });
  await assert.rejects(uploadReport(path, { fetchImpl: () => assert.fail("must not send") }), /already owned/);
  assert.equal(await readFile(path + ".upload.lock", "utf8"), "interrupted fixture owner");
});

test("source hash mismatch refuses a changed report before any subsequent send", async t => {
  const { path } = await fixture(t); let posts = 0;
  const failed = await uploadReport(path, { fetchImpl: async () => { posts++; return new Response("busy", { status: 503 }); } });
  assert.equal(failed.receipt.deliveryUncertain, true);
  const changed = JSON.parse(await readFile(path)); changed.collectedAt = "2000-01-01T00:00:00Z";
  await writeFile(path, JSON.stringify(changed));
  await assert.rejects(uploadReport(path, { fetchImpl: () => assert.fail("must not send changed evidence") }), /does not match/);
  assert.equal(posts, 1);
});

test("incomplete checkpoint is locally deliverable and never posted", async t => {
  const { path } = await fixture(t);
  const report = JSON.parse(await readFile(path)); report.collectionStatus = "in_progress";
  await writeFile(path, JSON.stringify(report)); const bytes = await readFile(path);
  const sent = await uploadReport(path, { fetchImpl: () => assert.fail("must not send incomplete report") });
  assert.equal(sent.receipt.status, "failed");
  assert.equal(sent.receipt.deliveryUncertain, false);
  assert.match(sent.receipt.error.message, /Incomplete collection/);
  const retried = await uploadReport(path, { fetchImpl: () => assert.fail("no-attempt retry must still not send an incomplete report") });
  assert.equal(retried.receipt.deliveryUncertain, false);
  assert.equal(retried.sourceReportSha256, sent.sourceReportSha256);
  assert.deepEqual(await readFile(path), bytes);
});

test("legacy failed delivery without certainty evidence is not treated as permission to resend", async t => {
  const { path } = await fixture(t);
  const report = JSON.parse(await readFile(path));
  report.upload = { status: "failed", storageVerified: false, error: { message: "legacy connection closed" } };
  await writeFile(path, JSON.stringify(report));
  await assert.rejects(uploadReport(path, { fetchImpl: () => assert.fail("must not resend uncertain legacy evidence") }), /delivery is uncertain/);
});

for (const [label, response] of [
  ["HTTP 500", () => new Response("upstream failed after ingest", { status: 500 })],
  ["HTTP 503", () => new Response("upstream busy", { status: 503 })],
  ["missing success ACK", () => new Response("{}")],
  ["malformed ACK", () => new Response("{\"ok\":")],
  ["interrupted ACK body", () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"ok":'));
    controller.error(Object.assign(new Error("original response body interrupted"), { cause: { code: "E_ACK_BODY" } }));
  } }))],
]) test(label + " cannot prove no-write and blocks resend while retaining original evidence", async t => {
  const { path, bytes } = await fixture(t); let posts = 0;
  const fetchImpl = async () => { posts++; return response(); };
  const sent = await uploadReport(path, { fetchImpl });
  assert.equal(sent.receipt.status, "failed");
  assert.equal(sent.receipt.deliveryUncertain, true);
  assert.equal(sent.receipt.storageVerified, false);
  if (label === "interrupted ACK body") assert.match(JSON.stringify(sent.receipt.error), /E_ACK_BODY/);
  const saved = await readFile(path + ".upload.json");
  await assert.rejects(uploadReport(path, { fetchImpl }), /delivery is uncertain/);
  assert.equal(posts, 1);
  assert.deepEqual(await readFile(path), bytes);
  assert.deepEqual(await readFile(path + ".upload.json"), saved);
});

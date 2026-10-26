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

test("a complete failure response permits a separately requested retry, and source hash mismatch refuses it", async t => {
  const { path } = await fixture(t); let posts = 0;
  const failed = await uploadReport(path, { fetchImpl: async () => { posts++; return new Response("busy", { status: 503 }); } });
  assert.equal(failed.receipt.deliveryUncertain, false);
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
  assert.deepEqual(await readFile(path), bytes);
});

test("legacy failed delivery without certainty evidence is not treated as permission to resend", async t => {
  const { path } = await fixture(t);
  const report = JSON.parse(await readFile(path));
  report.upload = { status: "failed", storageVerified: false, error: { message: "legacy connection closed" } };
  await writeFile(path, JSON.stringify(report));
  await assert.rejects(uploadReport(path, { fetchImpl: () => assert.fail("must not resend uncertain legacy evidence") }), /delivery is uncertain/);
});

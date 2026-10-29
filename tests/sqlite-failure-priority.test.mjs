import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const now = Date.parse("2026-10-28T12:00:00Z");
const errorMessage =
  "request{server_name=chatcut thread_id=original-thread call_id=original-call}: " +
  "E_SQLITE_PRIORITY cause=ECONNRESET Authorization: Bearer synthetic-secret; ORIGINAL_END_中文🙂";

async function fixture(t, noticeCount) {
  const root = resolve(tmpdir());
  const dir = await mkdtemp(join(root, "chatcut-sqlite-priority-"));
  t.after(async () => {
    assert.ok(resolve(dir).startsWith(root + sep));
    assert.ok(basename(dir).startsWith("chatcut-sqlite-priority-"));
    await rm(dir, { recursive: true, force: true });
  });
  await mkdir(join(dir, "app"));
  const db = new DatabaseSync(join(dir, "logs_2.sqlite"));
  db.exec(
    "CREATE TABLE logs (id INTEGER PRIMARY KEY, ts INTEGER, level TEXT, target TEXT, feedback_log_body TEXT, thread_id TEXT)",
  );
  const insert = db.prepare("INSERT INTO logs VALUES (?, ?, ?, ?, ?, ?)");
  let id = 0;
  const add = (message, level = "ERROR", ago = 600, thread = "original-thread") =>
    insert.run(++id, now / 1000 - ago, level, "codex_mcp::rmcp_client", message, thread);
  add(errorMessage);
  for (let index = 0; index < noticeCount; index++)
    add(
      `capture_binding_with_metadata: omitting MCP server without an exact ready client server_name=chatcut notice=${index}`,
      "INFO",
      noticeCount + 60 - index,
    );
  return {
    dir,
    db,
    add,
    options: {
      home: dir,
      codexHome: dir,
      codexSqliteHome: dir,
      codexLogDir: dir,
      codexAppLogDir: join(dir, "app"),
      conversationId: "original-thread",
      now,
    },
  };
}

for (const [surface, location] of [
  ["Codex", "codex/skills/chatcut-plugin-basics"],
  ["Claude", "claude/skills/chatcut-plugin-basics-claude"],
]) {
  const helper = await import(new URL(`../${location}/scripts/mcp-doctor.mjs`, import.meta.url));

  for (const notices of [29, 30, 31, 199, 200])
    test(`${surface} helper prioritizes SQLite failure with ${notices} newer notices within the existing SQL bound`, async (t) => {
      const f = await fixture(t, notices);
      f.db.close();
      const logs = await helper.collectHostLogs("codex", f.options);
      assert.equal(logs.entries.length, 30);
      assert.equal(
        logs.entries.some((entry) => entry.message.includes("E_SQLITE_PRIORITY")),
        notices < 200,
      );
      assert.ok(logs.entries.every((entry) => entry.source === "codex_runtime_sqlite"));
      assert.ok(logs.entries.reduce((bytes, entry) => bytes + Buffer.byteLength(entry.message), 0) <= 128 * 1024);
      assert.ok(!JSON.stringify(logs).includes("synthetic-secret"));
      assert.equal(
        logs.gaps.some((gap) => gap.source === "codex_runtime_sqlite" && gap.reason === "log_record_limit"),
        notices >= 199,
      );
      if (notices < 200) {
        const failure = logs.entries.find((entry) => entry.message.includes("E_SQLITE_PRIORITY"));
        assert.ok(failure.message.endsWith("ORIGINAL_END_中文🙂"));
        assert.equal(failure.conversationId, "original-thread");
        assert.equal(failure.callId, "original-call");
        assert.equal(failure.originalAttemptMatch, "unconfirmed");
      }
    });

  test(`${surface} helper keeps SQLite server, thread and content-echo filters before prioritizing`, async (t) => {
    const f = await fixture(t, 31);
    f.add("request{server_name=other}: DO_NOT_COLLECT_OTHER chatcut", "ERROR", 10);
    f.add('request{server_name=chatcut}: tool result: {"content":[{"text":"DO_NOT_COLLECT_ECHO"}]}', "ERROR", 11);
    f.add("request{server_name=chatcut}: DO_NOT_COLLECT_THREAD", "ERROR", 12, "other-thread");
    f.db.close();
    const logs = await helper.collectHostLogs("codex", f.options);
    assert.ok(logs.entries.some((entry) => entry.message.includes("E_SQLITE_PRIORITY")));
    assert.ok(!JSON.stringify(logs).includes("DO_NOT_COLLECT"));
    assert.equal(logs.entries.length, 30);
  });

  test(`${surface} helper applies the complete-error byte budget to all admitted SQLite candidates`, async (t) => {
    const f = await fixture(t, 31);
    for (let index = 0; index < 2; index++)
      f.add(`request{server_name=chatcut}: E_LARGE_${index} ${"X".repeat(90_000)} END_COMPLETE_${index}`, "ERROR", 500 - index);
    f.db.close();
    const logs = await helper.collectHostLogs("codex", f.options);
    const large = logs.entries.filter((entry) => entry.message.includes("E_LARGE_"));
    assert.equal(large.length, 1);
    assert.ok(large[0].message.endsWith("END_COMPLETE_1"));
    assert.ok(logs.entries.some((entry) => entry.message.includes("E_SQLITE_PRIORITY")));
    assert.ok(logs.entries.length <= 30);
    assert.ok(logs.entries.reduce((bytes, entry) => bytes + Buffer.byteLength(entry.message), 0) <= 128 * 1024);
    assert.ok(logs.gaps.some((gap) => gap.reason === "failure_prioritized_log_budget" && gap.omittedFailureRecords === 1));
  });

  for (const mode of ["offline", "upload_failure"])
    test(`${surface} helper persists original and prioritized evidence through ${mode} and UTF-8 fragments without external network`, async (t) => {
      let unexpectedRequests = 0;
      t.mock.method(globalThis, "fetch", async () => {
        unexpectedRequests++;
        throw new Error("External network is forbidden in this regression");
      });
      const f = await fixture(t, 30);
      f.db.close();
      const original = {
        schemaVersion: 1,
        source: "host_tool_result",
        serverName: "chatcut",
        occurredAt: new Date(now - 30_000).toISOString(),
        conversationId: "original-thread",
        callId: "original-call",
        requestId: "original-server-id",
        operation: "list_projects",
        error: {
          message: "E_ORIGINAL 中文🙂 Authorization: Bearer synthetic-secret",
          code: "E_ORIGINAL",
          cause: { message: "Original socket reset", code: "ECONNRESET" },
          stack: "Error: E_ORIGINAL\n at controlled-source:1",
        },
        httpResponse: {
          source: "host_original_error_response",
          status: 502,
          headers: { "X-Request-ID": "original-server-id", "Set-Cookie": "session=synthetic-secret" },
          body: '{"error":"原响应🙂"}',
          bodyComplete: true,
        },
      };
      const input = join(f.dir, "original.mcp-failure.json");
      await writeFile(input, JSON.stringify(original));
      const originalBytes = await readFile(input);
      let uploads = 0;
      const { path, report } = await helper.runDoctor(
        {
          host: "codex",
          failureRecord: input,
          output: join(f.dir, "report.json"),
          serverUrl: "http://127.0.0.1:9/api/external-mcp/mcp",
          offline: mode === "offline",
          upload: true,
        },
        {
          collectLogs: () => helper.collectHostLogs("codex", f.options),
          fetchImpl: async (url) => {
            assert.equal(new URL(url).hostname, "127.0.0.1");
            if (new URL(url).pathname === "/telemetry/events") {
              uploads++;
              throw Object.assign(new Error("Controlled certificate validation failure"), { code: "CERT_HAS_EXPIRED" });
            }
            return new Response("{}", { headers: { "content-type": "application/json" } });
          },
        },
      );
      const saved = JSON.parse(await readFile(path, "utf8"));
      assert.deepEqual(saved, report);
      assert.deepEqual(await readFile(input), originalBytes);
      assert.equal(saved.originalFailure.error.code, "E_ORIGINAL");
      assert.equal(saved.originalFailure.error.cause.code, "ECONNRESET");
      assert.equal(saved.originalFailure.occurredAt, original.occurredAt);
      assert.equal(saved.originalFailure.callId, "original-call");
      assert.equal(saved.originalFailure.requestId, "original-server-id");
      assert.equal(saved.originalFailure.httpResponse.body, original.httpResponse.body);
      assert.ok(saved.hostLogs.entries.some((entry) => entry.message.includes("E_SQLITE_PRIORITY")));
      assert.ok(!JSON.stringify(saved).includes("synthetic-secret"));
      assert.equal(saved.upload.status, mode === "offline" ? "skipped_offline" : "failed");
      assert.equal(saved.upload.storageVerified, false);
      assert.equal(uploads, mode === "offline" ? 0 : 1);
      assert.equal(unexpectedRequests, 0);
      if (mode === "upload_failure") assert.equal(saved.upload.error.code, "CERT_HAS_EXPIRED");
      const fragments = helper.fragmentEvents(saved).map((event) => event.properties.attributes.mcpDoctor);
      const json = fragments.map((fragment, index) => {
        assert.equal(fragment.fragmentIndex, index);
        assert.equal(fragment.fragmentCount, fragments.length);
        return fragment.fragment;
      }).join("");
      assert.equal(createHash("sha256").update(json, "utf8").digest("hex"), fragments[0].reportSha256);
      assert.deepEqual(JSON.parse(json), saved);
    });
}

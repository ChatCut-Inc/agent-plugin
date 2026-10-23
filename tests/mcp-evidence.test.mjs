import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createServer } from "node:net";
import { once } from "node:events";
import {
  collectHostLogs,
  inspectTransport,
  probeEntry,
  probeMetadata,
  runDoctor,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs";
import {
  evidenceSummary,
  inspectMetadata,
  validateSnapshot,
} from "../codex/skills/chatcut-plugin-basics/scripts/mcp-evidence.mjs";

const endpoint = new URL("https://api.chatcut.io/api/external-mcp/mcp");
const now = "2026-10-22T12:00:00.000Z";
const metadata = (url) =>
  new Response(
    JSON.stringify(
      url.includes("oauth-protected-resource")
        ? {
            resource: endpoint.href,
            authorization_servers: [endpoint.origin],
          }
        : {
            issuer: endpoint.origin,
            authorization_endpoint: endpoint.origin + "/auth/mcp/authorize",
            token_endpoint: endpoint.origin + "/auth/mcp/token",
            response_types_supported: ["code"],
            code_challenge_methods_supported: ["S256"],
          },
    ),
  );
const challenge = () =>
  new Response('{"error":{"code":-32000,"message":"Authentication required"}}', {
    status: 401,
    headers: {
      "www-authenticate":
        'Bearer resource_metadata="' +
        endpoint.origin +
        '/.well-known/oauth-protected-resource/api/external-mcp/mcp"',
      "x-request-id": "fixture-server-id",
    },
  });
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "chatcut-mcp-evidence-"));
  if (!dir.startsWith(join(tmpdir(), "chatcut-mcp-evidence-")))
    throw new Error("Unexpected fixture path");
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const dependencies = {
  collectLogs: async () => ({ entries: [], gaps: [] }),
  inspectTransport: async () => ({ status: "fixture_no_network" }),
  fetchImpl: async (url) => (url === endpoint.href ? challenge() : metadata(url)),
};

test("other observations and later probe IDs cannot close the original failure's correlation gap", () => {
  const report = {
    originalFailure: { status: "unavailable", occurredAt: null },
    hostSnapshot: {
      observations: [
        {
          stage: "session_tools",
          source: "current_session",
          observedAt: now,
          outcome: "unknown",
          requestId: "other-observation",
        },
      ],
    },
    hostLogs: { entries: [] },
    probes: [{ requestId: "later-probe-request" }],
  };
  assert.ok(evidenceSummary(report).gaps.includes("original_request_id_unavailable"));
  report.originalFailure.status = "recorded";
  assert.ok(evidenceSummary(report).gaps.includes("original_request_id_unavailable"));
  const original = {
    stage: "initialize",
    source: "runtime_log",
    observedAt: null,
    outcome: "failed",
    requestId: "original-request",
    originalAttemptMatch: "confirmed",
  };
  report.hostSnapshot.observations.push(original);
  const confirmed = evidenceSummary(report);
  assert.ok(!confirmed.gaps.includes("original_request_id_unavailable"));
  assert.equal(confirmed.originalRequestCorrelation.status, "agent_reported_same_attempt");
  assert.deepEqual(confirmed.originalRequestCorrelation.observations, [
    { requestId: "original-request", source: "runtime_log", observationIndex: 1 },
  ]);
  assert.match(confirmed.originalRequestCorrelation.provenance, /not_independently_verified/);
  report.originalFailure.status = "unavailable";
  assert.ok(evidenceSummary(report).gaps.includes("original_request_id_unavailable"));
  assert.equal(report.probes[0].requestId, "later-probe-request");
  assert.equal(report.hostSnapshot.observations[0].requestId, "other-observation");
});

test("same-attempt request association must be explicit and belong to a failed runtime/session observation", () => {
  const observation = {
    stage: "initialize",
    source: "current_session",
    observedAt: now,
    outcome: "failed",
    requestId: "request",
    originalAttemptMatch: "confirmed",
  };
  const snapshot = { schemaVersion: 1, observedAt: now, observations: [observation] };
  assert.equal(validateSnapshot(snapshot).observations[0].originalAttemptMatch, "confirmed");
  for (const changes of [
    { source: "cli_configuration" },
    { outcome: "success" },
    { requestId: "" },
    { originalAttemptMatch: "maybe" },
  ]) {
    assert.throws(
      () => validateSnapshot({ ...snapshot, observations: [{ ...observation, ...changes }] }),
      /association|attempt match/,
    );
  }
});

test("issuer-only and wrong-resource documents expose the missing protocol evidence", async () => {
  const auth = await probeMetadata(
    endpoint.origin + "/.well-known/oauth-authorization-server",
    "fixture",
    async () => new Response('{"issuer":"https://api.chatcut.io"}'),
  );
  assert.equal(auth.outcome, "invalid_metadata");
  for (const field of [
    "authorization_endpoint",
    "token_endpoint",
    "response_types_supported",
    "code_challenge_methods_supported",
  ])
    assert.ok(auth.metadataValidation.issues.some((item) => item.field === field));
  const resource = inspectMetadata(
    { resource: "https://wrong.example/mcp", authorization_servers: [endpoint.origin] },
    endpoint.origin + "/.well-known/oauth-protected-resource/api/external-mcp/mcp",
  );
  assert.equal(resource.valid, false);
  assert.ok(resource.issues.some((item) => item.reason === "resource_mismatch"));
});

test("unauthenticated entry checks keep normal challenges separate from protocol errors and rate limits", async () => {
  const result = await probeEntry(endpoint, "fixture", async (_, init) => {
    assert.equal(init.headers.authorization, undefined);
    assert.equal(JSON.parse(init.body).method, "initialize");
    return challenge();
  });
  assert.equal(result.outcome, "authentication_challenge");
  assert.equal(result.responseHeaders["x-request-id"], "fixture-server-id");
  const logical = await probeEntry(
    endpoint,
    "fixture",
    async () =>
      new Response(
        '{"jsonrpc":"2.0","error":{"code":-32999,"message":"Previously unseen negotiation failure","data":{"access_token":"private-token"}}}',
      ),
  );
  assert.equal(logical.status, 200);
  assert.equal(logical.outcome, "protocol_error");
  assert.equal(logical.protocolError.code, -32999);
  assert.match(logical.protocolError.message, /Previously unseen/);
  assert.ok(!JSON.stringify(logical).includes("private-token"));
  const limited = await probeEntry(
    endpoint,
    "fixture",
    async () =>
      new Response("Unfamiliar capacity response", {
        status: 429,
        headers: { "retry-after": "9" },
      }),
  );
  assert.equal(limited.outcome, "http_rejected");
  assert.equal(limited.responseHeaders["retry-after"], "9");
  assert.match(limited.responseError.message, /Unfamiliar/);
});

test("current text-log window excludes old errors and retains unclassified diagnostics with unknown times", async (t) => {
  const dir = await fixture(t);
  await mkdir(join(dir, "log"));
  await writeFile(
    join(dir, "log", "codex-tui.log"),
    [
      '2026-10-01T00:00:00Z WARN MCP server "chatcut" old fixture failure',
      '2026-10-22T11:55:00Z ERROR MCP server "chatcut" FLUXION_472: unknown schema negotiation',
      'MCP server "chatcut" completely unfamiliar provider message',
      '2026-10-22T11:59:00Z ERROR MCP server "chatcut_desktop" native fixture',
    ].join("\n"),
  );
  const result = await collectHostLogs("codex", { codexHome: dir, now: Date.parse(now) });
  assert.equal(result.entries.length, 2);
  assert.ok(!JSON.stringify(result).includes("old fixture"));
  assert.match(result.entries[0].message, /FLUXION_472/);
  assert.equal(result.entries[1].occurredAt, null);
  assert.ok(result.gaps.some((gap) => gap.reason === "records_with_unknown_time"));
});

test("a host snapshot preserves current-session tool absence without treating healthy probes as recovery", async (t) => {
  const dir = await fixture(t);
  const snapshotPath = join(dir, "current.mcp-snapshot.json");
  await writeFile(
    snapshotPath,
    JSON.stringify({
      schemaVersion: 1,
      observedAt: now,
      hostVersion: "fixture-host",
      configuration: {
        source: "host_settings",
        serverName: "chatcut",
        url: endpoint.href,
        enabled: true,
      },
      session: {
        source: "current_session",
        conversationId: "fixture-chat",
        connectionStatus: "failed",
        authStatus: "authenticated",
        visibleToolCount: 0,
        visibleTools: [],
      },
      observations: [
        {
          stage: "initialize",
          operation: "initialize",
          source: "runtime_log",
          observedAt: now,
          outcome: "failed",
          requestId: "original-request-if-present",
          message: "Original initialize authentication failure",
        },
        {
          stage: "future_negotiation",
          source: "runtime_log",
          observedAt: now,
          outcome: "failed",
          protocolCode: -32999,
          message: "Previously unseen failure",
        },
      ],
    }),
  );
  const { report } = await runDoctor(
    {
      host: "codex",
      serverUrl: endpoint.href,
      hostSnapshot: snapshotPath,
      output: join(dir, "report.json"),
    },
    dependencies,
  );
  assert.equal(report.hostSnapshot.session.visibleToolCount, 0);
  assert.equal(report.hostVersion, "fixture-host");
  assert.equal(report.entryProbe.outcome, "authentication_challenge");
  assert.equal(report.evidenceSummary.recoveryVerified, false);
  assert.equal(report.evidenceSummary.otherObservations[0].protocolCode, -32999);
  assert.equal(
    report.evidenceSummary.stages.find((item) => item.stage === "tools_list").status,
    "not_observed",
  );
  assert.match(
    report.evidenceSummary.stages.find((item) => item.stage === "initialize").observations[0]
      .message,
    /Original/,
  );
});

test("snapshot rejects credentials, wrong endpoints and static-configuration claims about current tools", () => {
  const base = { schemaVersion: 1, observedAt: now };
  assert.throws(
    () => validateSnapshot({ ...base, access_token: "secret" }, endpoint),
    /unsupported fields/,
  );
  assert.throws(
    () =>
      validateSnapshot(
        {
          ...base,
          configuration: {
            source: "host_settings",
            serverName: "chatcut",
            url: "https://api.chatcut.dev/api/external-mcp/mcp",
            enabled: true,
          },
        },
        endpoint,
      ),
    /differs/,
  );
  assert.throws(
    () =>
      validateSnapshot(
        {
          ...base,
          session: {
            source: "cli_configuration",
            connectionStatus: "connected",
            authStatus: "authenticated",
            visibleToolCount: 10,
          },
        },
        endpoint,
      ),
    /Static CLI/,
  );
});

test("disabled hosted connections produce a local report without any probe or upload", async (t) => {
  const dir = await fixture(t);
  const snapshotPath = join(dir, "disabled.mcp-snapshot.json");
  await writeFile(
    snapshotPath,
    JSON.stringify({
      schemaVersion: 1,
      observedAt: now,
      configuration: {
        source: "host_settings",
        serverName: "chatcut",
        url: endpoint.href,
        enabled: false,
      },
    }),
  );
  const { report, path } = await runDoctor(
    {
      host: "codex",
      serverUrl: endpoint.href,
      hostSnapshot: snapshotPath,
      upload: true,
      output: join(dir, "report.json"),
    },
    {
      ...dependencies,
      fetchImpl: () => {
        throw new Error("No network request should run");
      },
    },
  );
  assert.equal(report.probes.length, 0);
  assert.equal(report.upload.status, "skipped_intentionally_disabled");
  assert.ok(JSON.parse(await readFile(path)).gaps.some((gap) => gap.source === "probes"));
});

test("untrusted challenge metadata cannot redirect diagnosis to a different origin", async (t) => {
  const dir = await fixture(t);
  const requested = [];
  const { report } = await runDoctor(
    {
      host: "claude",
      serverUrl: endpoint.href,
      output: join(dir, "report.json"),
    },
    {
      ...dependencies,
      fetchImpl: async (url) => {
        requested.push(url);
        return url === endpoint.href
          ? new Response("{}", {
              status: 401,
              headers: {
                "www-authenticate":
                  'Bearer resource_metadata="https://untrusted.example/.well-known/oauth-protected-resource"',
              },
            })
          : metadata(url);
      },
    },
  );
  assert.ok(requested.every((url) => new URL(url).origin === endpoint.origin));
  assert.ok(report.gaps.some((gap) => gap.source === "challenge_metadata_target"));
  assert.ok(report.evidenceSummary.gaps.includes("current_host_snapshot_unavailable"));
});

test("an unavailable registered URL still permits a local evidence report with no silent production fallback", async (t) => {
  const dir = await fixture(t);
  const { report, path } = await runDoctor(
    {
      host: "codex",
      output: join(dir, "report.json"),
      upload: true,
    },
    {
      ...dependencies,
      fetchImpl: () => {
        throw new Error("No endpoint was selected");
      },
    },
  );
  assert.equal(report.serverUrl, null);
  assert.equal(report.upload.status, "skipped_endpoint_unavailable");
  assert.equal(report.probes.length, 0);
  assert.ok(
    JSON.parse(await readFile(path)).gaps.some((gap) =>
      /registered_endpoint_unavailable/.test(gap.reason ?? ""),
    ),
  );
});

test("missing path metadata checks the root fallback without turning later success into original recovery", async (t) => {
  const dir = await fixture(t);
  const { report } = await runDoctor(
    {
      host: "codex",
      serverUrl: endpoint.href,
      output: join(dir, "report.json"),
    },
    {
      ...dependencies,
      fetchImpl: async (url) => {
        if (url === endpoint.href)
          return new Response("{}", {
            status: 401,
            headers: {
              "www-authenticate":
                "Bearer resource_metadata=" +
                endpoint.origin +
                "/.well-known/oauth-protected-resource",
            },
          });
        if (url.endsWith("/oauth-protected-resource/api/external-mcp/mcp"))
          return new Response("{}", { status: 404 });
        return metadata(url);
      },
    },
  );
  assert.ok(
    report.probes.some(
      (probe) =>
        probe.url.endsWith("/oauth-protected-resource") && probe.outcome === "metadata_read",
    ),
  );
  assert.equal(report.evidenceSummary.recoveryVerified, false);
});

test("direct TLS context has a bounded timeout and states that it differs from the host route", async (t) => {
  const server = createServer((socket) => {
    socket.on("error", () => {});
    socket.resume();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const result = await inspectTransport(new URL("https://127.0.0.1:" + server.address().port));
  assert.equal(result.status, "failed");
  assert.equal(result.error.code, "ETIMEDOUT");
  assert.match(result.route, /does_not_reproduce_host/);
});

test("an unexpected probe collector failure cannot erase the original incident or prevent a local report", async (t) => {
  const dir = await fixture(t);
  const original = join(dir, "original.txt");
  await writeFile(original, "Original unfamiliar MCP failure E_ORIGINAL_472");
  const deepDocument = '{"resource":' + "[".repeat(9000) + "0" + "]".repeat(9000) + "}";
  const { report, path } = await runDoctor(
    {
      host: "codex",
      serverUrl: endpoint.href,
      originalError: original,
      output: join(dir, "report.json"),
    },
    {
      ...dependencies,
      fetchImpl: async (url) => (url === endpoint.href ? challenge() : new Response(deepDocument)),
    },
  );
  assert.match(report.originalFailure.message, /E_ORIGINAL_472/);
  assert.ok(report.probes.some((probe) => probe.stage === "probe_collector"));
  assert.match(JSON.parse(await readFile(path)).originalFailure.message, /E_ORIGINAL_472/);
});

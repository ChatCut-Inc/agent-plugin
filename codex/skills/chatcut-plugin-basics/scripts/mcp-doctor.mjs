import { randomUUID, createHash } from "node:crypto";
import { open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir, platform, arch } from "node:os";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const READ_LIMIT = 128 * 1024;
const UPLOAD_LIMIT = 256 * 1024;
const TIMEOUT_MS = 3500;
const CHATCUT_MESSAGE =
  /server_name="?chatcut(?:["\s}:]|$)|(?:MCP server|Server)\s*["': ]+(?:plugin:chatcut:)?chatcut(?:["': ]|$)|https:\/\/api\.chatcut\.(?:io|dev|org)\//i;

export function redact(text) {
  return String(text)
    .replace(/\bBearer\s+(?!(?:token|required)\b|<)[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(Authorization\s*[:=]\s*Basic\s+)[A-Za-z0-9+/=]+/gi, "$1[REDACTED]")
    .replace(/\b((?:set-)?cookie\s*[:=]\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/\bchatcut_live_[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(
      /([?&](?:code|state|token|access_token|refresh_token|id_token|client_secret)=)[^&\s"<>]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /("(?:access_?token|refresh_?token|id_?token|client_?secret|session_?token|api[_-]?key|authorization|token|cookie|set-cookie)"\s*:\s*")[^"]*/gi,
      "$1[REDACTED]",
    )
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@");
}

function clean(value) {
  return JSON.parse(
    JSON.stringify(value, (_, item) => (typeof item === "string" ? redact(item) : item)),
  );
}

export function errorDetails(error, seen = new Set()) {
  if (!error || typeof error !== "object") return { message: redact(error) };
  if (seen.has(error) || seen.size >= 8) return { unavailable: "error_chain_depth_or_cycle" };
  seen.add(error);
  const result = {};
  for (const key of ["name", "message", "code", "errno", "syscall", "stack"]) {
    if (typeof error[key] === "string" || typeof error[key] === "number") result[key] = error[key];
  }
  if (error.cause) result.cause = errorDetails(error.cause, seen);
  if (Array.isArray(error.errors)) {
    result.errors = error.errors.slice(0, 8).map((item) => errorDetails(item, seen));
    if (error.errors.length > 8) result.omittedErrors = error.errors.length - 8;
  }
  return clean(result);
}

export function serverUrl(value) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const hosted = ["api.chatcut.io", "api.chatcut.dev", "api-dev.chatcut.org"].includes(
    url.hostname,
  );
  if (
    (!local && (!hosted || url.protocol !== "https:" || (url.port && url.port !== "443"))) ||
    (local && !["http:", "https:"].includes(url.protocol)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/api\/external-mcp\/(?:mcp|claude|v2\/mcp)\/?$/.test(url.pathname)
  ) {
    throw new Error(
      "Unsupported registered MCP URL; preserve its configuration and report unsupported_endpoint",
    );
  }
  return url;
}

async function limitedBody(response, limit = READ_LIMIT) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const parts = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(parts).toString("utf8");
      bytes += value.length;
      if (bytes > limit) {
        const error = new Error(`Response exceeds ${limit} bytes; body not retained`);
        error.code = "DIAGNOSTIC_BODY_LIMIT";
        throw error;
      }
      parts.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function probeMetadata(url, diagnosticId, fetchImpl = fetch) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = {
    evidenceKind: "later_probe",
    url,
    startedAt,
    implementation: `node-fetch/${process.version}`,
    stage: "request",
    status: null,
    bodyComplete: false,
    jsonValid: null,
    originalAttemptMatch: "unconfirmed",
  };
  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json", "x-chatcut-diagnostic-id": diagnosticId },
    });
    result.status = response.status;
    result.responseHeaders = {};
    for (const key of [
      "content-type",
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "server",
      "via",
      "x-request-id",
      "x-amzn-trace-id",
    ]) {
      const value = response.headers.get(key);
      if (value !== null) result.responseHeaders[key] = value;
    }
    result.stage = "response_body";
    const body = await limitedBody(response);
    result.bodyComplete = true;
    result.bodyBytes = Buffer.byteLength(body);
    result.bodySha256 = createHash("sha256").update(body).digest("hex");
    result.stage = "json_parse";
    try {
      const parsed = JSON.parse(body);
      result.jsonValid = true;
      result.metadataShape = {
        object: parsed !== null && typeof parsed === "object" && !Array.isArray(parsed),
        issuerPresent: typeof parsed?.issuer === "string",
        resourcePresent: typeof parsed?.resource === "string",
      };
    } catch (error) {
      result.jsonValid = false;
      throw error;
    }
    result.stage = "complete";
    const required = new URL(url).pathname.includes("oauth-protected-resource")
      ? "resourcePresent"
      : "issuerPresent";
    result.outcome = !response.ok
      ? "http_rejected"
      : result.metadataShape.object && result.metadataShape[required]
        ? "metadata_read"
        : "invalid_metadata_shape";
  } catch (error) {
    result.outcome = "failed";
    result.error = errorDetails(error);
  }
  result.durationMs = Date.now() - started;
  return clean(result);
}

function logMessage(body) {
  const marker = body.lastIndexOf("}:");
  return (marker < 0 ? body : body.slice(marker + 2)).trim();
}

async function textLog(path, source, gaps) {
  const handle = await open(path, "r");
  try {
    const info = await handle.stat();
    const start = Math.max(0, info.size - READ_LIMIT);
    const buffer = Buffer.alloc(Math.min(info.size, READ_LIMIT));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
    const lines = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/);
    if (start) {
      lines.shift();
      gaps.push({ source, reason: "only_log_tail_read", bytesBeforeWindow: start });
    }
    const entries = [];
    for (let i = 0; i < lines.length; i++) {
      if (
        !CHATCUT_MESSAGE.test(lines[i]) ||
        /function_call|tool_call|tool result|prompt|transcript|"method"\s*:\s*"tools\/call"/i.test(
          lines[i],
        ) ||
        !/connect|oauth|authenticat|metadata|handshak|initializ|tools\/list|tool catalog/i.test(
          lines[i],
        )
      )
        continue;
      const block = [lines[i]];
      while (i + 1 < lines.length && /^(?:\s+|Caused by:|Error:)/.test(lines[i + 1]))
        block.push(lines[++i]);
      entries.push({
        source,
        message: redact(block.join("\n")),
        originalAttemptMatch: "unconfirmed",
      });
    }
    if (entries.length > 30)
      gaps.push({ source, reason: "log_record_limit", omitted: entries.length - 30 });
    return entries.slice(-30);
  } finally {
    await handle.close();
  }
}

export async function collectHostLogs(host, options = {}) {
  const userHome = options.home ?? homedir();
  const gaps = [];
  const entries = [];
  const now = options.now ?? Date.now();
  const center = options.occurredAt ? Date.parse(options.occurredAt) : now;
  const since = Math.floor((center - (options.occurredAt ? 15 : 30) * 60_000) / 1000);
  const until = Math.floor(Math.min(now, center + 15 * 60_000) / 1000);
  if (host === "codex") {
    const root = options.codexHome ?? process.env.CODEX_HOME ?? join(userHome, ".codex");
    let db;
    try {
      await stat(join(root, "logs_2.sqlite"));
      const { DatabaseSync } = await import("node:sqlite");
      db = new DatabaseSync(join(root, "logs_2.sqlite"), { readOnly: true, timeout: 1000 });
      db.exec("PRAGMA query_only=ON");
      const rows = db
        .prepare(
          "SELECT id,ts,level,target,feedback_log_body FROM logs WHERE ts>=? AND ts<=? AND (target LIKE 'codex_mcp%' OR target LIKE 'rmcp%') AND feedback_log_body LIKE '%chatcut%' ORDER BY ts DESC LIMIT 200",
        )
        .all(since, until);
      for (const row of rows) {
        const message = logMessage(row.feedback_log_body ?? "");
        const original = row.feedback_log_body ?? "";
        if (!CHATCUT_MESSAGE.test(original) || /server_name="?chatcut_desktop/.test(original))
          continue;
        if (
          !["ERROR", "WARN"].includes(row.level) &&
          !/omitting MCP server|cached MCP catalog/.test(message)
        )
          continue;
        entries.push({
          source: "codex_runtime_sqlite",
          rowId: row.id,
          occurredAt: new Date(row.ts * 1000).toISOString(),
          target: row.target,
          level: row.level,
          message: redact(message),
          originalAttemptMatch: "unconfirmed",
        });
        if (entries.length === 30) break;
      }
      if (rows.length === 200 || entries.length === 30)
        gaps.push({ source: "codex_runtime_sqlite", reason: "log_record_limit" });
    } catch (error) {
      gaps.push({
        source: "codex_runtime_sqlite",
        reason: "unavailable",
        error: errorDetails(error),
      });
    } finally {
      db?.close();
    }
    try {
      entries.push(...(await textLog(join(root, "log", "codex-tui.log"), "codex_tui_log", gaps)));
    } catch (error) {
      gaps.push({ source: "codex_tui_log", reason: "unavailable", error: errorDetails(error) });
    }
  } else {
    const root =
      options.claudeConfigDir ?? process.env.CLAUDE_CONFIG_DIR ?? join(userHome, ".claude");
    try {
      const dir = join(root, "debug");
      const names = await readdir(dir, { withFileTypes: true });
      const files = [];
      const deadline = Date.now() + 1500;
      for (const item of names) {
        if (Date.now() > deadline) {
          gaps.push({ source: "claude_debug_log", reason: "directory_scan_deadline" });
          break;
        }
        if (!item.isFile() || !item.name.endsWith(".txt")) continue;
        const path = join(dir, item.name);
        const info = await stat(path);
        if (info.mtimeMs >= since * 1000) files.push({ path, modified: info.mtimeMs });
      }
      files.sort((a, b) => b.modified - a.modified);
      for (const item of files.slice(0, 3))
        entries.push(...(await textLog(item.path, "claude_debug_log", gaps)));
      if (files.length > 3)
        gaps.push({
          source: "claude_debug_log",
          reason: "log_file_limit",
          omitted: files.length - 3,
        });
    } catch (error) {
      gaps.push({ source: "claude_debug_log", reason: "unavailable", error: errorDetails(error) });
    }
  }
  if (!entries.length)
    gaps.push({ source: "host_logs", reason: "no_matching_records_in_bounded_window" });
  return clean({
    entries,
    gaps,
    window: {
      since: new Date(since * 1000).toISOString(),
      until: new Date(until * 1000).toISOString(),
    },
  });
}

export function fragmentEvents(report) {
  const json = JSON.stringify(clean(report));
  if (Buffer.byteLength(json) > UPLOAD_LIMIT)
    throw new Error("Report exceeds upload budget; complete local report retained");
  const chunks = [];
  let chunk = "";
  let bytes = 0;
  for (const char of json) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 4096) {
      chunks.push(chunk);
      chunk = "";
      bytes = 0;
    }
    chunk += char;
    bytes += size;
  }
  if (chunk) chunks.push(chunk);
  const sha256 = createHash("sha256").update(json).digest("hex");
  return chunks.map((fragment, fragmentIndex) => ({
    name: "mcp.doctor.report_fragment",
    properties: {
      diagnosticId: report.diagnosticId,
      schemaVersion: report.schemaVersion,
      collectedAt: report.collectedAt,
      host: report.host,
      scope: "cloud",
      fragmentIndex,
      fragmentCount: chunks.length,
      reportSha256: sha256,
      fragment,
    },
  }));
}

export async function runDoctor(options, dependencies = {}) {
  if (!["codex", "claude"].includes(options.host))
    throw new Error("--host must be codex or claude");
  const endpoint = serverUrl(options.serverUrl);
  if (
    options.occurredAt &&
    (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(options.occurredAt) ||
      !Number.isFinite(Date.parse(options.occurredAt)))
  ) {
    throw new Error("--occurred-at must be an ISO timestamp with timezone; omit it when unknown");
  }
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const diagnosticId = randomUUID();
  const report = {
    schemaVersion: 1,
    collectorVersion: "1.0.0",
    diagnosticId,
    collectedAt: new Date().toISOString(),
    scope: "cloud",
    host: options.host,
    hostVersion: options.hostVersion ?? null,
    hostVersionSource: options.hostVersion ? "agent_supplied" : "unavailable",
    environment: {
      platform: platform(),
      architecture: arch(),
      nodeVersion: process.version,
      proxyEnvironmentPresent: [
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
      ].some((key) => Boolean(process.env[key])),
      probeProxyPolicy: "node_fetch_default; host_transport_not_reproduced",
    },
    serverUrl: endpoint.href,
    originalFailure: {
      evidenceKind: "original_failure",
      occurredAt: options.occurredAt ?? null,
      source: "agent_supplied_error_file",
      status: "unavailable",
    },
    probes: [],
    gaps: [],
    outcome: "diagnosis_only; original_connection_recovery_unverified",
    coverage: "triggered_diagnostics_only; not_all_users_or_all_failures",
    correlation:
      "diagnosticId identifies this report and later probes, not the original host request",
  };
  try {
    const manifest =
      options.host === "codex"
        ? "../../../.codex-plugin/plugin.json"
        : "../../../.claude-plugin/plugin.json";
    report.pluginVersion = JSON.parse(
      await readFile(new URL(manifest, import.meta.url), "utf8"),
    ).version;
    report.pluginVersionSource =
      "collector_package_manifest; installed_host_plugin_not_independently_verified";
  } catch (error) {
    report.gaps.push({ source: "plugin_version", error: errorDetails(error) });
  }
  if (options.originalError) {
    try {
      if (!/\.(?:txt|log)$/i.test(basename(String(options.originalError)))) {
        throw new Error(
          "Original error must be a dedicated .txt or .log file; credential/config/session files are not inputs",
        );
      }
      const info = await stat(options.originalError);
      if (info.size > 64 * 1024)
        throw new Error("Original error file exceeds 64 KiB; source file retained without reading");
      report.originalFailure.message = redact(await readFile(options.originalError, "utf8"));
      report.originalFailure.status = "recorded";
    } catch (error) {
      report.gaps.push({
        source: "original_failure",
        reason: "unavailable",
        error: errorDetails(error),
      });
    }
  } else
    report.gaps.push({
      source: "original_failure",
      reason: "not_provided; do_not_invent_original_error",
    });
  try {
    report.hostLogs = await (dependencies.collectLogs ?? collectHostLogs)(options.host, {
      occurredAt: options.occurredAt,
    });
  } catch (error) {
    report.hostLogs = {
      entries: [],
      gaps: [{ source: "host_logs", reason: "collector_failed", error: errorDetails(error) }],
    };
  }
  const resource = endpoint.pathname.replace(/\/$/, "");
  for (const path of [
    `/.well-known/oauth-protected-resource${resource}`,
    `/.well-known/oauth-authorization-server${resource}`,
    "/.well-known/oauth-authorization-server",
  ]) {
    report.probes.push(
      await probeMetadata(new URL(path, endpoint.origin).href, diagnosticId, fetchImpl),
    );
  }
  report.upload = { status: options.upload ? "pending" : "not_requested", storageVerified: false };
  const path = resolve(options.output ?? join(tmpdir(), `chatcut-mcp-doctor-${diagnosticId}.json`));
  const save = async (flag) =>
    writeFile(path, JSON.stringify(clean(report), null, 2) + "\n", { flag, mode: 0o600 });
  await save("wx");
  if (options.upload) {
    try {
      const events = fragmentEvents(report);
      const response = await fetchImpl(new URL("/telemetry/events", endpoint.origin).href, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "content-type": "application/json" },
        body: JSON.stringify(events),
      });
      const body = await limitedBody(response, 16 * 1024);
      if (!response.ok || JSON.parse(body).ok !== true)
        throw new Error(`Diagnostic ingest rejected: HTTP ${response.status}; ${body}`);
      report.upload = {
        status: "ingest_accepted",
        storageVerified: false,
        fragmentCount: events.length,
        reportSha256: events[0].properties.reportSha256,
      };
    } catch (error) {
      report.upload = { status: "failed", storageVerified: false, error: errorDetails(error) };
    }
    await save("w");
  }
  return { path, report: clean(report) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: {
        host: { type: "string" },
        "server-url": { type: "string" },
        "host-version": { type: "string" },
        "original-error": { type: "string" },
        "occurred-at": { type: "string" },
        output: { type: "string" },
        upload: { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    });
    if (values.help) {
      console.log(
        "node mcp-doctor.mjs --host codex|claude --server-url <registered URL> [--host-version <version>] [--original-error <error-only text file>] [--occurred-at <ISO timestamp>] [--output <new JSON path>] [--upload]",
      );
    } else {
      const { path, report } = await runDoctor({
        host: values.host,
        serverUrl: values["server-url"],
        hostVersion: values["host-version"],
        originalError: values["original-error"],
        occurredAt: values["occurred-at"],
        output: values.output,
        upload: values.upload,
      });
      console.log(
        JSON.stringify({
          diagnosticId: report.diagnosticId,
          path,
          upload: report.upload,
          recoveryVerified: false,
        }),
      );
    }
  } catch (error) {
    console.error(JSON.stringify({ doctorFailed: true, error: errorDetails(error) }));
    process.exitCode = 1;
  }
}

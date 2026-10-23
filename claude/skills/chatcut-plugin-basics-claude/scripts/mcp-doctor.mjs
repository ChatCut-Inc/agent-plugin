import { randomUUID, createHash } from "node:crypto";
import { open, opendir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir, platform, arch } from "node:os";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { connect as connectTls } from "node:tls";
import { isIP } from "node:net";
import { evidenceSummary, inspectMetadata, logTime, validateSnapshot } from "./mcp-evidence.mjs";
import { probeMetadataWire } from "./mcp-wire.mjs";

const READ_LIMIT = 128 * 1024;
const UPLOAD_LIMIT = 256 * 1024;
const TIMEOUT_MS = 3500;
const CHATCUT_MESSAGE =
  /server_name="?chatcut(?:["\s}:]|$)|(?:MCP server|Server)\s*["': ]+(?:plugin:chatcut:)?chatcut(?:["': ]|$)|\bplugin(?:_name)?[=: "\t]+chatcut(?:@chatcut-inc)?(?:["\s}:]|$)|https:\/\/(?:api\.chatcut\.(?:io|dev)|api-dev\.chatcut\.org)\//i;
const TEXT_ECHO =
  /^(?:user (?:prompt|message)|assistant message|tool (?:call|result))\s*:|^(?:function_call(?:_output)?|tool_call(?:_output)?)\s*:?\s*[{[]/i;

function redactFieldValue(_match, prefix, value) {
  if (!value) return prefix;
  const quote = value.match(/^\\*["']/)?.[0];
  return prefix + (quote ? quote + "[REDACTED]" + quote : "[REDACTED]");
}

export function redact(text) {
  return String(text)
    .replace(
      /\bBearer\s+(?!(?:token|required)\b|<|(?:realm|scope|error(?:_description|_uri)?|resource_metadata)\s*=)[A-Za-z0-9._~+/=-]+/gi,
      "Bearer [REDACTED]",
    )
    .replace(/\b(Authorization\s*[:=]\s*Basic\s+)[A-Za-z0-9+/=]+/gi, "$1[REDACTED]")
    .replace(
      /\b((?:set-)?cookie\s*[:=]\s*)("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|\\+"[^"\\\r\n]*\\+"|\\+'[^'\\\r\n]*\\+'|\[REDACTED\]|(?:(?![\r\n]|(?<!\\)\\+[rn]).)*)/gi,
      redactFieldValue,
    )
    .replace(/\bchatcut_live_[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(
      /([?&](?:code|state|token|access_token|refresh_token|id_token|client_secret|code_verifier|client_assertion|api[_-]?key|signature|sig|x-amz-(?:signature|credential|security-token))=)[^&\s"<>]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /\b((?:access_?token|refresh_?token|id_?token|session_?token|client_?secret|api[_-]?key|token)\s*[:=]\s*)("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|\\+"[^"\\\r\n]*\\+"|\\+'[^'\\\r\n]*\\+'|[A-Za-z0-9._~+/=-]+)/gi,
      redactFieldValue,
    )
    .replace(
      /((?:\\*["'])(?:access_?token|refresh_?token|id_?token|client_?secret|session_?token|api[_-]?key|authorization|token|cookie|set-cookie)(?:\\*["'])\s*[:=]\s*(?:\\*["']))[^"'\\\r\n]*/gi,
      "$1[REDACTED]",
    )
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[REDACTED]@");
}

function clean(value) {
  return JSON.parse(
    JSON.stringify(value, (key, item) =>
      /^(?:access_?token|refresh_?token|id_?token|client_?secret|session_?token|api[_-]?key|authorization|token|cookie|set-cookie)$/i.test(
        key,
      )
        ? "[REDACTED]"
        : typeof item === "string"
          ? redact(item)
          : item,
    ),
  );
}

export function errorDetails(error, seen = new Set()) {
  if (!error || typeof error !== "object") return { message: redact(error) };
  if (seen.has(error) || seen.size >= 8) return { unavailable: "error_chain_depth_or_cycle" };
  seen.add(error);
  const result = {};
  for (const key of ["name", "message", "code", "errno", "errcode", "errstr", "syscall", "stack"]) {
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

export async function probeMetadata(url, diagnosticId, fetchImpl = fetch, expected = {}) {
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
      "www-authenticate",
      "retry-after",
      "location",
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
      result.metadataValidation = inspectMetadata(parsed, url, expected);
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
        ? result.metadataValidation.valid
          ? "metadata_read"
          : "invalid_metadata"
        : "invalid_metadata_shape";
  } catch (error) {
    result.outcome = "failed";
    result.error = errorDetails(error);
  }
  result.durationMs = Date.now() - started;
  return clean(result);
}

async function guardProbe(url, operation) {
  const startedAt = new Date().toISOString();
  try {
    return await operation();
  } catch (error) {
    return {
      evidenceKind: "later_probe",
      url,
      startedAt,
      outcome: "failed",
      stage: "probe_collector",
      status: null,
      originalAttemptMatch: "unconfirmed",
      error: errorDetails(error),
      gap: "partial_probe_evidence_unavailable; original_failure_retained",
    };
  }
}

export async function probeEntry(endpoint, diagnosticId, fetchImpl = fetch) {
  const started = Date.now();
  const result = {
    evidenceKind: "later_probe",
    url: endpoint.href,
    method: "POST",
    operation: "initialize",
    implementation: "node-fetch/" + process.version,
    startedAt: new Date().toISOString(),
    stage: "request",
    status: null,
    originalAttemptMatch: "unconfirmed",
    credentialsSent: false,
  };
  try {
    const response = await fetchImpl(endpoint.href, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-chatcut-diagnostic-id": diagnosticId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: diagnosticId,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "chatcut-mcp-doctor", version: "1.2.2" },
        },
      }),
    });
    result.status = response.status;
    result.responseHeaders = {};
    for (const name of [
      "content-type",
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "www-authenticate",
      "retry-after",
      "location",
      "x-request-id",
      "x-amzn-trace-id",
      "server",
      "via",
    ]) {
      const value = response.headers.get(name);
      if (value !== null) result.responseHeaders[name] = value;
    }
    result.stage = "response_body";
    const body = await limitedBody(response);
    result.bodyComplete = true;
    result.bodyBytes = Buffer.byteLength(body);
    result.bodySha256 = createHash("sha256").update(body).digest("hex");
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      result.parseError = errorDetails(error);
      if (!response.ok) result.responseError = { message: redact(body) };
    }
    if (parsed?.error) result.protocolError = clean(parsed.error);
    if (response.status === 401) {
      const header = response.headers.get("www-authenticate") ?? "";
      const metadataHint = header.match(/resource_metadata\s*=\s*(?:"([^"]+)"|([^,\s]+))/i);
      result.resourceMetadataUrl = metadataHint?.[1] ?? metadataHint?.[2] ?? null;
      result.outcome = /\bBearer\b/i.test(header)
        ? "authentication_challenge"
        : "missing_authentication_challenge";
    } else if (!response.ok) result.outcome = "http_rejected";
    else if (parsed?.error) result.outcome = "protocol_error";
    else if (parsed?.jsonrpc === "2.0" && typeof parsed.result?.protocolVersion === "string") {
      result.outcome = "anonymous_initialize_returned";
      result.serverInfo = parsed.result.serverInfo;
      result.protocolVersion = parsed.result.protocolVersion;
    } else result.outcome = "invalid_initialize_response";
    result.stage = "complete";
  } catch (error) {
    result.outcome = "failed";
    result.error = errorDetails(error);
  }
  result.durationMs = Date.now() - started;
  return clean(result);
}

export function inspectTransport(endpoint) {
  if (endpoint.protocol !== "https:")
    return Promise.resolve({ status: "not_applicable", reason: "not_tls" });
  return new Promise((resolveProbe) => {
    const startedAt = new Date().toISOString();
    let settled = false;
    const host = endpoint.hostname.replace(/^\[|\]$/g, "");
    const socket = connectTls({
      host,
      port: Number(endpoint.port || 443),
      rejectUnauthorized: true,
      servername: isIP(host) ? undefined : host,
    });
    const finish = (details) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolveProbe(
        clean({
          evidenceKind: "later_probe",
          implementation: "node:tls",
          startedAt,
          route: "direct_tls; does_not_reproduce_host_or_fetch_proxy_route",
          originalAttemptMatch: "unconfirmed",
          ...details,
        }),
      );
    };
    const timer = setTimeout(
      () =>
        finish({
          status: "failed",
          error: {
            name: "TimeoutError",
            message: "Direct TLS context timed out",
            code: "ETIMEDOUT",
          },
        }),
      TIMEOUT_MS,
    );
    socket.once("secureConnect", () => {
      const certificate = socket.getPeerCertificate();
      finish({
        status: "observed",
        tlsProtocol: socket.getProtocol(),
        authorized: socket.authorized,
        certificate: {
          issuer: certificate.issuer,
          validFrom: certificate.valid_from,
          validTo: certificate.valid_to,
          fingerprint256: certificate.fingerprint256,
        },
      });
    });
    socket.once("error", (error) => finish({ status: "failed", error: errorDetails(error) }));
  });
}

function logMessage(body) {
  const marker = body.lastIndexOf("}:");
  return (marker < 0 ? body : body.slice(marker + 2)).trim();
}

function hostedTextRecord(line) {
  if (/^\s/.test(line)) return false;
  let body = line.replace(
    /^\d{4}-\d{2}-\d{2}T\S+\s+(?:(?:\[(?:TRACE|DEBUG|INFO|WARN|ERROR)\]|TRACE|DEBUG|INFO|WARN|ERROR)\s+)?/i,
    "",
  );
  const module = body.match(/^([A-Za-z_]\w*(?:::\w+)+):\s*/);
  if (module) {
    if (
      !/^(?:codex_(?:mcp|rmcp_client|plugins|core(?:::|_)plugins)(?:::|$)|rmcp::)/.test(module[1])
    )
      return false;
    body = body.slice(module[0].length);
  }
  if (
    /^(?:user(?: prompt| message)?|assistant(?: message)?|system|developer|transcript)\s*:|^[{[]/i.test(
      body,
    )
  )
    return false;
  const scope = body.match(
    /^(?:MCP server|Server)\s+(?:"([^"]+)"|'([^']+)'|((?:plugin:[\w.-]+:)?[\w.-]+))(?::\s*|\s+|$)/i,
  );
  const context = body.split(/\berror\s*=/i)[0];
  const server =
    context.match(/\bserver_name=["']?([\w:.-]+)/)?.[1] ?? scope?.[1] ?? scope?.[2] ?? scope?.[3];
  if (server && !["chatcut", "plugin:chatcut:chatcut"].includes(server)) return false;
  if (!CHATCUT_MESSAGE.test(body)) return false;
  if (/\bmethod=["']?tools\/call(?:["'\s}]|$)/.test(context)) return false;
  const message = scope ? body.slice(scope[0].length) : body;
  // Runtime error contents can name tools; only explicit echo records are excluded.
  if (TEXT_ECHO.test(message)) return false;
  if (
    /^(?:Sending|Sent|Received|Receiving)\s+(?:MCP\s+|JSON-RPC\s+)?(?:request|response|message)\b/i.test(
      message,
    ) &&
    /"method"\s*:\s*"tools\/call"|"result"\s*:\s*\{\s*"content"\s*:/i.test(message)
  )
    return false;
  if (/^[{[]/.test(message)) {
    try {
      const value = JSON.parse(message);
      const records = Array.isArray(value) ? value : [value];
      if (
        records.some(
          (record) =>
            record &&
            (record.method === "tools/call" ||
              [
                "function_call",
                "function_call_output",
                "tool_call",
                "tool_result",
                "user",
                "assistant",
                "user_message",
                "assistant_message",
              ].includes(record.type) ||
              ["user", "assistant", "system", "developer"].includes(record.role) ||
              Array.isArray(record.result?.content)),
        )
      )
        return false;
    } catch {
      // Unparseable diagnostic text is not proof of a tool or conversation envelope.
    }
  }
  return true;
}

async function textLog(path, source, gaps, window, select = hostedTextRecord) {
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
      if (!select(lines[i])) continue;
      const block = [lines[i]];
      while (
        source !== "codex_app_log" &&
        i + 1 < lines.length &&
        /^(?:\s+|Caused by:|Error:)/.test(lines[i + 1]) &&
        !/^\s*(?:\d{4}-\d{2}-\d{2}T|MCP server\s|Server\s|\[(?:TRACE|DEBUG|INFO|WARN|ERROR)\])/i.test(
          lines[i + 1],
        ) &&
        !TEXT_ECHO.test(lines[i + 1].trimStart())
      )
        block.push(lines[++i]);
      const occurredAt = logTime(block[0]);
      if (
        occurredAt &&
        (Date.parse(occurredAt) < window.since * 1000 ||
          Date.parse(occurredAt) > window.until * 1000)
      )
        continue;
      entries.push({
        source,
        sourceFile: basename(path),
        occurredAt,
        timeStatus: occurredAt ? "within_requested_window" : "unknown; not_confirmed_within_window",
        message: redact(block.join("\n")),
        originalAttemptMatch: "unconfirmed",
      });
    }
    if (entries.length > 30)
      gaps.push({ source, reason: "log_record_limit", omitted: entries.length - 30 });
    const unknownTimes = entries.filter((entry) => !entry.occurredAt).length;
    if (unknownTimes)
      gaps.push({ source, reason: "records_with_unknown_time", count: unknownTimes });
    return entries.slice(-30);
  } finally {
    await handle.close();
  }
}

async function codexAppLogs(root, gaps, window, conversationId) {
  const files = [];
  const dates = new Set();
  for (const time of [window.since * 1000, window.until * 1000]) {
    const date = new Date(time);
    dates.add(date.toISOString().slice(0, 10).replaceAll("-", "/"));
    dates.add(
      [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map((value) => String(value).padStart(2, "0"))
        .join("/"),
    );
  }
  let scanned = 0;
  const deadline = Date.now() + 1500;
  for (const date of dates) {
    try {
      const dir = join(root, date);
      for await (const item of await opendir(dir)) {
        if (++scanned > 200 || Date.now() > deadline) {
          gaps.push({ source: "codex_app_log", reason: "directory_scan_limit" });
          break;
        }
        if (!item.isFile() || !/^codex-desktop-.*\.log$/.test(item.name)) continue;
        const path = join(dir, item.name);
        const info = await stat(path);
        if (info.mtimeMs >= window.since * 1000) files.push({ path, modified: info.mtimeMs });
      }
    } catch (error) {
      gaps.push({ source: "codex_app_log", reason: "unavailable", error: errorDetails(error) });
    }
    if (scanned > 200 || Date.now() > deadline) break;
  }
  files.sort((a, b) => b.modified - a.modified);
  const entries = [];
  let filesRead = 0;
  for (const file of files.slice(0, 3)) {
    try {
      // App logs mix unrelated UI activity with runtime notices, so accept only this native event.
      entries.push(
        ...(await textLog(file.path, "codex_app_log", gaps, window, (line) => {
          if (
            !/^\d{4}-\d{2}-\d{2}T\S+\s+\w+\s+\[AppServerConnection\] mcp_server_startup_status_updated\s/.test(
              line,
            )
          )
            return false;
          const server = [...line.matchAll(/(?:^|\s)server=([^\s]+)/g)].at(-1)?.[1];
          if (!["chatcut", "plugin:chatcut:chatcut"].includes(server)) return false;
          const thread = [...line.matchAll(/(?:^|\s)threadId=([^\s]+)/g)].at(-1)?.[1];
          return !conversationId || !thread || thread === "null" || thread === conversationId;
        })),
      );
      filesRead++;
    } catch (error) {
      gaps.push({ source: "codex_app_log", reason: "unavailable", error: errorDetails(error) });
    }
  }
  if (files.length > 3)
    gaps.push({ source: "codex_app_log", reason: "log_file_limit", omitted: files.length - 3 });
  if (entries.length > 30)
    gaps.push({
      source: "codex_app_log",
      reason: "log_record_limit",
      omitted: entries.length - 30,
    });
  return {
    entries: entries
      .sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? ""))
      .slice(-30),
    scan: {
      directoryEntriesScanned: scanned,
      matchingFiles: files.length,
      filesRead,
      maximumTailBytesPerFile: READ_LIMIT,
      currentConversationFilterApplied: Boolean(conversationId),
    },
  };
}

async function inspectSqliteAccess(path) {
  const files = {};
  for (const suffix of ["", "-wal", "-shm"]) {
    const name = suffix || "database";
    let handle;
    try {
      const info = await stat(path + suffix);
      handle = await open(path + suffix, "r");
      const header = Buffer.alloc(suffix ? 1 : 20);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      files[name] = { exists: true, readable: true, bytes: info.size };
      if (
        !suffix &&
        bytesRead === 20 &&
        header.subarray(0, 16).toString() === "SQLite format 3\0"
      ) {
        files[name].journalMode = header[18] === 2 ? "wal" : "rollback";
      }
    } catch (error) {
      files[name] = { readable: false, error: errorDetails(error) };
    } finally {
      try {
        await handle?.close();
      } catch (error) {
        files[name].closeError = errorDetails(error);
      }
    }
  }
  return {
    files,
    interpretation:
      "File reads and SQLite WAL/shared-memory access are different operations; readable files do not prove SQLite access. No copy, checkpoint, immutable mode or permission change attempted.",
  };
}

export async function collectHostLogs(host, options = {}) {
  const userHome = options.home ?? homedir();
  const gaps = [];
  const entries = [];
  let appLog;
  const now = options.now ?? Date.now();
  const center = options.occurredAt ? Date.parse(options.occurredAt) : now;
  const since = Math.floor((center - (options.occurredAt ? 15 : 30) * 60_000) / 1000);
  const until = Math.min(now, center + 15 * 60_000) / 1000;
  if (host === "codex") {
    const root = options.codexHome ?? process.env.CODEX_HOME ?? join(userHome, ".codex");
    const sqliteRoot = options.codexSqliteHome ?? process.env.CODEX_SQLITE_HOME ?? root;
    const logRoot = options.codexLogDir ?? join(root, "log");
    const databasePath = join(sqliteRoot, "logs_2.sqlite");
    let db;
    try {
      await stat(databasePath);
      const { DatabaseSync } = await import("node:sqlite");
      db = new DatabaseSync(databasePath, { readOnly: true, timeout: 1000 });
      db.exec("PRAGMA query_only=ON");
      const rows = db
        .prepare(
          "SELECT id,ts,level,target,feedback_log_body FROM logs WHERE ts>=? AND ts<=? AND (target LIKE 'codex_mcp%' OR target LIKE 'rmcp%' OR target LIKE 'codex_plugins%' OR target LIKE 'codex_core::plugins%') AND feedback_log_body LIKE '%chatcut%' ORDER BY ts DESC LIMIT 200",
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
        locationSource: options.codexSqliteHome
          ? "explicit_host_location"
          : process.env.CODEX_SQLITE_HOME
            ? "CODEX_SQLITE_HOME"
            : "CODEX_HOME_default; sqlite_home_config_override_not_inspected",
        ...(platform() === "win32" && error?.errcode === 14
          ? { accessEvidence: await inspectSqliteAccess(databasePath) }
          : {}),
      });
    } finally {
      db?.close();
    }
    try {
      entries.push(
        ...(await textLog(join(logRoot, "codex-tui.log"), "codex_tui_log", gaps, {
          since,
          until,
        })),
      );
    } catch (error) {
      gaps.push({ source: "codex_tui_log", reason: "unavailable", error: errorDetails(error) });
    }
    const appData = options.localAppData ?? process.env.LOCALAPPDATA;
    const sandboxAppData =
      !options.localAppData &&
      /[\\/]Packages[\\/]sandbox\.[^\\/]+[\\/]AC(?:[\\/]|$)/i.test(appData ?? "");
    const appLogRoot =
      options.codexAppLogDir ??
      ((options.platform ?? platform()) === "win32"
        ? join(
            // MXC redirects LOCALAPPDATA; the running App logs stay in the user profile.
            (!sandboxAppData && appData) || join(userHome, "AppData", "Local"),
            "Codex",
            "Logs",
          )
        : null);
    if (appLogRoot) {
      const result = await codexAppLogs(appLogRoot, gaps, { since, until }, options.conversationId);
      entries.push(...result.entries);
      appLog = {
        ...result.scan,
        locationSource: options.codexAppLogDir ? "explicit_host_location" : "windows_default",
        sandboxLocalAppDataRedirected: Boolean(sandboxAppData),
      };
      if (!result.entries.length)
        gaps.push({ source: "codex_app_log", reason: "no_matching_records_in_bounded_window" });
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
        entries.push(...(await textLog(item.path, "claude_debug_log", gaps, { since, until })));
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
    ...(appLog ? { appLog } : {}),
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
  // Canonical fields and a map avoid growing the backend dataset's flat schema.
  return chunks.map((fragment, fragmentIndex) => ({
    name: "mcp.doctor.report_fragment",
    properties: {
      clientEventName: null,
      eventName: "mcp.doctor.report_fragment",
      attributes: {
        mcpDoctor: {
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
      },
    },
  }));
}

export async function runDoctor(options, dependencies = {}) {
  if (!["codex", "claude"].includes(options.host))
    throw new Error("--host must be codex or claude");
  const endpoint = options.serverUrl ? serverUrl(options.serverUrl) : null;
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
    schemaVersion: 2,
    collectorVersion: "1.2.2",
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
      noProxyEnvironmentPresent: Boolean(process.env.NO_PROXY || process.env.no_proxy),
      nodeUseEnvProxyRequested: process.env.NODE_USE_ENV_PROXY === "1",
      extraCaConfigured: Boolean(process.env.NODE_EXTRA_CA_CERTS),
      tlsVerificationDisabledInEnvironment: process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0",
    },
    serverUrl: endpoint?.href ?? null,
    originalFailure: {
      evidenceKind: "original_failure",
      occurredAt: options.occurredAt ?? null,
      source: "agent_supplied_error_file",
      status: "unavailable",
    },
    probes: [],
    wireProbes: [],
    gaps: [],
    outcome: "diagnosis_only; original_connection_recovery_unverified",
    coverage: "triggered_diagnostics_only; not_all_users_or_all_failures",
    correlation:
      "diagnosticId identifies this report and later probes, not the original host request",
  };
  let disabledBySnapshot = false;
  if (options.hostSnapshot) {
    try {
      if (!basename(String(options.hostSnapshot)).endsWith(".mcp-snapshot.json"))
        throw new Error(
          "Host snapshot must be a dedicated .mcp-snapshot.json file, never a credential/config file",
        );
      const info = await stat(options.hostSnapshot);
      if (info.size > READ_LIMIT) throw new Error("Host snapshot exceeds 128 KiB");
      const snapshot = JSON.parse(await readFile(options.hostSnapshot, "utf8"));
      disabledBySnapshot =
        snapshot?.configuration?.enabled === false ||
        snapshot?.session?.connectionStatus === "disabled";
      report.hostSnapshot = clean(validateSnapshot(snapshot, endpoint));
      report.hostSnapshotSource =
        "agent_supplied; see each field source; not_independently_verified";
      if (!report.hostVersion && report.hostSnapshot.hostVersion) {
        report.hostVersion = report.hostSnapshot.hostVersion;
        report.hostVersionSource = "agent_supplied_host_snapshot";
      }
    } catch (error) {
      report.gaps.push({
        source: "host_snapshot",
        reason: "unavailable",
        error: errorDetails(error),
        action:
          "Create a new dedicated snapshot with --create-snapshot <new.mcp-snapshot.json>; fill only observed facts, then --validate-snapshot <file> before collection. Do not rename or read a credential/config file.",
      });
    }
  }
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
      const message = await readFile(options.originalError, "utf8");
      if (!message.trim())
        throw new Error("Original error file is empty; original failure remains unavailable");
      report.originalFailure.message = redact(message);
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
      codexSqliteHome: options.codexSqliteHome,
      codexLogDir: options.codexLogDir,
      codexAppLogDir: options.codexAppLogDir,
      conversationId: report.hostSnapshot?.session?.conversationId ?? process.env.CODEX_THREAD_ID,
    });
  } catch (error) {
    report.hostLogs = {
      entries: [],
      gaps: [{ source: "host_logs", reason: "collector_failed", error: errorDetails(error) }],
    };
  }
  const disabled =
    disabledBySnapshot ||
    report.hostSnapshot?.configuration?.enabled === false ||
    report.hostSnapshot?.session?.connectionStatus === "disabled";
  if (disabled || !endpoint) {
    report.gaps.push({
      source: "probes",
      reason: disabled
        ? "host_reports_intentionally_disabled; no_requests_sent"
        : "registered_endpoint_unavailable; no_requests_sent",
    });
  } else {
    report.entryProbe = await guardProbe(endpoint.href, () =>
      probeEntry(endpoint, diagnosticId, fetchImpl),
    );
    const resource = endpoint.pathname.replace(/\/$/, "");
    const queue = [
      new URL("/.well-known/oauth-protected-resource" + resource, endpoint.origin).href,
      new URL("/.well-known/oauth-authorization-server" + resource, endpoint.origin).href,
      new URL("/.well-known/oauth-authorization-server", endpoint.origin).href,
    ];
    const enqueue = (value, label) => {
      try {
        const url = new URL(value);
        if (
          url.origin !== endpoint.origin ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          !url.pathname.startsWith("/.well-known/")
        )
          throw new Error(
            "Unsupported metadata target; no cross-origin or credential-bearing probes",
          );
        if (!queue.includes(url.href)) queue.push(url.href);
      } catch (error) {
        report.gaps.push({ source: label, error: errorDetails(error) });
      }
    };
    if (report.entryProbe.resourceMetadataUrl)
      enqueue(report.entryProbe.resourceMetadataUrl, "challenge_metadata_target");
    let issuer;
    for (let index = 0; index < queue.length && index < 5; index++) {
      const url = queue[index];
      const result = await guardProbe(url, () =>
        probeMetadata(url, diagnosticId, fetchImpl, {
          resource: endpoint.href,
          issuer: url.includes("oauth-authorization-server") ? issuer : undefined,
        }),
      );
      report.probes.push(result);
      if (url === queue[0] && result.outcome !== "metadata_read")
        enqueue(
          new URL("/.well-known/oauth-protected-resource", endpoint.origin).href,
          "root_resource_metadata_target",
        );
      const fields = result.metadataValidation?.fields;
      if (url.includes("oauth-protected-resource") && result.metadataValidation?.valid) {
        issuer = fields.authorization_servers[0];
        const auth = new URL(issuer);
        enqueue(
          new URL(
            "/.well-known/oauth-authorization-server" + auth.pathname.replace(/\/$/, ""),
            auth.origin,
          ).href,
          "issuer_metadata_target",
        );
      }
    }
    if (queue.length > 5)
      report.gaps.push({
        source: "metadata_probes",
        reason: "probe_limit",
        omitted: queue.length - 5,
      });
    if (options.wireEvidence) {
      const failed = report.probes.find((probe) => probe.outcome !== "metadata_read");
      const selected = new URL(failed?.url ?? queue[0]);
      const match = selected.pathname.match(
        /^\/\.well-known\/(oauth-protected-resource|oauth-authorization-server|openid-configuration)/,
      );
      if (match) {
        const root = new URL("/.well-known/" + match[1], endpoint.origin);
        const scoped = new URL(root.pathname + resource, endpoint.origin);
        for (const url of [scoped.href, root.href]) {
          try {
            report.wireProbes.push(
              await (dependencies.probeWire ?? probeMetadataWire)(url, diagnosticId, errorDetails),
            );
          } catch (error) {
            report.gaps.push({ source: "wire_probe", url, error: errorDetails(error) });
          }
        }
      }
    }
    if (
      endpoint.protocol === "https:" &&
      [report.entryProbe, ...report.probes].some(
        (probe) => probe.outcome === "failed" && probe.stage !== "probe_collector",
      )
    ) {
      try {
        report.transportContext = await (dependencies.inspectTransport ?? inspectTransport)(
          endpoint,
        );
      } catch (error) {
        report.transportContext = { status: "failed", error: errorDetails(error) };
      }
    }
  }
  report.evidenceSummary = evidenceSummary(report);
  report.upload = {
    status: disabled
      ? "skipped_intentionally_disabled"
      : !endpoint
        ? "skipped_endpoint_unavailable"
        : options.upload
          ? "pending"
          : "not_requested",
    storageVerified: false,
  };
  const path = resolve(options.output ?? join(tmpdir(), `chatcut-mcp-doctor-${diagnosticId}.json`));
  const save = async (flag) =>
    writeFile(path, JSON.stringify(clean(report), null, 2) + "\n", { flag, mode: 0o600 });
  await save("wx");
  if (options.upload && !disabled && endpoint) {
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
        reportSha256: events[0].properties.attributes.mcpDoctor.reportSha256,
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
        "host-snapshot": { type: "string" },
        "original-error": { type: "string" },
        "occurred-at": { type: "string" },
        "codex-sqlite-home": { type: "string" },
        "codex-log-dir": { type: "string" },
        "codex-app-log-dir": { type: "string" },
        output: { type: "string" },
        upload: { type: "boolean", default: false },
        "wire-evidence": { type: "boolean", default: true },
        "create-snapshot": { type: "string" },
        "validate-snapshot": { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
    if (values["create-snapshot"]) {
      const path = resolve(values["create-snapshot"]);
      if (!basename(path).endsWith(".mcp-snapshot.json"))
        throw new Error("Use a new dedicated .mcp-snapshot.json filename");
      await writeFile(
        path,
        JSON.stringify(
          { schemaVersion: 1, observedAt: new Date().toISOString(), observations: [] },
          null,
          2,
        ) + "\n",
        { flag: "wx", mode: 0o600 },
      );
      console.log(
        JSON.stringify({
          path,
          snapshotCreated: true,
          action:
            "Add only observed configuration/session facts using connection-diagnostics.md; omit unknown groups. observedAt is snapshot capture time, not original failure time.",
        }),
      );
    } else if (values["validate-snapshot"]) {
      const path = values["validate-snapshot"];
      if (!basename(path).endsWith(".mcp-snapshot.json"))
        throw new Error("Use a dedicated .mcp-snapshot.json file");
      if ((await stat(path)).size > READ_LIMIT) throw new Error("Host snapshot exceeds 128 KiB");
      validateSnapshot(
        JSON.parse(await readFile(path, "utf8")),
        values["server-url"] ? serverUrl(values["server-url"]) : null,
      );
      console.log(JSON.stringify({ snapshotValid: true, networkRequests: 0 }));
    } else if (values.help) {
      console.log(
        "node mcp-doctor.mjs --create-snapshot <new.mcp-snapshot.json> | --validate-snapshot <file> | --host codex|claude --server-url <registered URL> [--host-snapshot <dedicated .mcp-snapshot.json>] [--host-version <version>] [--original-error <error-only text file>] [--occurred-at <ISO timestamp>] [--codex-sqlite-home <known host SQLite directory>] [--codex-log-dir <known host log directory>] [--codex-app-log-dir <known host App log directory>] [--wire-evidence] [--output <new JSON path>] [--upload]",
      );
    } else {
      const { path, report } = await runDoctor({
        host: values.host,
        serverUrl: values["server-url"],
        hostVersion: values["host-version"],
        hostSnapshot: values["host-snapshot"],
        originalError: values["original-error"],
        occurredAt: values["occurred-at"],
        codexSqliteHome: values["codex-sqlite-home"],
        codexLogDir: values["codex-log-dir"],
        codexAppLogDir: values["codex-app-log-dir"],
        output: values.output,
        upload: values.upload,
        wireEvidence: values["wire-evidence"],
      });
      console.log(
        JSON.stringify({
          diagnosticId: report.diagnosticId,
          path,
          upload: report.upload,
          evidenceGaps: report.evidenceSummary.gaps,
          collectionGaps: report.gaps,
          recoveryVerified: false,
        }),
      );
    }
  } catch (error) {
    console.error(JSON.stringify({ doctorFailed: true, error: errorDetails(error) }));
    process.exitCode = 1;
  }
}

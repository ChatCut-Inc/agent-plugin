import { randomUUID, createHash } from "node:crypto";
import {
  open,
  opendir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir, platform, arch } from "node:os";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { connect as connectTls } from "node:tls";
import { isIP } from "node:net";
import {
  evidenceSummary,
  inspectMetadata,
  isHostFailure,
  logTime,
  snapshotFromRecord,
  validateSnapshot,
} from "./mcp-evidence.mjs";
import { probeMetadataWire } from "./mcp-wire.mjs";
import { failureFromRecord } from "./mcp-failure.mjs";

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

export function redact(text, jsonDepth = 0) {
  let value = String(text);
  // A host may quote/stringify an entire JSON response inside its error. Decode
  // only JSON string tokens containing credential labels, redact their full
  // value, then restore the quoting. A partial escaped-field regex can leak the
  // suffix after an escaped quote/backslash. Input collection is size bounded.
  if (jsonDepth < 16)
    value = value.replace(/"(?:\\.|[^"\\\r\n])*"/g, (token) => {
      try {
        const decoded = JSON.parse(token);
        if (
          /mcp[-_]session[-_]id|access_?token|refresh_?token|id_?token|session_?token|client_?secret|api[_-]?key|authorization|cookie/i.test(
            decoded,
          )
        ) {
          const sanitized = redact(decoded, jsonDepth + 1);
          if (sanitized !== decoded) return JSON.stringify(sanitized);
        }
      } catch {
        /* Non-JSON diagnostic text is retained for the normal rules. */
      }
      return token;
    });
  return value
    .replace(/\b(Mcp-Session-Id[ \t]*:[ \t]*)\S+/gi, "$1[REDACTED]")
    .replace(
      /(["']mcp[-_]session[-_]id["']\s*[:=]\s*)("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*')/gi,
      redactFieldValue,
    )
    .replace(
      /\b((?:mcp[-_]session[-_]id)\s*[:=]\s*)("(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'|[^\s"'<>]+)/gi,
      redactFieldValue,
    )
    .replace(
      /((?:\\*["'])mcp[-_]session[-_]id(?:\\*["'])\s*[:=]\s*(?:\\*["']))[^"'\\\r\n]*/gi,
      "$1[REDACTED]",
    )
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
      /^(?:mcp[-_]session[-_]id|(?:proxy[-_])?authorization|(?:x[-_])?(?:access_?token|refresh_?token|id_?token|client_?secret|session_?token|api[_-]?key|token)|cookie|set-cookie)$/i.test(
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
          clientInfo: { name: "chatcut-mcp-doctor", version: "1.2.6" },
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

function runtimeContext(body) {
  const boundary = body.lastIndexOf("}:");
  if (boundary < 0) return {};
  const context = body.slice(0, boundary);
  const value = (field) =>
    [
      ...context.matchAll(
        new RegExp(`(?:^|[\\s{])${field}="?([A-Za-z0-9_.-]{1,256})(?:"|[\\s}:]|$)`, "g"),
      ),
    ].at(-1)?.[1];
  const conversationId = value("thread_id") ?? value("thread\\.id") ?? value("conversation\\.id");
  const callId = value("call_id");
  return { ...(conversationId && { conversationId }), ...(callId && { callId }) };
}

function hostedTextRecord(line, nativeLevel) {
  if (/^\s/.test(line)) return false;
  // Inspect explicit echo prefixes before stripping trace context: a payload
  // itself can contain "}:" and must not become a diagnostic via lastIndex.
  if (
    /(?:^|\}:\s*)(?:tool (?:call|result)\s*:|(?:function_call(?:_output)?|tool_call(?:_output)?)\s*:?\s*[{[])/i.test(
      line,
    )
  )
    return false;
  let body = line.replace(
    /^\d{4}-\d{2}-\d{2}T\S+\s+(?:(?:\[(?:TRACE|DEBUG|INFO|WARN|ERROR)\]|TRACE|DEBUG|INFO|WARN|ERROR)\s+)?/i,
    "",
  );
  const module = body.match(/^([A-Za-z_]\w*(?:::\w+)+):\s*/);
  if (module) {
    if (
      !/^(?:codex_(?:mcp|rmcp_client|plugins|core(?:::|_)plugins)(?:::|$)|rmcp::|codex_core::mcp_tool_call$)/.test(
        module[1],
      )
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
  const header = line.match(/^\d{4}-\d{2}-\d{2}T\S+\s+(?:\[(WARN|ERROR)\]|(WARN|ERROR))\s+/i);
  const level = String(nativeLevel ?? header?.[1] ?? header?.[2]).toUpperCase();
  const nativeToolError =
    module?.[1] === "codex_core::mcp_tool_call" &&
    ["ERROR", "WARN"].includes(level) &&
    /^MCP tool call error:\s*["']?tool call error: tool call failed for `(?:chatcut|plugin:chatcut:chatcut)\/[A-Za-z0-9_.:-]+`/.test(
      body,
    );
  if (module?.[1] === "codex_core::mcp_tool_call" && !nativeToolError) return false;
  if (!CHATCUT_MESSAGE.test(body) && !nativeToolError) return false;
  if (/\bmethod=["']?tools\/call(?:["'\s}]|$)/.test(context)) {
    // A trusted native ERROR/WARN can describe a failed tools/call without
    // echoing its content. SQLite supplies its separate native level column.
    if (!module || !["ERROR", "WARN"].includes(level)) return false;
    // Inspect the unstripped body: a payload can itself contain "}:".
    const contentCheck = body.replace(/\\+(?=["'])/g, "");
    if (
      /["'](?:params|arguments)["']\s*:\s*[{[]|["'](?:prompt|transcript)["']\s*:\s*["'{[]|["']result["']\s*:\s*\{[\s\S]*?["']content["']\s*:\s*\[|["']role["']\s*:\s*["'](?:user|assistant|system|developer)["']|["']type["']\s*:\s*["'](?:function_call(?:_output)?|tool_call(?:_output)?|tool_result|user(?:_message)?|assistant(?:_message)?)["']/i.test(
        contentCheck,
      )
    )
      return false;
    if (/(?:^|\}:\s*)(?:prompt|transcript)\s*:/i.test(body)) return false;
  }
  const message = scope ? body.slice(scope[0].length) : logMessage(body);
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
    const start = window.readOffset ?? Math.max(0, info.size - READ_LIMIT);
    if (!Number.isSafeInteger(start) || start < 0 || start > info.size)
      throw new Error("Log segment offset must point inside the selected existing file");
    const buffer = Buffer.alloc(Math.min(info.size - start, READ_LIMIT));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
    const lines = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/);
    if (start) {
      const previous = Buffer.alloc(1);
      await handle.read(previous, 0, 1, start - 1);
      if (previous[0] !== 10) lines.shift();
      gaps.push({
        source,
        reason: "only_log_tail_read",
        sourceFile: basename(path),
        bytesBeforeWindow: start,
        omittedBytes: start,
      });
    }
    if (start + bytesRead < info.size) {
      if (!buffer.subarray(0, bytesRead).toString("utf8").endsWith("\n")) lines.pop();
      gaps.push({
        source,
        reason: "only_log_segment_read",
        sourceFile: basename(path),
        offset: start,
        bytesRead,
        remainingBytes: info.size - start - bytesRead,
      });
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
      if (block.length > 1 && !select(block.join("\n"))) continue;
      const occurredAt = logTime(block[0]);
      const context = runtimeContext(block[0]);
      if (
        window.conversationId &&
        context.conversationId &&
        context.conversationId !== window.conversationId
      )
        continue;
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
        ...context,
        originalAttemptMatch: "unconfirmed",
      });
    }
    if (entries.length > 30)
      gaps.push({ source, reason: "log_record_limit", omitted: entries.length - 30 });
    const unknownTimes = entries.filter((entry) => !entry.occurredAt).length;
    if (unknownTimes)
      gaps.push({ source, reason: "records_with_unknown_time", count: unknownTimes });
    return retainFailureLogs(entries, gaps, source);
  } finally {
    await handle.close();
  }
}

function retainFailureLogs(entries, gaps, source = "host_logs") {
  const failures = entries.filter(isHostFailure);
  const others = entries.filter((entry) => !isHostFailure(entry));
  const selected = new Set();
  let bytes = 0;
  const newest = (values) =>
    values
      .map((entry, index) => ({
        entry,
        index,
        time: Date.parse(entry.loggedAt ?? entry.occurredAt) || -Infinity,
      }))
      .sort((a, b) => b.time - a.time || b.index - a.index)
      .map((value) => value.entry);
  for (const entry of [...newest(failures), ...newest(others)]) {
    const size = Buffer.byteLength(entry.message ?? "");
    if (selected.size === 30 || bytes + size > READ_LIMIT) continue;
    selected.add(entry);
    bytes += size;
  }
  if (selected.size < entries.length)
    gaps.push({
      source,
      reason: "failure_prioritized_log_budget",
      maximumRecords: 30,
      maximumMessageBytes: READ_LIMIT,
      retainedMessageBytes: bytes,
      omitted: entries.length - selected.size,
      omittedFailureRecords: failures.filter((entry) => !selected.has(entry)).length,
    });
  return entries.filter((entry) => selected.has(entry));
}

async function codexAppLogs(root, gaps, window, conversationId, selectedFiles = [], readOffset) {
  if (
    readOffset !== undefined &&
    (selectedFiles.length !== 1 || !Number.isSafeInteger(readOffset) || readOffset < 0)
  )
    throw new Error(
      "A segment offset requires exactly one selected native App log file and a nonnegative integer",
    );
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
  if (selectedFiles.length) {
    if (selectedFiles.length > 3)
      throw new Error("Select at most three existing Codex App log files");
    files.length = 0;
    for (const path of [...new Set(selectedFiles)]) {
      if (!/^codex-desktop-.*\.log$/.test(basename(path)))
        throw new Error("Select only existing native codex-desktop-*.log files");
      const info = await stat(path);
      if (!info.isFile()) throw new Error("Codex App log selection must be a file");
      files.push({ path, modified: info.mtimeMs });
    }
  }
  const entries = [];
  let filesRead = 0;
  for (const file of files.slice(0, 3)) {
    try {
      // App logs mix unrelated UI activity with runtime notices, so accept only this native event.
      entries.push(
        ...(await textLog(file.path, "codex_app_log", gaps, { ...window, readOffset }, (line) => {
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
    gaps.push({
      source: "codex_app_log",
      reason: "log_file_limit",
      omitted: files.length - 3,
      omittedFiles: files.slice(3, 13).map((file) => basename(file.path)),
    });
  if (entries.length > 30)
    gaps.push({
      source: "codex_app_log",
      reason: "log_record_limit",
      omitted: entries.length - 30,
    });
  return {
    entries: retainFailureLogs(
      entries.sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? "")),
      gaps,
      "codex_app_log",
    ),
    scan: {
      directoryEntriesScanned: scanned,
      matchingFiles: files.length,
      filesRead,
      maximumTailBytesPerFile: READ_LIMIT,
      currentConversationFilterApplied: Boolean(conversationId),
      ...(conversationId && { conversationId }),
      selectedFileMode: selectedFiles.length > 0,
      ...(readOffset !== undefined && { selectedByteOffset: readOffset }),
      filesSelected: files.slice(0, 3).map((file) => basename(file.path)),
      observationScope:
        "hosted_mcp_startup_notices_only; tool_request_failures_need_original_failure_record_or_matching_runtime_logs",
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

async function nativeFailedMcpItems(sqliteRoot, conversationId, window, gaps) {
  const source = "codex_native_failed_mcp_items";
  if (!conversationId) {
    gaps.push({ source, reason: "known_conversation_id_unavailable; no_history_query" });
    return [];
  }
  let db;
  const databasePath = join(sqliteRoot, "thread_history_1.sqlite");
  let operation = "locate_database";
  try {
    await stat(databasePath);
    operation = "load_sqlite_module";
    const { DatabaseSync } = await import("node:sqlite");
    operation = "open_database";
    db = new DatabaseSync(databasePath, { readOnly: true, timeout: 1000 });
    operation = "set_query_only";
    db.exec("PRAGMA query_only=ON");
    operation = "inspect_schema";
    const columns = db
      .prepare("PRAGMA table_info(thread_items)")
      .all()
      .map((column) => column.name);
    if (
      ![
        "thread_id",
        "turn_id",
        "item_id",
        "item_type",
        "item_json",
        "started_at_ms",
        "completed_at_ms",
      ].every((name) => columns.includes(name))
    ) {
      gaps.push({ source, reason: "unsupported_schema; no_conversation_rows_read" });
      return [];
    }
    // Only scalar/error projections leave SQLite; never select whole item_json,
    // chat roles, arguments, successful results or rollout contents.
    const field = (name) =>
      `json_extract(CASE WHEN json_valid(item_json) THEN item_json ELSE '{}' END,'$.${name}')`;
    const error = field("error");
    operation = "prepare_failed_items_query";
    const query = db.prepare(`SELECT thread_id,turn_id,item_id,started_at_ms,completed_at_ms,
      ${field("server")} AS server,${field("tool")} AS operation,
      CASE WHEN length(CAST(${error} AS BLOB))<=${READ_LIMIT} THEN ${error} END AS error_json,
      length(CAST(${error} AS BLOB)) AS error_bytes
      FROM thread_items WHERE thread_id=? AND item_type='mcpToolCall'
      AND ((started_at_ms>=? AND started_at_ms<=?) OR (completed_at_ms>=? AND completed_at_ms<=?))
      AND ${field("type")}='mcpToolCall' AND ${field("server")} IN ('chatcut','plugin:chatcut:chatcut')
      AND ${field("status")}='failed' ORDER BY completed_at_ms DESC,item_id LIMIT 11`);
    operation = "select_failed_mcp_items";
    const rows = query.all(
      conversationId,
      window.since * 1000,
      window.until * 1000,
      window.since * 1000,
      window.until * 1000,
    );
    if (rows.length > 10) gaps.push({ source, reason: "native_failure_record_limit", limit: 10 });
    if (!rows.length) gaps.push({ source, reason: "no_failed_mcp_items_in_bounded_window" });
    return rows.slice(0, 10).map((row) => {
      if (row.error_bytes > READ_LIMIT)
        gaps.push({
          source,
          reason: "native_error_size_limit",
          nativeItemId: row.item_id,
          limitBytes: READ_LIMIT,
        });
      let error = null;
      if (row.error_json) {
        try {
          error = JSON.parse(row.error_json);
        } catch {
          error = { message: String(row.error_json) };
        }
      }
      return {
        source,
        sourceFile: "thread_history_1.sqlite",
        conversationId: row.thread_id,
        turnId: row.turn_id,
        nativeItemId: row.item_id,
        idKind: "codex_native_mcp_item_id; not_responses_call_id_rpc_id_or_server_request_id",
        serverName: row.server,
        operation: row.operation,
        status: "failed",
        startedAtMs: row.started_at_ms,
        completedAtMs: row.completed_at_ms,
        timeSource: "native_thread_items_lifecycle_columns; not_original_occurredAt_or_log_time",
        error,
        ...(row.error_bytes > READ_LIMIT && { errorCaptureLimited: true }),
        originalAttemptMatch: "unconfirmed",
      };
    });
  } catch (error) {
    gaps.push({
      source,
      reason: "unavailable",
      operation,
      error: errorDetails(error),
      ...(platform() === "win32" && error?.errcode === 14
        ? { accessEvidence: await inspectSqliteAccess(databasePath) }
        : {}),
    });
    return [];
  } finally {
    try {
      db?.close();
    } catch (error) {
      gaps.push({
        source,
        reason: "close_failed",
        operation: "close_database",
        error: errorDetails(error),
      });
    }
  }
}

export async function collectHostLogs(host, options = {}) {
  const userHome = options.home ?? homedir();
  const gaps = [];
  const entries = [];
  let appLog;
  let nativeFailedCalls;
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
    let operation = "locate_database";
    try {
      await stat(databasePath);
      operation = "load_sqlite_module";
      const { DatabaseSync } = await import("node:sqlite");
      operation = "open_database";
      db = new DatabaseSync(databasePath, { readOnly: true, timeout: 1000 });
      operation = "set_query_only";
      db.exec("PRAGMA query_only=ON");
      operation = "inspect_schema";
      const hasThreadId = db
        .prepare("PRAGMA table_info(logs)")
        .all()
        .some((column) => column.name === "thread_id");
      const threadFilter =
        hasThreadId && options.conversationId
          ? " AND (thread_id IS NULL OR thread_id='' OR thread_id=?)"
          : "";
      operation = "prepare_runtime_logs_query";
      const query = db.prepare(
        `SELECT id,ts,level,target,feedback_log_body${hasThreadId ? ",thread_id" : ""} FROM logs WHERE ts>=? AND ts<=?${threadFilter} AND (target LIKE 'codex_mcp%' OR target LIKE 'codex_rmcp_client%' OR target LIKE 'rmcp%' OR target LIKE 'codex_plugins%' OR target LIKE 'codex_core::plugins%' OR target='codex_core::mcp_tool_call') AND feedback_log_body LIKE '%chatcut%' ORDER BY ts DESC LIMIT 200`,
      );
      operation = "select_runtime_logs";
      const rows = query.all(since, until, ...(threadFilter ? [options.conversationId] : []));
      operation = "filter_runtime_logs";
      for (const row of rows) {
        const message = logMessage(row.feedback_log_body ?? "");
        const original = row.feedback_log_body ?? "";
        const context = runtimeContext(original);
        if (row.thread_id) context.conversationId = row.thread_id;
        if (
          options.conversationId &&
          context.conversationId &&
          context.conversationId !== options.conversationId
        )
          continue;
        if (
          !hostedTextRecord(`${row.target}: ${original}`, row.level) ||
          !hostedTextRecord(`MCP server "chatcut" ${message}`)
        )
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
          ...context,
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
        operation,
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
      try {
        db?.close();
      } catch (error) {
        gaps.push({
          source: "codex_runtime_sqlite",
          reason: "close_failed",
          operation: "close_database",
          error: errorDetails(error),
        });
      }
    }
    nativeFailedCalls = await nativeFailedMcpItems(
      sqliteRoot,
      options.conversationId,
      { since, until },
      gaps,
    );
    try {
      entries.push(
        ...(await textLog(join(logRoot, "codex-tui.log"), "codex_tui_log", gaps, {
          since,
          until,
          conversationId: options.conversationId,
        })),
      );
    } catch (error) {
      gaps.push({ source: "codex_tui_log", reason: "unavailable", error: errorDetails(error) });
    }
    if (options.codexStderrFile) {
      try {
        if (!basename(options.codexStderrFile).endsWith(".codex-stderr.log"))
          throw new Error(
            "Use an existing dedicated .codex-stderr.log native capture, never config/auth/session files",
          );
        const captured = await textLog(options.codexStderrFile, "codex_stderr_log", gaps, {
          since,
          until,
          conversationId: options.conversationId,
        });
        entries.push(
          ...captured.map(({ occurredAt, ...entry }) => ({
            ...entry,
            loggedAt: occurredAt,
            timestampKind: "native_log_time_not_original_failure_time",
          })),
        );
      } catch (error) {
        gaps.push({
          source: "codex_stderr_log",
          reason: "unavailable",
          error: errorDetails(error),
        });
      }
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
      const result = await codexAppLogs(
        appLogRoot,
        gaps,
        { since, until },
        options.conversationId,
        options.codexAppLogFiles,
        options.codexAppLogOffset,
      );
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
  if (!entries.length && !nativeFailedCalls?.length)
    gaps.push({ source: "host_logs", reason: "no_matching_records_in_bounded_window" });
  return clean({
    entries: retainFailureLogs(entries, gaps),
    gaps,
    ...(appLog ? { appLog } : {}),
    ...(nativeFailedCalls ? { nativeFailedCalls } : {}),
    window: {
      since: new Date(since * 1000).toISOString(),
      until: new Date(until * 1000).toISOString(),
    },
  });
}

export function fragmentEvents(report) {
  if (report.collectionStatus === "in_progress")
    throw new Error(
      "Incomplete collection checkpoint cannot be uploaded; original local evidence remains available",
    );
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

export async function submitReport(report, fetchImpl = fetch) {
  if (report.upload?.status === "skipped_intentionally_disabled" ||
      report.hostSnapshot?.configuration?.enabled === false ||
      report.hostSnapshot?.session?.connectionStatus === "disabled")
    return { status: "skipped_intentionally_disabled", storageVerified: false };
  if (!report.serverUrl) return { status: "skipped_endpoint_unavailable", storageVerified: false };
  let attempted = false;
  let rejected = false;
  try {
    const endpoint = serverUrl(report.serverUrl);
    const events = fragmentEvents(report);
    attempted = true;
    const response = await fetchImpl(new URL("/telemetry/events", endpoint.origin).href, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "content-type": "application/json" }, body: JSON.stringify(events),
    });
    rejected = !response.ok;
    const body = await limitedBody(response, 16 * 1024);
    if (!response.ok || JSON.parse(body).ok !== true)
      throw new Error(`Diagnostic ingest rejected: HTTP ${response.status}; ${body}`);
    return { status: "ingest_accepted", storageVerified: false, fragmentCount: events.length,
      reportSha256: events[0].properties.attributes.mcpDoctor.reportSha256 };
  } catch (error) {
    return { status: "failed", storageVerified: false, deliveryUncertain: attempted && !rejected, error: errorDetails(error) };
  }
}

export async function runDoctor(options, dependencies = {}) {
  if (!["codex", "claude"].includes(options.host))
    throw new Error("--host must be codex or claude");
  if (options.originalError && options.failureRecord)
    throw new Error("Choose one original failure input: --failure-record or --original-error");
  let endpoint = null;
  let endpointError;
  try { endpoint = options.serverUrl ? serverUrl(options.serverUrl) : null; }
  catch (error) { endpointError = errorDetails(error); }
  if (
    options.occurredAt &&
    (!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(options.occurredAt) ||
      !Number.isFinite(Date.parse(options.occurredAt)))
  ) {
    throw new Error("--occurred-at must be an ISO timestamp with timezone; omit it when unknown");
  }
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const threadEnv = options.host === "codex" ? process.env.CODEX_THREAD_ID : undefined;
  const collectionConversationId =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(threadEnv ?? "")
      ? threadEnv
      : null;
  const diagnosticId = randomUUID();
  const report = {
    schemaVersion: 2,
    collectorVersion: "1.2.6",
    diagnosticId,
    collectedAt: new Date().toISOString(),
    scope: "cloud",
    host: options.host,
    hostVersion: options.hostVersion ?? null,
    hostVersionSource: options.hostVersion ? "agent_supplied" : "unavailable",
    collectionContext: {
      conversationId: collectionConversationId,
      source: collectionConversationId ? "CODEX_THREAD_ID" : "unavailable",
      association: "current_collection_thread; original_failed_attempt_unconfirmed",
    },
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
      timeSource: options.occurredAt
        ? "command_line; agent_supplied_not_independently_verified"
        : "unavailable",
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
  if (endpointError) report.gaps.push({ source: "registration", reason: "unsupported_endpoint; no_requests_sent", error: endpointError });
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
      const captured = snapshotFromRecord(snapshot, endpoint);
      report.hostSnapshot = clean(captured.snapshot);
      if (report.hostSnapshot.session?.conversationId?.includes("[REDACTED]")) {
        delete report.hostSnapshot.session.conversationId;
        captured.metadataGaps.push({
          field: "session.conversationId",
          reason: "credential_removed_from_snapshot_metadata",
        });
      }
      for (const [index, observation] of (report.hostSnapshot.observations ?? []).entries()) {
        if (observation.requestId?.includes("[REDACTED]")) {
          delete observation.requestId;
          delete observation.originalAttemptMatch;
          captured.metadataGaps.push({
            field: `observations[${index}].requestId`,
            reason: "credential_removed_from_snapshot_metadata",
          });
        }
      }
      report.gaps.push(
        ...captured.metadataGaps.map((gap) => ({ source: "host_snapshot", ...gap })),
      );
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
      if (info.size > READ_LIMIT) {
        report.gaps.push({
          source: "original_failure",
          reason: "original_error_input_size_limit",
          maximumBytes: READ_LIMIT,
          sourceBytes: info.size,
          completeLocalSourceRetained: true,
        });
        throw new Error(
          "Original error file exceeds 128 KiB; complete source file retained without reading",
        );
      }
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
  } else if (!options.failureRecord)
    report.gaps.push({
      source: "original_failure",
      reason: "not_provided; do_not_invent_original_error",
    });
  if (options.failureRecord) {
    try {
      if (!basename(String(options.failureRecord)).endsWith(".mcp-failure.json"))
        throw new Error(
          "Use a dedicated .mcp-failure.json file, never a config or session transcript",
        );
      const info = await stat(options.failureRecord);
      if (info.size > READ_LIMIT) {
        report.gaps.push({
          source: "original_failure",
          reason: "failure_record_input_size_limit",
          maximumBytes: READ_LIMIT,
          sourceBytes: info.size,
          completeLocalSourceRetained: true,
        });
        throw new Error("Failure record exceeds 128 KiB; complete source retained without reading");
      }
      report.originalFailure = clean(
        failureFromRecord(JSON.parse(await readFile(options.failureRecord, "utf8"))),
      );
      for (const field of ["conversationId", "callId", "operation", "requestId"]) {
        if (report.originalFailure[field]?.includes("[REDACTED]")) {
          delete report.originalFailure[field];
          (report.originalFailure.metadataGaps ??= []).push({
            field,
            reason: "credential_removed_from_optional_metadata",
          });
        }
      }
      for (const gap of report.originalFailure.metadataGaps ?? [])
        report.gaps.push({ source: "original_failure", ...gap });
      if (!report.originalFailure.occurredAt && options.occurredAt) {
        report.originalFailure.occurredAt = options.occurredAt;
        report.originalFailure.timeSource =
          "command_line; agent_supplied_not_independently_verified";
      }
      if (
        options.occurredAt &&
        report.originalFailure.occurredAt &&
        Date.parse(options.occurredAt) !== Date.parse(report.originalFailure.occurredAt)
      ) {
        report.originalFailure.timeConflict = {
          failureRecord: report.originalFailure.occurredAt,
          commandLine: options.occurredAt,
        };
        report.originalFailure.occurredAt = null;
        report.originalFailure.timeSource = "conflicting_supplied_times";
        report.gaps.push({
          source: "original_failure",
          reason: "conflicting_supplied_failure_times",
        });
      }
    } catch (error) {
      report.gaps.push({
        source: "original_failure",
        reason: "failure_record_unavailable",
        error: errorDetails(error),
      });
    }
  }
  const path = resolve(options.output ?? join(tmpdir(), `chatcut-mcp-doctor-${diagnosticId}.json`));
  const save = async (flag) => {
    const json = JSON.stringify(clean(report), null, 2) + "\n";
    if (flag === "wx") return writeFile(path, json, { flag, mode: 0o600 });
    const pending = `${path}.writing-${diagnosticId}`;
    try {
      await writeFile(pending, json, { flag: "wx", mode: 0o600 });
      await rename(pending, path);
    } catch (error) {
      await unlink(pending).catch(() => {});
      throw error;
    }
  };
  report.collectionStatus = "in_progress";
  report.collectionStage = "host_logs";
  report.hostLogs = { entries: [], gaps: [{ source: "host_logs", reason: "collection_pending" }] };
  report.evidenceSummary = evidenceSummary(report);
  report.upload = { status: "not_attempted_collection_incomplete", storageVerified: false };
  await save("wx");
  try {
    report.hostLogs = await (dependencies.collectLogs ?? collectHostLogs)(options.host, {
      occurredAt: report.originalFailure.occurredAt,
      codexSqliteHome: options.codexSqliteHome,
      codexLogDir: options.codexLogDir,
      codexAppLogDir: options.codexAppLogDir,
      codexAppLogFiles: options.codexAppLogFiles,
      codexAppLogOffset: options.codexAppLogOffset,
      codexStderrFile: options.codexStderrFile,
      conversationId:
        report.originalFailure.conversationId ??
        report.hostSnapshot?.session?.conversationId ??
        collectionConversationId,
    });
  } catch (error) {
    report.hostLogs = {
      entries: [],
      gaps: [{ source: "host_logs", reason: "collector_failed", error: errorDetails(error) }],
    };
  }
  report.collectionStage = "independent_checks";
  report.evidenceSummary = evidenceSummary(report);
  await save("w");
  const disabled =
    disabledBySnapshot ||
    report.hostSnapshot?.configuration?.enabled === false ||
    report.hostSnapshot?.session?.connectionStatus === "disabled";
  if (options.offline || disabled || !endpoint) {
    report.gaps.push({
      source: "probes",
      reason: disabled
        ? "host_reports_intentionally_disabled; no_requests_sent"
        : options.offline
          ? "offline_requested; no_requests_sent"
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
  report.collectionStatus = "complete";
  report.collectionStage = "complete";
  report.upload = {
    status: disabled
      ? "skipped_intentionally_disabled"
      : options.offline
        ? "skipped_offline"
        : !endpoint
          ? "skipped_endpoint_unavailable"
          : options.upload
            ? "pending"
            : "not_requested",
    storageVerified: false,
  };
  await save("w");
  if (options.upload && !options.offline && !disabled && endpoint) {
    report.upload = await submitReport(report, fetchImpl);
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
        "failure-record": { type: "string" },
        "occurred-at": { type: "string" },
        "codex-sqlite-home": { type: "string" },
        "codex-log-dir": { type: "string" },
        "codex-stderr-file": { type: "string" },
        "codex-app-log-dir": { type: "string" },
        "codex-app-log-file": { type: "string", multiple: true },
        "codex-app-log-offset": { type: "string" },
        output: { type: "string" },
        upload: { type: "boolean", default: false },
        offline: { type: "boolean", default: false },
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
        "node mcp-doctor.mjs --create-snapshot <new.mcp-snapshot.json> | --validate-snapshot <file> | --host codex|claude --server-url <registered URL> [--host-snapshot <dedicated .mcp-snapshot.json>] [--host-version <version>] [--failure-record <dedicated .mcp-failure.json> | --original-error <error-only text file>] [--occurred-at <ISO timestamp>] [--codex-sqlite-home <known host SQLite directory>] [--codex-log-dir <known host log directory>] [--codex-stderr-file <existing .codex-stderr.log>] [--codex-app-log-dir <known host App log directory>] [--codex-app-log-file <known native log; at most three>] [--wire-evidence] [--output <new JSON path>] [--offline] [--upload]",
      );
    } else {
      const { path, report } = await runDoctor({
        host: values.host,
        serverUrl: values["server-url"],
        hostVersion: values["host-version"],
        hostSnapshot: values["host-snapshot"],
        originalError: values["original-error"],
        failureRecord: values["failure-record"],
        occurredAt: values["occurred-at"],
        codexSqliteHome: values["codex-sqlite-home"],
        codexLogDir: values["codex-log-dir"],
        codexStderrFile: values["codex-stderr-file"],
        codexAppLogDir: values["codex-app-log-dir"],
        codexAppLogFiles: values["codex-app-log-file"],
        codexAppLogOffset:
          values["codex-app-log-offset"] === undefined
            ? undefined
            : Number(values["codex-app-log-offset"]),
        output: values.output,
        upload: values.upload,
        offline: values.offline,
        wireEvidence: values["wire-evidence"],
      });
      console.log(
        JSON.stringify({
          diagnosticId: report.diagnosticId,
          path,
          upload: report.upload,
          evidenceGaps: report.evidenceSummary.gaps,
          hostFailureEvidence: report.evidenceSummary.failureEvidence,
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

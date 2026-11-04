import { createHash } from "node:crypto";
import { connect, isIP } from "node:net";
import { connect as connectTls } from "node:tls";

const LIMIT = 128 * 1024;
const HEADER_LIMIT = 16 * 1024;
const TIMEOUT_MS = 3500;
const HEADERS = new Set([
  "content-type",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "connection",
  "server",
  "via",
  "x-request-id",
  "x-amzn-trace-id",
  "cache-control",
  "age",
  "x-cache",
  "x-amz-cf-id",
  "x-amz-cf-pop",
]);

function target(value) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (!local &&
      (!["api.chatcut.io", "api.chatcut.dev", "api-dev.chatcut.org"].includes(url.hostname) ||
        url.protocol !== "https:" ||
        (url.port && url.port !== "443"))) ||
    (local && !["http:", "https:"].includes(url.protocol)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/\.well-known\/(?:oauth-protected-resource|oauth-authorization-server|openid-configuration)(?:\/[a-zA-Z0-9/_-]*)?$/.test(
      url.pathname,
    )
  )
    throw new Error(
      "Wire evidence is restricted to anonymous ChatCut metadata on the selected origin",
    );
  return url;
}

function framing(headers, body, ended, limited) {
  const result = {
    status: "incomplete",
    firstBodyByteHex: body.length ? body[0].toString(16).padStart(2, "0") : null,
    bodyRepresentation: "after_transfer_decoding; content_encoding_not_decoded",
  };
  const invalid = (reason) => ({ ...result, status: "invalid", reason });
  const incomplete = (reason) => ({ ...result, reason });
  const valid = (decoded) => ({
    ...result,
    status: "valid",
    bodyBytes: decoded.length,
    bodySha256: createHash("sha256").update(decoded).digest("hex"),
  });
  const transfer = headers["transfer-encoding"]
    ?.toLowerCase()
    .split(",")
    .map((v) => v.trim());
  if (transfer?.at(-1) === "chunked") {
    if (headers["content-length"] !== undefined)
      return invalid("both_transfer_encoding_and_content_length");
    let offset = 0;
    const parts = [];
    while (offset < body.length) {
      const end = body.indexOf("\r\n", offset);
      if (end < 0) {
        if (body.length > offset && !/[0-9a-f]/i.test(String.fromCharCode(body[offset])))
          return invalid("invalid_chunk_size");
        return ended && !limited
          ? invalid("unterminated_chunk_size")
          : incomplete("chunk_size_not_complete");
      }
      const sizeText = body.subarray(offset, end).toString("latin1").split(";")[0];
      if (!/^[0-9a-f]{1,16}$/i.test(sizeText)) return invalid("invalid_chunk_size");
      if (offset === 0) result.firstChunkSizeHex = sizeText;
      const size = Number.parseInt(sizeText, 16);
      offset = end + 2;
      if (!Number.isSafeInteger(size)) return incomplete("chunk_exceeds_capture_limit");
      if (size === 0) {
        const trailerEnd = body.indexOf("\r\n\r\n", offset);
        const messageEnd = body.subarray(offset, offset + 2).equals(Buffer.from("\r\n"))
          ? offset + 2
          : trailerEnd >= 0
            ? trailerEnd + 4
            : null;
        if (messageEnd !== null) {
          if (messageEnd !== body.length) return invalid("bytes_after_terminal_chunk");
          return valid(Buffer.concat(parts));
        }
        return ended && !limited
          ? invalid("unterminated_trailers")
          : incomplete("trailers_not_complete");
      }
      if (offset + size + 2 > body.length)
        return ended && !limited ? invalid("truncated_chunk") : incomplete("chunk_not_complete");
      if (!body.subarray(offset + size, offset + size + 2).equals(Buffer.from("\r\n")))
        return invalid("missing_chunk_terminator");
      parts.push(body.subarray(offset, offset + size));
      offset += size + 2;
    }
    return ended && !limited
      ? invalid("missing_terminal_chunk")
      : incomplete("terminal_chunk_not_observed");
  }
  if (transfer) return incomplete("unsupported_transfer_encoding");
  if (headers["content-length"] !== undefined) {
    if (!/^\d+$/.test(headers["content-length"])) return invalid("invalid_content_length");
    const expected = Number(headers["content-length"]);
    if (body.length === expected) return valid(body);
    if (body.length > expected) return invalid("content_length_mismatch");
    return ended && !limited ? invalid("content_length_mismatch") : incomplete("body_not_complete");
  }
  return ended && !limited ? valid(body) : incomplete("close_delimited_body_not_complete");
}

function inspectResponse(captured, ended, limited) {
  const headerEnd = captured.indexOf("\r\n\r\n");
  const result = { responseHeaders: {} };
  if (headerEnd < 0 || headerEnd > HEADER_LIMIT) {
    result.headerGap =
      captured.length > HEADER_LIMIT ? "header_limit" : "complete_headers_unavailable";
    return result;
  }
  const lines = captured.subarray(0, headerEnd).toString("latin1").split("\r\n");
  const status = lines.shift().match(/^HTTP\/(1\.[01]) ([1-5]\d{2}) [\t\x20-\x7e\x80-\xff]*$/);
  result.httpVersion = status?.[1] ?? null;
  result.status = status ? Number(status[2]) : null;
  result.responseState = !status
    ? "invalid_status_line"
    : result.status < 200
      ? "unsupported_informational_response"
      : "final_response";
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).toLowerCase();
    if (HEADERS.has(name)) {
      const field = line.slice(colon + 1).trim();
      result.responseHeaders[name] =
        result.responseHeaders[name] === undefined
          ? field
          : result.responseHeaders[name] + "," + field;
    }
  }
  result.stage = "http_framing";
  const body = captured.subarray(headerEnd + 4);
  result.framing =
    result.responseState === "final_response"
      ? framing(result.responseHeaders, body, ended, limited)
      : {
          status: "not_evaluated",
          reason: result.responseState,
          firstBodyByteHex: body.length ? body[0].toString(16).padStart(2, "0") : null,
        };
  return result;
}

export async function probeMetadataWire(value, diagnosticId, describeError) {
  const url = target(value);
  if (!/^[0-9a-f-]{36}$/i.test(diagnosticId)) throw new Error("Invalid diagnostic ID");
  const started = Date.now();
  const result = {
    evidenceKind: "later_probe",
    url: url.href,
    startedAt: new Date().toISOString(),
    implementation: "node:net/tls; HTTP/1.1",
    route: "direct_connection; environment_proxy_not_used; host_and_fetch_route_not_reproduced",
    originalAttemptMatch: "unconfirmed",
    credentialsSent: false,
    acceptEncoding: "identity",
    byteLimit: LIMIT,
    stage: "connect",
  };
  return new Promise((resolve) => {
    let socket;
    let done = false;
    let bytes = 0;
    let limited = false;
    let ended = false;
    let headerSeen = false;
    const parts = [];
    const finish = (error, completionReason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const captured = Buffer.concat(parts);
      result.capturedBytes = captured.length;
      result.captureLimited = limited;
      Object.assign(result, inspectResponse(captured, ended, limited));
      result.completionReason = completionReason;
      result.peerEndObserved = ended;
      result.outcome = error
        ? "failed"
        : result.responseState === "invalid_status_line"
          ? "invalid_response"
          : result.responseState === "unsupported_informational_response"
            ? "unsupported_response"
            : result.framing?.status === "invalid"
              ? "invalid_framing"
              : !limited && result.framing?.status === "valid"
                ? "response_observed"
                : "incomplete";
      if (error) result.error = describeError(error);
      result.durationMs = Date.now() - started;
      socket?.destroy();
      resolve(result);
    };
    const timer = setTimeout(
      () =>
        finish(
          Object.assign(new Error("Metadata wire probe timed out after 3500ms"), {
            code: "DIAGNOSTIC_WIRE_TIMEOUT",
          }),
          "timeout",
        ),
      TIMEOUT_MS,
    );
    try {
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const options = {
        host: hostname,
        port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
      };
      const send = () => {
        result.stage = "response";
        result.peer = { address: socket.remoteAddress, port: socket.remotePort };
        if (url.protocol === "https:") {
          const certificate = socket.getPeerCertificate();
          result.tls = {
            authorized: socket.authorized,
            protocol: socket.getProtocol(),
            certificate: { issuer: certificate.issuer, fingerprint256: certificate.fingerprint256 },
          };
        }
        socket.write(
          `GET ${url.pathname} HTTP/1.1\r\nHost: ${url.host}\r\nAccept: application/json\r\nAccept-Encoding: identity\r\nConnection: close\r\nX-ChatCut-Diagnostic-ID: ${diagnosticId}\r\n\r\n`,
        );
      };
      socket =
        url.protocol === "https:"
          ? connectTls(
              {
                ...options,
                servername: isIP(hostname) ? undefined : hostname,
                rejectUnauthorized: true,
                ALPNProtocols: ["http/1.1"],
              },
              send,
            )
          : connect(options, send);
      socket.on("data", (part) => {
        if (done) return;
        const remaining = LIMIT - bytes;
        parts.push(part.subarray(0, Math.max(0, remaining)));
        bytes += Math.min(part.length, remaining);
        if (part.length > remaining) {
          limited = true;
          finish(undefined, "capture_limit");
          return;
        }
        if (!headerSeen) {
          const captured = Buffer.concat(parts);
          const headerEnd = captured.indexOf("\r\n\r\n");
          headerSeen = headerEnd >= 0;
          if ((!headerSeen && bytes > HEADER_LIMIT) || headerEnd > HEADER_LIMIT) {
            limited = true;
            finish(undefined, "header_limit");
            return;
          }
        }
        if (headerSeen) {
          const observed = inspectResponse(Buffer.concat(parts), false, false);
          if (observed.responseState !== "final_response")
            finish(undefined, "invalid_or_unsupported_response");
          else if (observed.framing.status === "valid") finish(undefined, "message_boundary");
          else if (observed.framing.status === "invalid") finish(undefined, "invalid_framing");
        }
      });
      socket.once("end", () => {
        ended = true;
        finish(undefined, "peer_end");
      });
      socket.once("error", (error) => finish(error, "transport_error"));
      socket.once("close", () => finish(undefined, "socket_close"));
    } catch (error) {
      finish(error, "collector_error");
    }
  });
}

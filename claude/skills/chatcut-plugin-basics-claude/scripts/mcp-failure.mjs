const SOURCES = ["host_tool_result", "host_runtime_event", "captured_stderr"];
const FIELDS = [
  "schemaVersion",
  "source",
  "serverName",
  "occurredAt",
  "conversationId",
  "callId",
  "operation",
  "requestId",
  "httpResponse",
  "error",
];
const OPTIONAL_IDENTIFIERS = ["conversationId", "callId", "operation", "requestId"];
const validIdentifier = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && /^[A-Za-z0-9_.:/-]{1,256}$/.test(value));
const validTime = (value) =>
  value === null ||
  (typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value)));
const HTTP_FIELDS = ["source", "status", "headers", "body", "bodyComplete"];
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
const validHeader = (value) =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

function normalizeHttpResponse(input, gaps) {
  const reject = (field, reason = "invalid_optional_http_metadata; value_omitted") =>
    gaps.push({ field: `httpResponse.${field}`, reason });
  if (!object(input) || input.source !== "host_original_error_response") {
    gaps.push({
      field: "httpResponse",
      reason: "original_http_response_source_unconfirmed; value_omitted",
    });
    return undefined;
  }
  const result = { source: input.source };
  if (Object.keys(input).some((key) => !HTTP_FIELDS.includes(key))) reject("unsupported_fields");
  if (input.status !== undefined) {
    if (Number.isInteger(input.status) && input.status >= 100 && input.status <= 599)
      result.status = input.status;
    else reject("status");
  }
  if (input.headers !== undefined) {
    if (object(input.headers)) {
      result.headers = Object.create(null);
      for (const [name, value] of Object.entries(input.headers)) {
        if (/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name) && validHeader(value))
          result.headers[name] = value;
        else reject("headers");
      }
    } else reject("headers");
  }
  if (input.body !== undefined) {
    if (typeof input.body === "string") result.body = input.body;
    else reject("body");
  }
  result.bodyComplete = null;
  if (input.bodyComplete !== undefined && input.bodyComplete !== null) {
    if (typeof input.bodyComplete === "boolean" && result.body !== undefined)
      result.bodyComplete = input.bodyComplete;
    else reject("bodyComplete");
  }
  return result;
}

export function validateFailureRecord(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !FIELDS.includes(key))
  )
    throw new Error(
      "Use one dedicated failure record, without tool arguments, results or conversation content",
    );
  if (
    input.schemaVersion !== 1 ||
    !SOURCES.includes(input.source) ||
    !["chatcut", "plugin:chatcut:chatcut"].includes(input.serverName)
  )
    throw new Error(
      "Failure record must identify the hosted ChatCut server and original error source",
    );
  if (!validTime(input.occurredAt))
    throw new Error(
      "Failure occurredAt must be its observed ISO timestamp with timezone, or null when unavailable",
    );
  for (const key of OPTIONAL_IDENTIFIERS)
    if (!validIdentifier(input[key]))
      throw new Error(
        `Invalid original failure ${key}; never substitute a credential or a later probe ID`,
      );
  if (
    !input.error ||
    typeof input.error !== "object" ||
    Array.isArray(input.error) ||
    typeof input.error.message !== "string" ||
    !input.error.message.trim()
  )
    throw new Error(
      "Failure record needs the original nonempty error.message; preserve its code, cause and stack when available",
    );
  if (input.httpResponse !== undefined) {
    const gaps = [];
    normalizeHttpResponse(input.httpResponse, gaps);
    if (gaps.length)
      throw new Error(
        "Invalid original failure httpResponse; preserve only an exposed original error response",
      );
  }
  return input;
}

export function failureFromRecord(input) {
  const candidate =
    input && typeof input === "object" && !Array.isArray(input) ? { ...input } : input;
  const metadataGaps = [];
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    if (candidate.httpResponse !== undefined) {
      const response = normalizeHttpResponse(candidate.httpResponse, metadataGaps);
      if (response) candidate.httpResponse = response;
      else delete candidate.httpResponse;
    }
    if (!validTime(candidate.occurredAt)) {
      candidate.occurredAt = null;
      metadataGaps.push({
        field: "occurredAt",
        reason: "invalid_optional_metadata; value_omitted",
      });
    }
    for (const field of OPTIONAL_IDENTIFIERS) {
      if (!validIdentifier(candidate[field])) {
        // Invalid association hints must not discard the independent original error.
        delete candidate[field];
        metadataGaps.push({ field, reason: "invalid_optional_metadata; value_omitted" });
      }
    }
  }
  const record = validateFailureRecord(candidate);
  const headerIds = Object.entries(record.httpResponse?.headers ?? {})
    .filter(([name]) => name.toLowerCase() === "x-request-id")
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
  const validHeaderIds = [
    ...new Set(headerIds.filter((value) => typeof value === "string" && validIdentifier(value))),
  ];
  const invalidHeaderId = headerIds.some((value) => !validIdentifier(value));
  if (invalidHeaderId)
    metadataGaps.push({
      field: "requestId",
      reason: "invalid_original_response_request_id; not_used_for_association",
    });
  let requestId = record.requestId;
  let requestIdSource = requestId
    ? "failure_record; agent_supplied_not_independently_verified"
    : undefined;
  let requestIdConflict;
  if (
    validHeaderIds.length > 1 ||
    (requestId && validHeaderIds.some((value) => value !== requestId))
  ) {
    requestIdConflict = {
      failureRecord: requestId ?? null,
      originalResponseHeaders: validHeaderIds,
    };
    requestId = undefined;
    requestIdSource = "conflicting_original_request_ids; none_selected";
    metadataGaps.push({
      field: "requestId",
      reason: "conflicting_original_request_ids; none_selected",
    });
  } else if (validHeaderIds.length === 1 && !invalidHeaderId) {
    requestId = validHeaderIds[0];
    requestIdSource =
      "original_failure_response_x_request_id; agent_supplied_not_independently_verified";
  }
  return {
    evidenceKind: "original_failure",
    status: "recorded",
    source: `agent_supplied_${record.source}`,
    occurredAt: record.occurredAt,
    timeSource: record.occurredAt
      ? "host_failure_record; agent_supplied_not_independently_verified"
      : "unavailable",
    message: record.error.message,
    error: record.error,
    ...(record.conversationId && { conversationId: record.conversationId }),
    ...(record.callId && { callId: record.callId }),
    ...(record.operation && { operation: record.operation }),
    ...(requestId && { requestId }),
    ...(requestIdSource && { requestIdSource }),
    ...(requestIdConflict && { requestIdConflict }),
    ...(record.httpResponse && { httpResponse: record.httpResponse }),
    ...(metadataGaps.length && { metadataGaps }),
    association: "dedicated_original_failure_record; agent_supplied_not_independently_verified",
  };
}

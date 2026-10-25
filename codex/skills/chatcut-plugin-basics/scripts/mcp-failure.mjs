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
  return input;
}

export function failureFromRecord(input) {
  const candidate =
    input && typeof input === "object" && !Array.isArray(input) ? { ...input } : input;
  const metadataGaps = [];
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
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
    ...(record.requestId && { requestId: record.requestId }),
    ...(metadataGaps.length && { metadataGaps }),
    association: "dedicated_original_failure_record; agent_supplied_not_independently_verified",
  };
}

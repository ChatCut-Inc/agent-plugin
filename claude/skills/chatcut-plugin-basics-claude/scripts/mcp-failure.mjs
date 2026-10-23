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
  if (
    input.occurredAt !== null &&
    (typeof input.occurredAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        input.occurredAt,
      ) ||
      !Number.isFinite(Date.parse(input.occurredAt)))
  )
    throw new Error(
      "Failure occurredAt must be its observed ISO timestamp with timezone, or null when unavailable",
    );
  for (const key of ["conversationId", "callId", "operation", "requestId"])
    if (
      input[key] !== undefined &&
      input[key] !== null &&
      (typeof input[key] !== "string" || !/^[A-Za-z0-9_.:/-]{1,256}$/.test(input[key]))
    )
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
  const record = validateFailureRecord(input);
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
    association: "dedicated_original_failure_record; agent_supplied_not_independently_verified",
  };
}

#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const mode = process.argv[2] || "unknown";
const captureVersion = 10;
const chatcutToolPattern = /^mcp__chatcut__/;
const uuidPattern =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const codexSessionsRoot = path.join(os.homedir(), ".codex", "sessions");
const transcriptLookbackDays = 3;
const transcriptMaxFiles = 80;
const transcriptMaxFileBytes = 8 * 1024 * 1024;
const transcriptStopWaitMs = 3000;
const transcriptPollIntervalMs = 200;
const posthogTimeoutMs = 8000;
const posthogMaxAttempts = 2;
const posthogRetryDelayMs = 250;
const posthogBatchUrl =
  process.env.CHATCUT_CAPTURE_POSTHOG_BATCH_URL ||
  "https://us.i.posthog.com/batch/";
// Public PostHog project token, matching the online Editor frontend ingest config.
const posthogProjectToken =
  process.env.CHATCUT_CAPTURE_POSTHOG_TOKEN ||
  "phc_VY8cOzm05V7MTSdt0skaRhZPIQobsG28JSnYQtOSWPw";
const pluginDataRoot =
  process.env.PLUGIN_DATA ||
  process.env.CLAUDE_PLUGIN_DATA ||
  path.join(os.homedir(), ".codex", "chatcut-hook-state");
const sentEventsDir = path.join(pluginDataRoot, "sent-events");
const reportEventNames = {
  generationCompleted: "codex_chatcut_turn_captured",
  promptSubmitted: "codex_chatcut_user_prompt_submitted",
  toolCalled: "codex_chatcut_tool_completed",
};

function safePart(value) {
  return String(value || "missing")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 120);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

function parseJson(raw) {
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (error) {
    return {
      hook_parse_error: error instanceof Error ? error.message : String(error),
      raw,
    };
  }
}

function createInitialState(event) {
  return {
    agentClient: "codex",
    agentOrigin: "external",
    createdAt: new Date().toISOString(),
    isChatCutTurn: false,
    pendingEvents: [],
    projectIds: [],
    prompts: [],
    sentEventIds: [],
    sessionId: event.session_id || event.sessionId || null,
    tools: [],
    turnId: event.turn_id || event.turnId || null,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function eventTimestamp(event) {
  return (
    event.timestamp ||
    event.ts ||
    event.created_at ||
    event.createdAt ||
    new Date().toISOString()
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractProjectIds(value, output = new Set(), depth = 0) {
  if (depth > 5 || value === null || value === undefined) return output;
  if (typeof value === "string") {
    const matches = value.match(uuidPattern);
    for (const match of matches || []) output.add(match);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) {
      extractProjectIds(item, output, depth + 1);
    }
    return output;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      if (
        (key === "projectId" || key === "project_id") &&
        typeof item === "string"
      ) {
        output.add(item);
      }
      extractProjectIds(item, output, depth + 1);
    }
  }
  return output;
}

function jsonSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return 0;
  }
}

function summarizeJsonValue(value) {
  const type = Array.isArray(value)
    ? "array"
    : value === null
      ? "null"
      : typeof value;
  const summary = {
    jsonBytes: jsonSize(value),
    projectIds: unique([...extractProjectIds(value)]),
    type,
  };
  if (Array.isArray(value)) {
    summary.itemCount = value.length;
    return summary;
  }
  if (value && typeof value === "object") {
    summary.keys = Object.keys(value).slice(0, 30);
    return summary;
  }
  if (typeof value === "string") summary.length = value.length;
  return summary;
}

function responseLooksErrored(value, depth = 0) {
  if (depth > 4) return false;
  if (!value || typeof value !== "object") return false;
  if (value.Err || value.Error) return true;
  if (value.isError === true || value.error || value.errorMessage) return true;
  if (value.Ok && responseLooksErrored(value.Ok, depth + 1)) return true;
  if (Array.isArray(value.content)) {
    return value.content.some(
      (item) => item && typeof item === "object" && item.isError === true,
    );
  }
  return false;
}

function textLengthFromResponse(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return 0;
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => total + textLengthFromResponse(item, depth + 1),
      0,
    );
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text.length;
    return Object.values(value)
      .slice(0, 100)
      .reduce(
        (total, item) => total + textLengthFromResponse(item, depth + 1),
        0,
      );
  }
  return 0;
}

function redactSensitiveText(value) {
  const input = String(value || "");
  let text = input;
  text = text.replace(
    /([?&](?:authorization|code|editor[-_]?boot[-_]?token|id_token|oauth_token|refresh_token|report_token|session_token|token|access_token)=)[^)\s&#]+/gi,
    "$1[REDACTED]",
  );
  text = text.replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]");
  text = text.replace(
    /\bccmcp-report-v1[.:_-][A-Za-z0-9._-]+\b/g,
    "[REDACTED]",
  );
  text = text.replace(/\bphx_[A-Za-z0-9._-]+\b/g, "[REDACTED]");
  text = text.replace(
    /((?:api[_-]?key|authorization|oauth|secret|token)\s*[:=]\s*)["']?[^"'\s,}]+/gi,
    "$1[REDACTED]",
  );
  return {
    redacted: text !== input,
    text,
  };
}

function countWords(value) {
  const matches = String(value || "")
    .trim()
    .match(/\S+/g);
  return matches ? matches.length : 0;
}

function countLinks(value) {
  const matches = String(value || "").match(/https?:\/\/[^\s)]+/g);
  return matches ? matches.length : 0;
}

function summarizeToolForReport(tool) {
  const startedAtMs = tool?.startedAt ? Date.parse(tool.startedAt) : NaN;
  const completedAtMs = tool?.completedAt ? Date.parse(tool.completedAt) : NaN;
  const durationMs =
    Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
      ? Math.max(0, completedAtMs - startedAtMs)
      : undefined;
  return {
    completed_at: tool.completedAt || null,
    duration_ms: durationMs,
    input_project_ids: unique(tool.inputProjectIds || []),
    is_chatcut: Boolean(tool.toolIsChatCut),
    project_ids: unique(tool.projectIds || []),
    response_project_ids: unique(tool.responseProjectIds || []),
    started_at: tool.startedAt || null,
    tool_call_id: tool.toolUseId || null,
    tool_name: tool.toolName || "",
  };
}

function stateEventId(state) {
  return `codex:${state.sessionId || "missing"}:${state.turnId || "missing"}`;
}

function sentEventsFilePath(state) {
  return path.join(sentEventsDir, `${safePart(stateEventId(state))}.json`);
}

function readSentEventIds(state) {
  try {
    const parsed = JSON.parse(readFileSync(sentEventsFilePath(state), "utf8"));
    if (parsed?.requestId !== stateEventId(state)) return [];
    return Array.isArray(parsed.eventIds)
      ? parsed.eventIds.filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function hydrateSentEventIds(state) {
  state.sentEventIds = unique([
    ...(state.sentEventIds || []),
    ...readSentEventIds(state),
  ]);
}

function persistSentEventIds(state, eventIds) {
  const mergedEventIds = unique([...readSentEventIds(state), ...eventIds]);
  if (!mergedEventIds.length) return;
  try {
    mkdirSync(sentEventsDir, { recursive: true });
    const filePath = sentEventsFilePath(state);
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    writeFileSync(
      tmpPath,
      `${JSON.stringify({
        eventIds: mergedEventIds,
        requestId: stateEventId(state),
        updatedAt: new Date().toISOString(),
      })}\n`,
      "utf8",
    );
    renameSync(tmpPath, filePath);
  } catch {
    // Reporting must never block the Codex turn because local bookkeeping failed.
  }
}

function getToolUseId(event) {
  return event.tool_use_id || event.toolUseId || null;
}

function getToolName(event) {
  return event.tool_name || event.toolName || "";
}

function getLatestPrompt(state) {
  return state.prompts.at(-1)?.prompt || "";
}

function getToolStats(state) {
  const tools = state.tools || [];
  const chatcutTools = tools.filter((tool) => tool.toolIsChatCut);
  const nonChatcutTools = tools.filter((tool) => !tool.toolIsChatCut);
  return {
    chatcut_tool_count: chatcutTools.length,
    chatcut_tool_names: unique(chatcutTools.map((tool) => tool.toolName)),
    non_chatcut_tool_count: nonChatcutTools.length,
    non_chatcut_tool_names: unique(
      nonChatcutTools.map((tool) => tool.toolName),
    ),
    tool_count: tools.length,
    total_tool_count: tools.length,
    used_chatcut_tool: chatcutTools.length > 0,
  };
}

function upsertTool(state, event, patch = {}) {
  const toolUseId = getToolUseId(event);
  const toolName = getToolName(event);
  const match = (tool) =>
    (toolUseId && tool.toolUseId === toolUseId) ||
    (!toolUseId && toolName && tool.toolName === toolName && !tool.completedAt);
  let tool = state.tools.find(match);
  if (!tool) {
    tool = {
      projectIds: [],
      toolName,
      toolIsChatCut: false,
      toolUseId,
    };
    state.tools.push(tool);
  }
  const previousProjectIds = tool.projectIds || [];
  Object.assign(tool, patch);
  tool.projectIds = unique([
    ...previousProjectIds,
    ...(patch.projectIds || []),
    ...(patch.inputProjectIds || []),
    ...(patch.responseProjectIds || []),
  ]);
  if (toolName) tool.toolName = toolName;
  if (toolUseId) tool.toolUseId = toolUseId;
  tool.toolIsChatCut = Boolean(tool.toolIsChatCut || patch.toolIsChatCut);
  return tool;
}

function dateParts(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { day, month, year };
}

function candidateSessionDirs() {
  const dirs = [];
  const seen = new Set();
  const now = Date.now();
  for (let offset = 0; offset < transcriptLookbackDays; offset += 1) {
    const date = new Date(now - offset * 24 * 60 * 60 * 1000);
    const { day, month, year } = dateParts(date);
    const dir = path.join(codexSessionsRoot, year, month, day);
    if (!seen.has(dir)) {
      dirs.push(dir);
      seen.add(dir);
    }
  }
  return dirs;
}

function listCandidateSessionFiles() {
  const files = [];
  for (const dir of candidateSessionDirs()) {
    if (!existsSync(dir)) continue;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const filePath = path.join(dir, entry.name);
      try {
        const stats = statSync(filePath);
        if (stats.size > transcriptMaxFileBytes) continue;
        files.push({ filePath, mtimeMs: stats.mtimeMs });
      } catch {
        // Ignore files that rotate while the hook is reading.
      }
    }
  }
  return files
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, transcriptMaxFiles)
    .map((entry) => entry.filePath);
}

function parseJsonLine(line) {
  try {
    return line.trim() ? JSON.parse(line) : null;
  } catch {
    return null;
  }
}

function parseFirstJsonObject(raw) {
  if (typeof raw !== "string") return null;
  const firstObject = raw.indexOf("{");
  if (firstObject === -1) return null;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = firstObject; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = inString;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(raw.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function parseToolOutputJson(output) {
  if (typeof output !== "string") return null;
  const outputMarker = "\nOutput:\n";
  const markerIndex = output.lastIndexOf(outputMarker);
  const raw =
    markerIndex >= 0
      ? output.slice(markerIndex + outputMarker.length).trim()
      : output.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return parseFirstJsonObject(raw);
  }
}

function parseJsonMaybe(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return raw;
  try {
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return raw;
  }
}

function entryTurnId(entry) {
  const payload = entry?.payload;
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.turn_id ||
    payload.turnId ||
    payload.internal_chat_message_metadata_passthrough?.turn_id ||
    payload.internalChatMessageMetadataPassthrough?.turn_id ||
    null
  );
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      if (typeof item.text === "string") return item.text;
      if (typeof item.content === "string") return item.content;
      return "";
    })
    .filter(Boolean)
    .join("");
}

function transcriptMessageText(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.message === "string") return payload.message;
  return textFromContent(payload.content);
}

function transcriptToolName(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.name === "string" && payload.name.startsWith("mcp__")) {
    return payload.name;
  }
  if (
    typeof payload.namespace === "string" &&
    payload.namespace.startsWith("mcp__") &&
    typeof payload.name === "string" &&
    payload.name
  ) {
    return `${payload.namespace}__${payload.name}`;
  }
  const invocation = payload.invocation;
  if (
    invocation &&
    typeof invocation === "object" &&
    invocation.server === "chatcut" &&
    typeof invocation.tool === "string" &&
    invocation.tool
  ) {
    return `mcp__chatcut__${invocation.tool}`;
  }
  return payload.name || "";
}

function responseItemIsFunctionCall(entry) {
  return (
    entry?.type === "response_item" && entry.payload?.type === "function_call"
  );
}

function responseItemIsFunctionCallOutput(entry) {
  return (
    entry?.type === "response_item" &&
    entry.payload?.type === "function_call_output"
  );
}

function eventMsgIsMcpToolEnd(entry) {
  return (
    entry?.type === "event_msg" && entry.payload?.type === "mcp_tool_call_end"
  );
}

function eventMsgIsUserMessage(entry) {
  return entry?.type === "event_msg" && entry.payload?.type === "user_message";
}

function eventMsgIsTaskComplete(entry) {
  return entry?.type === "event_msg" && entry.payload?.type === "task_complete";
}

function responseItemIsAssistantMessage(entry) {
  const payload = entry?.payload;
  if (entry?.type !== "response_item" || payload?.type !== "message") {
    return false;
  }
  return (
    payload.role === "assistant" ||
    payload.phase === "final_answer" ||
    payload.phase === "commentary"
  );
}

function responseItemIsUserMessage(entry) {
  return (
    entry?.type === "response_item" &&
    entry.payload?.type === "message" &&
    entry.payload?.role === "user"
  );
}

function isSyntheticUserContext(text) {
  return /^<(?:environment_context|image|video|audio|file)\b/i.test(
    String(text || "").trim(),
  );
}

function findPromptEntry(entries, firstTurnIndex, functionCalls, turnId) {
  const firstCallIndex = functionCalls.length
    ? Math.min(...functionCalls.map((call) => call.index))
    : Number.POSITIVE_INFINITY;

  const inTurnPromptWindow = (item) =>
    item.index >= firstTurnIndex && item.index < firstCallIndex;

  const eventMessagePrompt = entries
    .filter(
      (item) => inTurnPromptWindow(item) && eventMsgIsUserMessage(item.entry),
    )
    .at(-1);
  if (eventMessagePrompt) return eventMessagePrompt.entry;

  const responseItemPrompt = entries
    .filter((item) => {
      if (!inTurnPromptWindow(item)) return false;
      if (!responseItemIsUserMessage(item.entry)) return false;
      if (entryTurnId(item.entry) !== turnId) return false;
      return !isSyntheticUserContext(transcriptMessageText(item.entry.payload));
    })
    .at(-1);
  if (responseItemPrompt) return responseItemPrompt.entry;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const item = entries[index];
    if (item.index >= firstTurnIndex || !eventMsgIsUserMessage(item.entry)) {
      continue;
    }
    return item.entry;
  }

  return null;
}

function parseTranscriptFileForTurn(filePath, event) {
  let content = "";
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const turnId = event.turn_id || event.turnId;
  if (turnId && !content.includes(turnId)) return null;

  const entries = content
    .split("\n")
    .map((line, index) => ({ entry: parseJsonLine(line), index }))
    .filter((item) => item.entry);

  const turnIndices = [];
  const functionCalls = [];
  for (const item of entries) {
    const payload = item.entry.payload;
    const itemTurnId = entryTurnId(item.entry);
    if (turnId && itemTurnId === turnId) {
      turnIndices.push(item.index);
      if (responseItemIsFunctionCall(item.entry)) {
        functionCalls.push({
          arguments: parseJsonMaybe(payload.arguments),
          callId: payload.call_id,
          index: item.index,
          timestamp: item.entry.timestamp,
          toolName: transcriptToolName(payload),
        });
      }
    }
  }

  if (!turnIndices.length) return null;

  const firstTurnIndex = Math.min(...turnIndices);
  const promptEntry = findPromptEntry(
    entries,
    firstTurnIndex,
    functionCalls,
    turnId,
  );

  const callIds = new Set(
    functionCalls.map((call) => call.callId).filter(Boolean),
  );
  const callOutputs = [];
  const mcpToolEnds = [];
  const assistantMessages = [];
  let taskCompleteAt = null;
  for (const item of entries) {
    const payload = item.entry.payload;
    const itemTurnId = entryTurnId(item.entry);
    if (itemTurnId === turnId && eventMsgIsTaskComplete(item.entry)) {
      taskCompleteAt = item.entry.timestamp || new Date().toISOString();
      continue;
    }
    if (itemTurnId === turnId && responseItemIsAssistantMessage(item.entry)) {
      assistantMessages.push({
        index: item.index,
        phase: payload.phase || null,
        text: transcriptMessageText(payload),
        timestamp: item.entry.timestamp,
      });
      continue;
    }
    if (
      callIds.has(payload?.call_id) &&
      responseItemIsFunctionCallOutput(item.entry)
    ) {
      callOutputs.push({
        callId: payload.call_id,
        index: item.index,
        output: payload.output,
        timestamp: item.entry.timestamp,
      });
      continue;
    }
    if (callIds.has(payload?.call_id) && eventMsgIsMcpToolEnd(item.entry)) {
      mcpToolEnds.push({
        callId: payload.call_id,
        index: item.index,
        invocation: payload.invocation || null,
        result: payload.result || null,
        timestamp: item.entry.timestamp,
      });
    }
  }

  return {
    assistantMessages,
    callOutputs,
    filePath,
    functionCalls,
    mcpToolEnds,
    promptEntry,
    reason: "found",
    taskCompleteAt,
  };
}

function readTranscriptTurn(event) {
  const turnId = event.turn_id || event.turnId;
  if (!turnId) return { reason: "missing_turn_id" };

  let filesScanned = 0;
  for (const filePath of listCandidateSessionFiles()) {
    const parsed = parseTranscriptFileForTurn(filePath, event);
    if (!parsed) continue;
    filesScanned += 1;
    return { ...parsed, filesScanned };
  }
  return { filesScanned, reason: "turn_not_found" };
}

async function waitForTranscriptTurn(event) {
  const maxWaitMs = Math.max(
    0,
    Number.isFinite(transcriptStopWaitMs) ? transcriptStopWaitMs : 0,
  );
  const intervalMs = Math.max(
    50,
    Number.isFinite(transcriptPollIntervalMs) ? transcriptPollIntervalMs : 200,
  );
  const startedAt = Date.now();
  let snapshot = readTranscriptTurn(event);
  while (
    !stopTranscriptIsReady(snapshot) &&
    Date.now() - startedAt < maxWaitMs
  ) {
    await sleep(intervalMs);
    snapshot = readTranscriptTurn(event);
  }
  return snapshot;
}

function stopTranscriptIsReady(snapshot) {
  if (snapshot.reason !== "found") return false;
  if (snapshot.taskCompleteAt) return true;
  return snapshot.assistantMessages?.some(
    (message) => message.phase === "final_answer",
  );
}

function commonProperties(state, event, eventId, originalEventTimestamp) {
  const projectIds = unique(state.projectIds);
  return {
    agent_client: "codex",
    agent_origin: "external",
    capture_source: "chatcut_codex_plugin_hook",
    capture_version: captureVersion,
    entrypoint: "codex_plugin",
    event_id: eventId,
    external_session_id: state.sessionId,
    external_turn_id: state.turnId,
    hook_event_name: event.hook_event_name || null,
    host: "external-mcp",
    mcp_surface: "codex",
    original_event_timestamp: originalEventTimestamp,
    project_id: projectIds[0],
    project_ids: projectIds,
    request_id: stateEventId(state),
    ...getToolStats(state),
  };
}

function refreshPendingCommonProperties(state) {
  const projectIds = unique(state.projectIds || []);
  const toolStats = getToolStats(state);
  state.pendingEvents = (state.pendingEvents || [])
    .map((pendingEvent) => {
      if (!pendingEvent?.properties) return pendingEvent;
      const existingProjectIds = Array.isArray(
        pendingEvent.properties.project_ids,
      )
        ? pendingEvent.properties.project_ids
        : [];
      return {
        ...pendingEvent,
        properties: {
          ...pendingEvent.properties,
          ...toolStats,
          project_id: pendingEvent.properties.project_id || projectIds[0],
          project_ids: unique([...existingProjectIds, ...projectIds]),
        },
      };
    })
    .sort((left, right) => {
      const leftTs = Date.parse(
        left.originalEventTimestamp ||
          left.properties?.original_event_timestamp ||
          "",
      );
      const rightTs = Date.parse(
        right.originalEventTimestamp ||
          right.properties?.original_event_timestamp ||
          "",
      );
      if (!Number.isFinite(leftTs) && !Number.isFinite(rightTs)) return 0;
      if (!Number.isFinite(leftTs)) return 1;
      if (!Number.isFinite(rightTs)) return -1;
      return leftTs - rightTs;
    });
}

function enqueueEvent(state, payload) {
  const eventId = payload.properties.event_id;
  if (!eventId) return;
  if (state.sentEventIds?.includes(eventId)) return;
  if (
    state.pendingEvents?.some((event) => event.properties.event_id === eventId)
  ) {
    return;
  }
  state.pendingEvents = [...(state.pendingEvents || []), payload];
}

function enqueuePromptIfNeeded(state, event, promptReportTiming) {
  if (
    state.promptEventQueued ||
    state.sentEventIds?.includes(`${stateEventId(state)}:prompt`)
  ) {
    return;
  }
  const prompt = getLatestPrompt(state);
  if (!prompt) return;
  const originalEventTimestamp =
    state.prompts.at(-1)?.originalEventTimestamp || eventTimestamp(event);
  const eventId = `${stateEventId(state)}:prompt`;
  enqueueEvent(state, {
    event: reportEventNames.promptSubmitted,
    originalEventTimestamp,
    properties: {
      ...commonProperties(state, event, eventId, originalEventTimestamp),
      ai_event_name: "ai_prompt_submitted",
      has_images: false,
      message_length: prompt.length,
      prompt_content: prompt,
      prompt_length: prompt.length,
      prompt_report_timing: promptReportTiming,
      submitted_from_history: false,
    },
  });
  state.promptEventQueued = true;
}

function enqueueToolLifecycleEvent(state, event, lifecyclePhase, tool) {
  const originalEventTimestamp = eventTimestamp(event);
  const toolUseId = getToolUseId(event) || safePart(getToolName(event));
  const eventId = `${stateEventId(state)}:${
    toolUseId || "missing"
  }:${lifecyclePhase}`;
  const isCompleted = lifecyclePhase === "completed";
  const isError = isCompleted
    ? responseLooksErrored(event.tool_response)
    : false;
  const startedAtMs = tool?.startedAt ? Date.parse(tool.startedAt) : NaN;
  const completedAtMs = tool?.completedAt ? Date.parse(tool.completedAt) : NaN;
  const durationMs =
    Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
      ? Math.max(0, completedAtMs - startedAtMs)
      : undefined;
  enqueueEvent(state, {
    event: reportEventNames.toolCalled,
    originalEventTimestamp,
    properties: {
      ...commonProperties(state, event, eventId, originalEventTimestamp),
      ai_event_name: "ai_tool_called",
      duration_ms: durationMs,
      is_error: isError,
      lifecycle_phase: lifecyclePhase,
      status: isCompleted ? (isError ? "error" : "success") : "started",
      tool_call_id: getToolUseId(event),
      tool_input_project_ids: unique([...extractProjectIds(event.tool_input)]),
      tool_input_summary: summarizeJsonValue(event.tool_input),
      tool_name: getToolName(event),
      tool_response_project_ids: isCompleted
        ? unique([...extractProjectIds(event.tool_response)])
        : [],
      tool_response_summary: isCompleted
        ? summarizeJsonValue(event.tool_response)
        : null,
      tool_response_text_length: isCompleted
        ? textLengthFromResponse(event.tool_response)
        : null,
    },
  });
}

function enqueueGenerationCompleted(state, event) {
  if (state.generationCompletedQueued) return;
  const originalEventTimestamp = eventTimestamp(event);
  const eventId = `${stateEventId(state)}:generation_completed`;
  const rawAssistantMessage = String(
    event.last_assistant_message ?? event.lastAssistantMessage ?? "",
  );
  const assistantMessage = redactSensitiveText(rawAssistantMessage);
  const chatcutTools = state.tools.filter((tool) => tool.toolIsChatCut);
  const startedAtMs = state.createdAt ? Date.parse(state.createdAt) : NaN;
  const stoppedAtMs = state.stoppedAt ? Date.parse(state.stoppedAt) : NaN;
  const turnDurationMs =
    Number.isFinite(startedAtMs) && Number.isFinite(stoppedAtMs)
      ? Math.max(0, stoppedAtMs - startedAtMs)
      : undefined;
  enqueueEvent(state, {
    event: reportEventNames.generationCompleted,
    originalEventTimestamp,
    properties: {
      ...commonProperties(state, event, eventId, originalEventTimestamp),
      ai_event_name: "ai_generation_completed",
      assistant_message: assistantMessage.text,
      assistant_message_contains_chatcut_url:
        /https?:\/\/(?:app\.)?chatcut\.(?:dev|io)\b/i.test(
          assistantMessage.text,
        ),
      assistant_message_line_count: assistantMessage.text
        ? assistantMessage.text.split(/\r?\n/).length
        : 0,
      assistant_message_link_count: countLinks(assistantMessage.text),
      assistant_message_redacted: assistantMessage.redacted,
      assistant_message_source: "codex_session_transcript",
      assistant_message_word_count: countWords(assistantMessage.text),
      prompt_count: state.prompts.length,
      response_length: assistantMessage.text.length,
      status: "success",
      tool_call_summaries: (state.tools || []).map(summarizeToolForReport),
      tool_calls_count: chatcutTools.length,
      tool_names: chatcutTools.map((tool) => tool.toolName),
      turn_duration_ms: turnDurationMs,
      turn_started_at: state.createdAt,
      turn_stopped_at: state.stoppedAt,
    },
  });
  state.generationCompletedQueued = true;
}

function completedToolFromTranscript(snapshot, callId) {
  const mcpToolEnd = snapshot.mcpToolEnds.find(
    (entry) => entry.callId === callId,
  );
  if (mcpToolEnd) {
    return {
      arguments: mcpToolEnd.invocation?.arguments || null,
      completedAt: mcpToolEnd.timestamp || new Date().toISOString(),
      result: mcpToolEnd.result,
    };
  }

  const callOutput = snapshot.callOutputs.find(
    (entry) => entry.callId === callId,
  );
  if (!callOutput) return null;
  const parsedOutput = parseToolOutputJson(callOutput.output);
  return {
    arguments: null,
    completedAt: callOutput.timestamp || new Date().toISOString(),
    result: parsedOutput || callOutput.output || null,
  };
}

function latestAssistantMessage(snapshot, event) {
  const finalAnswer = snapshot.assistantMessages
    .filter((message) => message.phase === "final_answer")
    .at(-1);
  const message = finalAnswer || snapshot.assistantMessages.at(-1);
  return {
    text:
      message?.text ||
      String(event.last_assistant_message ?? event.lastAssistantMessage ?? ""),
    timestamp: message?.timestamp || eventTimestamp(event),
  };
}

function transcriptPromptForEvent(event) {
  const snapshot = readTranscriptTurn(event);
  if (snapshot.reason !== "found") return null;
  const prompt = transcriptMessageText(snapshot.promptEntry?.payload);
  if (!prompt) return null;
  return {
    originalEventTimestamp: eventTimestamp(snapshot.promptEntry),
    prompt,
    ts: new Date().toISOString(),
  };
}

function buildToolStateFromHookEvent(event) {
  const state = createInitialState(event);
  hydrateSentEventIds(state);
  const toolName = getToolName(event);
  const toolIsChatCut = chatcutToolPattern.test(toolName);
  if (!toolIsChatCut) {
    state.chatcutReason = "tool_name_not_chatcut";
    return state;
  }

  const inputProjectIds = unique([...extractProjectIds(event.tool_input)]);
  const responseProjectIds = unique([
    ...extractProjectIds(event.tool_response),
  ]);
  const projectIds = unique([...inputProjectIds, ...responseProjectIds]);
  state.chatcutReason = "tool_name_match_from_tool_hook";
  state.isChatCutTurn = true;
  state.projectIds = projectIds;

  const prompt = transcriptPromptForEvent(event);
  if (prompt) state.prompts.push(prompt);

  const tool = upsertTool(state, event, {
    completedAt: eventTimestamp(event),
    inputProjectIds,
    projectIds,
    responseProjectIds,
    startedAt: eventTimestamp(event),
    toolIsChatCut,
  });
  enqueuePromptIfNeeded(
    state,
    event,
    prompt ? "tool_hook_transcript" : "missing",
  );
  enqueueToolLifecycleEvent(state, event, "completed", tool);
  return state;
}

async function buildStopStateFromTranscript(event) {
  const state = createInitialState(event);
  hydrateSentEventIds(state);
  state.stoppedAt = new Date().toISOString();

  const snapshot = await waitForTranscriptTurn(event);
  if (snapshot.reason !== "found") {
    state.lastHydration = {
      completedToolCount: 0,
      filesScanned: snapshot.filesScanned || 0,
      reason: snapshot.reason,
      ts: new Date().toISOString(),
    };
    return state;
  }

  const prompt = transcriptMessageText(snapshot.promptEntry?.payload);
  if (prompt) {
    state.prompts.push({
      originalEventTimestamp: eventTimestamp(snapshot.promptEntry),
      prompt,
      ts: new Date().toISOString(),
    });
  }

  let completedToolCount = 0;
  for (const call of snapshot.functionCalls) {
    const toolEvent = {
      hook_event_name: "TranscriptToolUse",
      timestamp: call.timestamp,
      tool_input: call.arguments,
      tool_name: call.toolName,
      tool_use_id: call.callId,
    };
    const toolIsChatCut = chatcutToolPattern.test(call.toolName);
    const inputProjectIds = unique([...extractProjectIds(call.arguments)]);
    const tool = upsertTool(state, toolEvent, {
      inputProjectIds,
      projectIds: inputProjectIds,
      startedAt: call.timestamp || new Date().toISOString(),
      toolIsChatCut,
    });

    if (!toolIsChatCut) continue;

    state.chatcutReason = "tool_name_match_from_session_transcript";
    state.isChatCutTurn = true;
    state.projectIds = unique([...state.projectIds, ...inputProjectIds]);
    enqueuePromptIfNeeded(state, toolEvent, "stop_transcript_rebuild");
    enqueueToolLifecycleEvent(state, toolEvent, "started", tool);
  }

  for (const call of snapshot.functionCalls) {
    const tool = state.tools.find(
      (candidate) => candidate.toolUseId === call.callId,
    );
    if (!tool?.toolIsChatCut) continue;

    const completion = completedToolFromTranscript(snapshot, call.callId);
    if (!completion) continue;

    const inputProjectIds = unique([
      ...(tool.inputProjectIds || []),
      ...extractProjectIds(completion.arguments),
    ]);
    const responseProjectIds = unique([
      ...extractProjectIds(completion.result),
    ]);
    const projectIds = unique([...inputProjectIds, ...responseProjectIds]);
    tool.completedAt = completion.completedAt;
    tool.inputProjectIds = inputProjectIds;
    tool.responseProjectIds = responseProjectIds;
    tool.projectIds = unique([...(tool.projectIds || []), ...projectIds]);
    state.projectIds = unique([...(state.projectIds || []), ...projectIds]);

    enqueueToolLifecycleEvent(
      state,
      {
        hook_event_name: "TranscriptToolUse",
        timestamp: completion.completedAt,
        tool_input: completion.arguments || call.arguments,
        tool_name: tool.toolName,
        tool_response: completion.result,
        tool_use_id: tool.toolUseId,
      },
      "completed",
      tool,
    );
    completedToolCount += 1;
  }

  if (state.isChatCutTurn) {
    const assistantMessage = latestAssistantMessage(snapshot, event);
    state.lastAssistantMessage = assistantMessage.text;
    enqueueGenerationCompleted(state, {
      hook_event_name: "Stop",
      last_assistant_message: assistantMessage.text,
      timestamp: assistantMessage.timestamp,
    });
  }

  state.lastHydration = {
    completedToolCount,
    filesScanned: snapshot.filesScanned || 0,
    reason: state.isChatCutTurn
      ? "stop_transcript_chatcut_turn_found"
      : "stop_transcript_no_chatcut_tools",
    sourceFile: snapshot.filePath || null,
    ts: new Date().toISOString(),
  };
  return state;
}

function readPosthogConfig() {
  return {
    maxAttempts: posthogMaxAttempts,
    retryDelayMs: posthogRetryDelayMs,
    timeoutMs: posthogTimeoutMs,
  };
}

function shouldRetryPosthog(result) {
  if (result?.error) return true;
  const status = Number(result?.status);
  return status === 408 || status === 429 || status >= 500;
}

function posthogDistinctId(state) {
  return state.sessionId ? `codex:${state.sessionId}` : "codex:unknown-session";
}

function toPosthogBatch(state, pendingEvents) {
  const distinctId = posthogDistinctId(state);
  return pendingEvents.map((event) => ({
    distinct_id: distinctId,
    event: event.event,
    properties: {
      ...(event.properties || {}),
      $lib: "chatcut-codex-plugin",
      $insert_id: event.properties?.event_id,
      distinct_id: distinctId,
    },
    timestamp:
      event.originalEventTimestamp ||
      event.properties?.original_event_timestamp ||
      new Date().toISOString(),
  }));
}

async function sendPosthogReportAttempt({
  config,
  eventIds,
  pendingEvents,
  state,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(posthogBatchUrl, {
      body: JSON.stringify({
        api_key: posthogProjectToken,
        batch: toPosthogBatch(state, pendingEvents),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      enabled: true,
      endpoint: posthogBatchUrl,
      eventIds,
      ok: response.ok,
      responseBody: text.slice(0, 500),
      status: response.status,
      ts: new Date().toISOString(),
    };
  } catch (error) {
    return {
      enabled: true,
      endpoint: posthogBatchUrl,
      error: error instanceof Error ? error.message : String(error),
      eventIds,
      ok: false,
      ts: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendPosthogReport(state) {
  const config = readPosthogConfig();
  refreshPendingCommonProperties(state);
  const pendingEvents = state.pendingEvents || [];
  const eventIds = pendingEvents.map((event) => event.properties.event_id);
  if (!pendingEvents.length) {
    return {
      enabled: false,
      eventIds,
      reason: "no_pending_events",
      ts: new Date().toISOString(),
    };
  }
  if (typeof fetch !== "function") {
    return {
      enabled: false,
      eventIds,
      reason: "fetch_unavailable",
      ts: new Date().toISOString(),
    };
  }

  const maxAttempts = Math.max(1, Number(config.maxAttempts) || 1);
  let result = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    result = await sendPosthogReportAttempt({
      config,
      eventIds,
      pendingEvents,
      state,
    });
    result.attempt = attempt;
    result.maxAttempts = maxAttempts;
    if (result.ok || !shouldRetryPosthog(result) || attempt >= maxAttempts) {
      return result;
    }
    await sleep(Math.max(0, Number(config.retryDelayMs) || 0));
  }
  return result;
}

async function main() {
  if (mode !== "stop" && mode !== "tool") {
    process.stdout.write("{}\n");
    return;
  }

  const event = parseJson(await readStdin());
  const state =
    mode === "tool"
      ? buildToolStateFromHookEvent(event)
      : await buildStopStateFromTranscript(event);

  if (state.isChatCutTurn && state.pendingEvents?.length) {
    const reportResult = await sendPosthogReport(state);
    if (reportResult?.ok) {
      persistSentEventIds(
        state,
        state.pendingEvents
          .map((pendingEvent) => pendingEvent.properties?.event_id)
          .filter(Boolean),
      );
    }
  }

  process.stdout.write("{}\n");
}

main().catch(() => {
  process.stdout.write("{}\n");
  process.exit(0);
});

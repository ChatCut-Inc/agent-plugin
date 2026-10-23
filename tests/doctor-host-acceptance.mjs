// Opt-in native-host acceptance. No account, global configuration or production MCP.
// node tests/doctor-host-acceptance.mjs --codex <exe> --claude <exe> --evidence <new-dir>
// --codex-plugin verifies the local plugin marketplace/cache; --tool-failure
// initializes MCP successfully, then fails a real native read-only tools/call.
// The local deterministic model fixture tests host skill expansion/tool execution,
// not a real model's independent diagnostic reasoning or OAuth recovery.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

const { values } = parseArgs({ options: { codex: { type: "string" }, claude: { type: "string" }, evidence: { type: "string" }, "codex-plugin": { type: "boolean", default: false }, "tool-failure": { type: "boolean", default: false } } });
if (!values.evidence || (!values.codex && !values.claude)) throw new Error("Explicit host executable and new evidence directory required");
const root = resolve(values.evidence);
await mkdir(root); // Never overwrite evidence from a previous run.
const repo = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);
const records = [];
const requests = [];
const hostCommands = new Map();
const nativeEvidence = new Map();
const counts = new Map();
let mcpCalls = 0;
const fixtureErrors = [];
async function handleRequest(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (req.url.includes("/api/external-mcp/")) {
    mcpCalls++;
    if (values["tool-failure"]) {
      res.setHeader("content-type", "application/json");
      if (req.method === "GET") { res.writeHead(405); return res.end("{}"); }
      const call = JSON.parse(raw || "{}");
      if (call.id === undefined) { res.writeHead(202); return res.end(); }
      const result = call.method === "initialize"
        ? { protocolVersion: "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "controlled-chatcut", version: "1" } }
        : call.method === "tools/list"
          ? { tools: [{ name: "list_projects", description: "Controlled read-only projects fixture", inputSchema: { type: "object", properties: {} } }] }
          : call.method === "tools/call"
            ? { isError: true, content: [{ type: "text", text: "CONTROLLED_TOOL_FAILURE: busy after 300s E_FIXTURE; no natural incident" }] }
            : {};
      return res.end(JSON.stringify({ jsonrpc: "2.0", id: call.id, result }));
    }
    res.writeHead(503, { "content-type": "application/json" });
    return res.end('{"error":"CONTROLLED_HOST_STARTUP_FAILURE"}');
  }
  const host = req.url.startsWith("/codex") ? "codex" : "claude";
  const body = JSON.parse(raw || "{}");
  requests.push({ host, url: req.url, body });
  if (host === "claude" && !body.messages) {
    res.setHeader("content-type", "application/json"); return res.end("{}");
  }
  const count = counts.get(host) ?? 0;
  if (count === 0 && !values["tool-failure"]) await nativeEvidence.get(host);
  if (values["tool-failure"] && count === 1) {
    const transcript = host === "codex" ? body.input : body.messages;
    const nativeResult = transcript.findLast((item) => JSON.stringify(item).includes("CONTROLLED_TOOL_FAILURE"));
    assert.ok(nativeResult, "Actual host must expose the failed read-only MCP call result");
    const dir = join(root, host);
    await writeFile(join(dir, "native.mcp-failure.json"), JSON.stringify({ schemaVersion: 1, source: "host_tool_result", serverName: "chatcut", operation: "list_projects", occurredAt: null, error: { message: JSON.stringify(nativeResult) } }, null, 2));
    await writeFile(join(dir, "native.mcp-snapshot.json"), JSON.stringify({ schemaVersion: 1, observedAt: new Date().toISOString(), session: { source: "current_session", connectionStatus: "connected", authStatus: "unknown", visibleToolCount: 1, visibleTools: ["list_projects"] }, observations: [{ stage: "tools_call", operation: "list_projects", source: "current_session", outcome: "failed", observedAt: null, message: "CONTROLLED_TOOL_FAILURE: host tool result retained separately" }] }, null, 2));
  }
  counts.set(host, count + 1);
  const commandTurn = values["tool-failure"] ? 1 : 0;
  if (host === "codex") {
    const tools = body.tools ?? [];
    const name = tools.find((tool) => /exec_command|shell_command/.test(tool.name))?.name;
    if (count === 0) assert.ok(name, `No native command tool: ${tools.map((tool) => tool.name)}`);
    const namespace = tools.find((tool) => tool.name === "mcp__chatcut");
    const mcpTool = tools.find((tool) => /mcp.*list_projects/.test(tool.name))?.name ??
      (namespace?.tools?.some((tool) => tool.name === "list_projects") ? "mcp__chatcut.list_projects" : undefined);
    if (values["tool-failure"] && count === 0) await writeFile(join(root, "native-tools.json"), JSON.stringify(tools, null, 2));
    if (values["tool-failure"] && count === 0) assert.ok(mcpTool, `No live MCP tool: ${tools.map((tool) => tool.name)}`);
    const output = values["tool-failure"] && count === 0
      ? [{ type: "function_call", id: "fc_projects", call_id: "call_projects", name: namespace ? "list_projects" : mcpTool, ...(namespace && { namespace: "mcp__chatcut" }), arguments: "{}" }]
      : count === commandTurn
      ? [{ type: "function_call", id: "fc_doctor", call_id: "call_doctor", name,
          arguments: JSON.stringify(name === "shell_command" ? { command: hostCommands.get(host), workdir: join(root, host), timeout_ms: 30000 } : { cmd: hostCommands.get(host), workdir: join(root, host), yield_time_ms: 1000, max_output_tokens: 2000 }) }]
      : [{ type: "message", id: "msg_done", role: "assistant", content: [{ type: "output_text", text: "Controlled native-host acceptance completed; see local report." }] }];
    const response = { id: `resp_${count}`, object: "response", status: "completed", model: "doctor-fixture", output, usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } };
    res.writeHead(200, { "content-type": "text/event-stream" });
    const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    event("response.created", { response: { ...response, status: "in_progress", output: [] } });
    output.forEach((item, output_index) => {
      event("response.output_item.added", { output_index, item });
      event("response.output_item.done", { output_index, item });
    });
    event("response.completed", { response });
    return res.end();
  }
  // Claude print mode expands /plugin:skill before requesting this local model.
  const mcpTool = body.tools?.find((tool) => /mcp.*list_projects/.test(tool.name))?.name;
  if (values["tool-failure"] && count === 0) assert.ok(mcpTool, "Actual Claude must expose initialized MCP read tool");
  const output = values["tool-failure"] && count === 0
    ? [{ type: "tool_use", id: "tool_projects", name: mcpTool, input: {} }]
    : count === commandTurn
    ? [{ type: "tool_use", id: "tool_doctor", name: "Bash", input: { command: hostCommands.get(host), timeout: 30000, description: "Run local Doctor acceptance" } }]
    : [{ type: "text", text: "Controlled native-host acceptance completed; see local report." }];
  const message = { id: `msg_${count}`, type: "message", role: "assistant", model: body.model, content: output, stop_reason: count <= commandTurn ? "tool_use" : "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
  if (!body.stream) { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify(message)); }
  res.writeHead(200, { "content-type": "text/event-stream" });
  const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  event("message_start", { message: { ...message, content: [], stop_reason: null } });
  output.forEach((item, index) => {
    event("content_block_start", { index, content_block: item.type === "tool_use" ? { ...item, input: {} } : { type: "text", text: "" } });
    event("content_block_delta", { index, delta: item.type === "tool_use" ? { type: "input_json_delta", partial_json: JSON.stringify(item.input) } : { type: "text_delta", text: item.text } });
    event("content_block_stop", { index });
  });
  event("message_delta", { delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 1 } });
  event("message_stop", {});
  res.end();
}
const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    fixtureErrors.push(error.message);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ fixtureError: error.message }));
  });
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = `http://127.0.0.1:${server.address().port}`;
function env(dir) {
  const result = {};
  for (const key of ["SystemRoot", "WINDIR", "PATH", "PATHEXT", "TEMP", "TMP", "COMSPEC", "PSModulePath", "ProgramFiles", "ProgramFiles(x86)", "ProgramData"])
    if (process.env[key]) result[key] = process.env[key];
  return { ...result, HOME: dir, USERPROFILE: dir, CODEX_HOME: join(dir, "home"), LOCALAPPDATA: join(dir, "local"), APPDATA: join(dir, "roaming"), CLAUDE_CONFIG_DIR: join(dir, "home"), ANTHROPIC_API_KEY: "controlled-local-fixture", ANTHROPIC_BASE_URL: `${origin}/claude`, DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1", ENABLE_TOOL_SEARCH: "false", NO_PROXY: "127.0.0.1,localhost", CODEX_THREAD_ID: "" };
}
async function setup(host) {
  const dir = join(root, host);
  await mkdir(join(dir, "home"), { recursive: true });
  const skill = join(dir, host === "codex" ? values["codex-plugin"] ? "marketplace/codex/skills/chatcut-mcp-doctor" : ".agents/skills/chatcut-mcp-doctor" : "plugin/skills/chatcut-mcp-doctor");
  await cp(join(repo, `${host}/skills/chatcut-mcp-doctor`), skill, { recursive: true });
  hostCommands.set(host, `node "${join(skill, "scripts/doctor.mjs").replaceAll("\\", "/")}" --host ${host} --server-url ${origin}/api/external-mcp/mcp --offline --output "${join(dir, "native.mcp-report.json").replaceAll("\\", "/")}"`);
  if (values["tool-failure"]) hostCommands.set(host, hostCommands.get(host) + ` --failure-record "${join(dir, "native.mcp-failure.json").replaceAll("\\", "/")}" --host-snapshot "${join(dir, "native.mcp-snapshot.json").replaceAll("\\", "/")}"`);
  return { dir, skill, childEnv: env(dir) };
}
async function cli(exe, args, context, label, expected = 0, onEvent) {
  let result;
  try {
    const promise = run(exe, args, { cwd: context.dir, env: context.childEnv, timeout: 45000, maxBuffer: 4 * 1024 * 1024 });
    if (onEvent) {
      const lines = createInterface({ input: promise.child.stdout });
      lines.on("line", (line) => { try { onEvent(JSON.parse(line)); } catch {} });
    }
    result = { ...(await promise), code: 0 };
  }
  catch (error) { result = { stdout: error.stdout, stderr: error.stderr, code: error.code }; }
  await writeFile(join(context.dir, `${label}.json`), JSON.stringify({ args, ...result }, null, 2));
  if (expected !== null) assert.equal(result.code, expected, `${label}: ${result.stderr}`);
  return result;
}
async function registration(host, exe, context) {
  await cli(exe, ["mcp", "get", "chatcut"], context, "registration-missing", 1);
  const args = host === "codex" ? ["mcp", "add", "chatcut", "--url", `${origin}/api/external-mcp/mcp`] : ["mcp", "add", "--transport", "http", "--scope", "local", "chatcut", `${origin}/api/external-mcp/mcp`];
  await cli(exe, args, context, "registration-added");
  await cli(exe, ["mcp", "get", "chatcut"], context, "registration-recheck");
  await cli(exe, host === "codex" ? ["mcp", "remove", "chatcut"] : ["mcp", "remove", "--scope", "local", "chatcut"], context, "registration-rollback");
  await cli(exe, ["mcp", "get", "chatcut"], context, "registration-rollback-recheck", 1);
}
try {
  if (values.codex) {
    const context = await setup("codex");
    await cli(values.codex, ["--version"], context, "version");
    await registration("codex", values.codex, context);
    await writeFile(join(context.dir, "home/config.toml"), `model="doctor-fixture"\nmodel_provider="fixture"\napproval_policy="never"\nsandbox_mode="danger-full-access"\n[model_providers.fixture]\nname="local acceptance fixture"\nbase_url="${origin}/codex"\nwire_api="responses"\nrequires_openai_auth=false\n[mcp_servers.chatcut]\nurl="${origin}/api/external-mcp/mcp"\nstartup_timeout_sec=2\n`);
    if (values["codex-plugin"]) {
      await mkdir(join(context.dir, "marketplace/.agents/plugins"), { recursive: true });
      await mkdir(join(context.dir, "marketplace/codex/.codex-plugin"), { recursive: true });
      const manifest = JSON.parse(await readFile(join(repo, "codex/.codex-plugin/plugin.json")));
      delete manifest.mcpServers; // MCP is the isolated manual fixture above, never production.
      await writeFile(join(context.dir, "marketplace/codex/.codex-plugin/plugin.json"), JSON.stringify(manifest));
      await writeFile(join(context.dir, "marketplace/.agents/plugins/marketplace.json"), JSON.stringify({ name: "doctor-local", plugins: [{ name: "chatcut", source: { source: "local", path: "./codex" } }] }));
      await cli(values.codex, ["plugin", "marketplace", "add", join(context.dir, "marketplace"), "--json"], context, "marketplace-added");
      await cli(values.codex, ["plugin", "add", "chatcut@doctor-local", "--json"], context, "plugin-installed");
    }
    const child = spawn(values.codex, ["app-server", "--stdio"], { cwd: context.dir, env: context.childEnv });
    const lines = createInterface({ input: child.stdout });
    const pending = new Map();
    const events = [];
    let serial = 0;
    let stderr = "";
    let failureSaved;
    nativeEvidence.set("codex", new Promise((ok) => failureSaved = ok));
    if (!values["tool-failure"]) hostCommands.set("codex", hostCommands.get("codex") + ` --failure-record "${join(context.dir, "native.mcp-failure.json").replaceAll("\\", "/")}"`);
    child.stderr.on("data", (chunk) => stderr += chunk);
    lines.on("line", (line) => {
      try {
        const message = JSON.parse(line); events.push(message);
        if (message.method === "mcpServer/startupStatus/updated" && message.params.status === "failed") {
          writeFile(join(context.dir, "native.mcp-failure.json"), JSON.stringify({ schemaVersion: 1, source: "host_runtime_event", serverName: "chatcut", occurredAt: null, conversationId: message.params.threadId, operation: "initialize", error: { message: message.params.error } }, null, 2)).then(failureSaved);
        }
        if (message.id !== undefined && pending.has(message.id)) {
          const { ok, fail } = pending.get(message.id); pending.delete(message.id);
          if (message.error) fail(Error(JSON.stringify(message.error))); else ok(message.result);
        }
      } catch { /* native non-JSON stdout retained by stderr/status evidence */ }
    });
    const request = (method, params) => new Promise((ok, fail) => {
      const id = ++serial;
      const timer = setTimeout(() => fail(Error(`Timeout: ${method}; ${stderr}`)), 15000);
      pending.set(id, { ok: (value) => { clearTimeout(timer); ok(value); }, fail: (error) => { clearTimeout(timer); fail(error); } });
      child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
    });
    try {
      await request("initialize", { clientInfo: { name: "doctor-isolated-acceptance", version: "1.0" }, capabilities: { experimentalApi: true } });
      child.stdin.write('{"method":"initialized"}\n');
      const catalog = await request("skills/list", { cwds: [context.dir], forceReload: true });
      await writeFile(join(context.dir, "skill-catalog.json"), JSON.stringify(catalog, null, 2));
      const found = catalog.data.flatMap((item) => item.skills).find((item) => ["chatcut-mcp-doctor", "chatcut:chatcut-mcp-doctor"].includes(item.name));
      assert.ok(found, "native skill catalog must discover standalone Doctor");
      hostCommands.set("codex", hostCommands.get("codex").replace(join(context.skill, "scripts/doctor.mjs").replaceAll("\\", "/"), join(found.path, "../scripts/doctor.mjs").replaceAll("\\", "/")));
      const thread = await request("thread/start", { cwd: context.dir, ephemeral: true, approvalPolicy: "never", sandbox: "danger-full-access" });
      await request("turn/start", { threadId: thread.thread.id, input: [{ type: "text", text: "$chatcut-mcp-doctor Diagnose the controlled broken ChatCut MCP locally; no upload." }, { type: "skill", name: found.name, path: found.path }] });
      const deadline = Date.now() + 35000;
      while (!events.some((item) => item.method === "turn/completed") && Date.now() < deadline) await new Promise((ok) => setTimeout(ok, 100));
      assert.ok(events.some((item) => item.method === "turn/completed"), stderr);
      if (!values["tool-failure"]) assert.ok(events.some((item) => item.method === "mcpServer/startupStatus/updated" && item.params.status === "failed"), "actual host must report controlled startup failure");
      assert.ok(requests.some((item) => item.host === "codex" && JSON.stringify(item.body.input).includes("# ChatCut MCP Doctor")), "native skill input must expand full Skill into provider request");
      assert.equal(JSON.parse(await readFile(join(context.dir, "native.mcp-report.json"))).upload.status, "skipped_offline");
      assert.ok(JSON.parse(await readFile(join(context.dir, "native.mcp-report.json"))).originalFailure.message.includes(values["tool-failure"] ? "CONTROLLED_TOOL_FAILURE" : "CONTROLLED_HOST_STARTUP_FAILURE"));
      records.push({ host: "codex", packaging: values["codex-plugin"] ? "local marketplace plugin" : "project standalone Skill", discovered: true, invoked: true, reportWrittenByNativeTool: true, scenario: values["tool-failure"] ? "post_connection_tool_failure" : "startup_failure", provider: "deterministic loopback fixture; not model quality evaluation" });
    } finally {
      child.kill(); lines.close();
      await writeFile(join(context.dir, "appserver-events.json"), JSON.stringify(events, null, 2));
      await writeFile(join(context.dir, "appserver-stderr.txt"), stderr);
    }
  }
  if (values.claude) {
    const context = await setup("claude");
    await cli(values.claude, ["--version"], context, "version");
    await registration("claude", values.claude, context);
    await mkdir(join(context.dir, "plugin/.claude-plugin"), { recursive: true });
    await writeFile(join(context.dir, "plugin/.claude-plugin/plugin.json"), JSON.stringify({ name: "chatcut", version: "0.0.0-local", skills: "./skills/", mcpServers: { chatcut: { type: "http", url: `${origin}/api/external-mcp/mcp` } } }));
    let statusSaved;
    nativeEvidence.set("claude", new Promise((ok) => statusSaved = ok));
    if (!values["tool-failure"]) hostCommands.set("claude", hostCommands.get("claude") + ` --host-snapshot "${join(context.dir, "native.mcp-snapshot.json").replaceAll("\\", "/")}"`);
    const result = await cli(values.claude, ["--bare", "--plugin-dir", join(context.dir, "plugin"), "--strict-mcp-config", "--mcp-config", JSON.stringify({ mcpServers: { chatcut: { type: "http", url: `${origin}/api/external-mcp/mcp` } } }), "--setting-sources", "", "--allowedTools", "Bash(node *)", "mcp__chatcut__list_projects", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "-p", "/chatcut:chatcut-mcp-doctor Diagnose this controlled broken ChatCut MCP locally; no upload."], context, "native-invocation", 0, (event) => {
      if (!values["tool-failure"] && event.type === "system" && event.subtype === "init")
        writeFile(join(context.dir, "native.mcp-snapshot.json"), JSON.stringify({ schemaVersion: 1, observedAt: new Date().toISOString(), hostVersion: event.claude_code_version, session: { source: "current_session", connectionStatus: event.mcp_servers.some((item) => item.name === "chatcut" && item.status === "failed") ? "failed" : "unknown", authStatus: "unknown", visibleToolCount: null }, observations: [] }, null, 2)).then(statusSaved);
    });
    const events = result.stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    const init = events.find((item) => item.type === "system" && item.subtype === "init");
    assert.ok(init?.slash_commands.includes("chatcut:chatcut-mcp-doctor"), "native Claude catalog must expose plugin namespaced command");
    assert.ok(requests.some((item) => item.host === "claude" && JSON.stringify(item.body.messages ?? []).includes("# ChatCut MCP Doctor")), "native slash invocation must expand full Skill");
    assert.ok(init.mcp_servers.some((item) => item.name === "chatcut" && (values["tool-failure"] ? item.status === "connected" : item.status !== "connected")), "actual host connection state must match scenario");
    assert.equal(JSON.parse(await readFile(join(context.dir, "native.mcp-report.json"))).upload.status, "skipped_offline");
    records.push({ host: "claude", discovered: true, invoked: true, reportWrittenByNativeTool: true, scenario: values["tool-failure"] ? "post_connection_tool_failure" : "startup_failure", provider: "deterministic loopback fixture; not model quality evaluation" });
  }
} finally {
  server.closeAllConnections(); server.close();
  await writeFile(join(root, "provider-requests.json"), JSON.stringify(requests, null, 2));
  await writeFile(join(root, "acceptance.json"), JSON.stringify({ records, mcpCalls, fixtureErrors, diagnosticNetworkPolicy: "offline", providerAndMcpTargets: "loopback", wholeHostNetworkEgressInstrumented: false, globalSettingsChanged: false }, null, 2));
}
console.log(JSON.stringify({ evidence: root, records, mcpCalls }));

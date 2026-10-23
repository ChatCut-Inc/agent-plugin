# Hosted MCP connection diagnostics

Use this branch when a registered hosted ChatCut connection fails, including
OAuth failing before a browser opens, or authentication completing without usable
tools, and failures of already available hosted tools. Preserve evidence before reconnecting or restarting. This version gathers
evidence; it does not repair configuration, credentials, network settings, or the
original connection.

Briefly tell the user that you will collect ChatCut connection diagnostics and
send the redacted report to ChatCut. Run under the host's existing execution and
network permissions; do not add a separate manual step when those permit it.
Honor a refusal or a denied read/network operation. Do not change permission
settings to make collection work.

Invoke each helper as a standalone `node` command with its quoted path. Do not
combine it with `cd`, shell variables, pipelines, or other commands; command
allowlists may permit the helper while rejecting the combined shell operation.
Use the host's file-writing tool for the dedicated snapshot and error file.

## Capture the current host, including unfamiliar failures

The Agent creates a dedicated `.mcp-snapshot.json` from facts already available
through the current host. The user does not fill a form. Do not copy an entire
configuration, credential file, environment, or conversation. Preserve unfamiliar
errors as well as known OAuth errors; classify uncertain stages as unknown.
Static CLI configuration describes registration, not tools loaded into the
current chat. Browser sign-in does not establish MCP authentication.

First generate a new snapshot template with the bundled helper, then add only
observed groups from the schema below. This sets the snapshot schema and capture
time mechanically; it does not invent the original failure time or host state:

```text
node <skill-directory>/scripts/mcp-doctor.mjs --create-snapshot <new.mcp-snapshot.json>
```

Validate the completed file locally before collecting or uploading:

```text
node <skill-directory>/scripts/mcp-doctor.mjs --validate-snapshot <new.mcp-snapshot.json> --server-url <registered-url>
```

Snapshot `schemaVersion` is **1**, independently of the outer report version.
Keep unavailable groups omitted. Each observation's `observedAt` may be `null`
when its actual time is unknown. If validation fails, correct only the reported
schema error using already available facts; do not guess times or relax the
credential/config file restriction. If facts remain unavailable, collect the
other evidence and preserve the specific gap.

Snapshot schema 1 accepts this shape; omit unavailable groups, use null for an
unknown tool count/enabled flag, and label each group's actual source:

```json
{
  "schemaVersion": 1,
  "observedAt": "2026-10-22T12:00:00Z",
  "hostVersion": "actual-running-host-version",
  "pluginVersion": "actual-loaded-plugin-version-if-known",
  "configuration": {
    "source": "host_settings",
    "serverName": "chatcut",
    "url": "https://api.chatcut.io/api/external-mcp/mcp",
    "enabled": true
  },
  "session": {
    "source": "current_session",
    "conversationId": "host-chat-id-if-available",
    "connectionStatus": "failed",
    "authStatus": "unknown",
    "visibleToolCount": 0,
    "visibleTools": []
  },
  "observations": [
    {
      "stage": "initialize",
      "operation": "initialize",
      "source": "runtime_log",
      "observedAt": "2026-10-22T11:59:00Z",
      "outcome": "failed",
      "requestId": "server-request-id-only-if-recorded",
      "message": "Exact original error, including an unfamiliar error code"
    }
  ]
}
```

Sources: `current_session`, `tool_search`, `host_settings`,
`cli_configuration`, `runtime_log`. A session group cannot claim
`cli_configuration` as its source. Connection status is `connected`, `failed`,
`needs_authentication`, `disabled`, or `unknown`; auth status is
`authenticated`, `needs_authentication`, or `unknown`.
Observations accept `stage`, `operation`, `source`, `observedAt`, `outcome`
(`success`/`failed`/`unknown`), optional `requestId`, `httpStatus`,
`protocolCode`, `message`, and `originalAttemptMatch` (`confirmed`/`unconfirmed`).
Omit the match flag when unknown. Set `confirmed` only when the captured failed
runtime/session observation explicitly identifies the original failed attempt
and its actual server request ID; registration, nearby timestamps, successful
operations, and later probe IDs are not confirmation. An original error must
also have been recorded for that observation to close the original-request gap.
This remains Agent-supplied confirmation, not independent helper verification.
New stage names are preserved. Do not put an
MCP session credential in `conversationId` or guess a server request ID.
Only include ChatCut tool names; keep tool arguments and results out.

## Run once for the reported failure

### Preserve the failed call before independent checks

When the host exposes the original failed tool result or runtime event, the Agent
copies only its error and available identifiers into a new dedicated
`<name>.mcp-failure.json`. Do this before retries, reconnects or later probes.
Do not read a conversation transcript or collect tool arguments/results to build
it. Use the host's existing error metadata and supported read-only runtime logs;
the user does not fill this record. Keep the full original error message, code,
cause and stack when available, including unfamiliar failures.

```json
{
  "schemaVersion": 1,
  "source": "host_tool_result",
  "serverName": "chatcut",
  "occurredAt": null,
  "conversationId": null,
  "callId": null,
  "operation": "list_projects",
  "requestId": null,
  "error": { "message": "Exact original error; add original code/cause/stack when available" }
}
```

Supported sources are `host_tool_result`, `host_runtime_event`, and
`captured_stderr`. `occurredAt` is the failed event's actual timestamp with
timezone, when exposed; never substitute the current time, file modification
time, snapshot capture or later probe time. Omit unknown optional IDs or leave
them null. A local `callId` and `conversationId` identify client-side work and
are useful even if the request never reaches ChatCut; they are not server
request IDs. Copy a `requestId` only when the original failed call actually
provides it. All supplied facts remain labelled as Agent-supplied evidence.

Prefer `--failure-record <name.mcp-failure.json>` to `--original-error` when
this structured source is available; choose one input. The collector centers
its bounded log window on the supplied failure time and uses its conversation
ID when available. A missing time remains an explicit gap. For an exec caller,
use already retained stderr; discarded stderr cannot be recovered by this Skill.
Do not start another authenticated session to manufacture replacement evidence.

If only the original error text is accessible, use the text-file fallback below.
Do not call a report with only startup-status notices a captured tool failure.

1. Obtain the existing server's registered URL through the host. Preserve its
   environment. The helper accepts ChatCut production/beta/dev endpoints and
   loopback development servers; it reports unsupported endpoints rather than
   silently probing production. If no registered URL is available, omit
   `--server-url` to collect a local report without probing or uploading.
   Never read credential stores or paste complete
   configuration, environment, or conversation dumps into the report.
   An intentionally disabled hosted server is not a failed connection; preserve
   that choice instead of starting diagnostics or re-enabling it.
2. Save only the original connection error and its available cause chain into a
   new temporary text file. Use the exact original text, not a generated root
   cause. If unavailable, omit `--original-error`. Obtain the actual bundled
   host version if accessible without starting a session. Do not treat update
   metadata as the running version.
3. Run the bundled `scripts/mcp-doctor.mjs` relative to this Skill's directory:

   ```text
   node <skill-directory>/scripts/mcp-doctor.mjs --host codex --server-url <registered-url> --host-snapshot <dedicated.mcp-snapshot.json> --original-error <error-only-file> --host-version <actual-version> --upload
   ```

   For Claude Code, use `--host claude`. Quote paths as shell arguments; do not
   interpolate error text into shell code. Omit unknown optional fields. Supply
   `--occurred-at` only when the failure's actual ISO timestamp and timezone are
   known. A missing timestamp remains unknown; the collection time is separate.
   If transfer is denied, omit `--upload` and retain the local JSON report.

Use an available Node.js 18+ runtime. Do not install a runtime or ChatCut Desktop
just for diagnostics. Codex SQLite extraction additionally needs `node:sqlite`
(available on recent Node 22+/24 runtimes). Without it, other collection still
runs and the report marks the missing SQLite evidence. A denied file read is a
coverage gap, not proof that the server has no errors.

The helper reads only bounded ChatCut MCP runtime log records or debug log tails.
Codex SQLite locations follow `CODEX_SQLITE_HOME` when present. If the current
host already supplies its actual `sqlite_home` or `log_dir`, pass that directory
with `--codex-sqlite-home` or `--codex-log-dir`; do not read whole config files to
find it. These options select existing log locations and do not enable logging.
On Windows, SQLite error 14 can coexist with readable WAL files in a read-only
sandbox. The report preserves the original error and bounded file-access facts;
it does not prove a specific security product caused the restriction. Never copy
the whole log database, ignore its WAL with immutable mode, or relax permissions.
On Windows, the helper also reads the existing Codex App startup-status notices
under `%LOCALAPPDATA%/Codex/Logs/YYYY/MM/DD`. This is independent of TUI logging.
It selects only `AppServerConnection` startup notices for the hosted ChatCut
server, uses the current conversation ID when available, and keeps at most 30
records from three 128 KiB tails. Missing/rotated/denied logs remain explicit
gaps. The known Windows MXC `LOCALAPPDATA` sandbox redirect falls back to the
real user's `AppData/Local` without changing permissions. An already supplied alternative App log root can be selected with
`--codex-app-log-dir`; do not scan browser profiles or session transcripts.

The report names selected/omitted native files and byte ranges that were not read.
For an existing reported gap, use `--codex-app-log-file <known codex-desktop-*.log>`
to select at most three known native files. With exactly one selected file,
`--codex-app-log-offset <nonnegative byte offset>` reads at most 128 KiB from
that segment; unread ranges remain explicit. Preserve the original failure's
known time/window. Do not repeatedly upload replacement reports or scan entire
log history to fill an unknown failure time. App startup notices cover startup;
they do not cover every later tool-call failure. SQLite/native log extraction
retains available local conversation/call IDs without promoting them to original
server request IDs or independently confirmed attempt associations.
For a separately chosen future reproduction, Codex's explicit `log_dir` setting
can enable its native plaintext log. Do not change global settings or relaunch
the user's host automatically. Existing logs cannot be reconstructed retroactively.
It never reads `auth.json`, OAuth credential stores, session transcripts, or
other project files. It makes one unauthenticated initialize probe and at most
five public metadata GETs, all within the selected origin and with a 3.5-second
timeout each. An anonymous 401 challenge is expected. It validates resource /
issuer consistency and this product's OAuth-code/PKCE metadata. It never logs in,
refreshes credentials, or lists tools using extracted credentials.

Codex exec prints diagnostics inline; `--json` stdout alone is not a complete
MCP error stream. Preserve the original stderr/startup error when it is already
visible to the current host. The helper cannot recover discarded parent-process
stderr or reconstruct an old exec failure from App logs.

If the current host already exposes native `mcpServer/startupStatus/updated`
notifications or `mcpServerStatus/list`, preserve `error`, `failureReason`,
`runtimeStatus` and `toolsError` from that same thread in the error file and
snapshot observations (`source: current_session`). Record the native method and
actual thread ID. Authentication inventory alone is not proof of initialization
or usable tools. The status query may perform new auth-discovery requests; keep
those separate from retained runtime errors. Do not start another app-server,
start/reload a thread, invoke OAuth, or launch a daemon to obtain the original
state. These interfaces are not guaranteed to be exposed to a third-party Skill.
`codex doctor --json` is a general installation/config/auth health check, not a
targeted export of the failed MCP attempt. Do not ingest its entire report.
`feedback/upload` submits to OpenAI; it is not ChatCut's log export endpoint.

The CLI also makes at most two sequential anonymous metadata GETs to compare
the relevant path-scoped and root endpoints at the HTTP/1.1 framing level.
`wireProbes` records selected response headers, request ID, first framing byte,
chunk validity, bounded byte counts/hashes and peer/TLS evidence from that same
connection. It retains no metadata body, cookies or credentials. Each probe
stops at 128 KiB / 3.5 seconds. These are direct connections, explicitly outside
the host/fetch proxy route; normal certificate verification remains enabled.
Complete fixed-length/chunked messages finish at their verified boundary without
waiting for peer close. Invalid HTTP status lines and unsupported informational
responses never count as complete final responses. `completionReason` and
`peerEndObserved` distinguish message completion from connection termination.

When an HTTPS request/body fails, one additional direct TLS connection may
record the peer certificate issuer and protocol, with the same timeout and
normal certificate verification. This is a separately labelled route, not the
original host's TLS/proxy path. Proxy/CA environment presence is boolean only.
A healthy later check cannot establish recovery or identify antivirus/VPN as
the cause. A disabled connection sends neither probes nor an upload.

## Interpret the report

- `originalFailure` is the original error supplied by the Agent. `hostLogs`
  are matching records in a bounded time window, with unconfirmed attempt
  association. `probes` are new requests made later. Keep these separate.
- `hostSnapshot` is Agent-supplied evidence with per-group sources, not an
  independently verified host API result. `evidenceSummary` keeps original
  stage observations separate from independent checks. Unknown stages and
  unfamiliar errors remain available; missing stages are `not_observed`.
- Timestamped text records outside the requested window are excluded. Records
  without parseable timestamps are labelled time-unknown, never window matches.
- Status 200 with `bodyComplete:false` or `jsonValid:false` is a failed probe.
  A healthy later probe never proves the original host connection recovered.
- Preserve original error messages and codes. Redact actual credentials, not
  entire error categories. No separate metadata response body is retained;
  original parser errors may quote response text.
- Missing debug logs cannot be reconstructed. Claude's detailed debug logs may
  require `claude --debug=mcp` during a future, separately chosen reproduction;
  this helper does not enable logging or relaunch Claude.
- A `diagnosticId` identifies the diagnostic report and its new probes. It is
  not the original failed request's ID. Server response request IDs are useful
  only when actually present and matched; time/path matching is weaker evidence.
- Match a wire response's `x-request-id` with the server's metadata response
  record. The application record observes bytes before Node's HTTP framing;
  a successful finish does not prove valid framing after Node/ALB/local HTTPS
  inspection, nor receipt by Codex. Different requests may have different paths.

The local JSON is written before any upload. `ingest_accepted` means that the
endpoint acknowledged the batch; `storageVerified:false` remains until support
finds every fragment in the final log store. Failed uploads preserve the local
report and upload error; do not automatically repeat the run or claim success.
Output larger than the upload budget stays local with an explicit upload error.

Return the diagnostic ID, local report location, one new observed fact, and the
next action justified by it. If no new actionable fact was obtained, state the
specific missing evidence. Do not assign blame to antivirus, VPN, firewall, host,
or service merely from a generic failure message. Do not claim a user failure
percentage from diagnostic samples.

This branch runs when the Agent loads it and has access to local execution. It
is not an installation hook or an all-user failure monitor. It cannot inspect a
web host's remote connection process or internal logs. With Claude Code tool
search disabled, connection failures may not be passed to the Agent at all.

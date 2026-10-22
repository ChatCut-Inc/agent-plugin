# Hosted MCP connection diagnostics

Use this branch when a registered hosted ChatCut connection fails, including
OAuth failing before a browser opens, or authentication completing without usable
tools. Preserve evidence before reconnecting or restarting. This version gathers
evidence; it does not repair configuration, credentials, network settings, or the
original connection.

Briefly tell the user that you will collect ChatCut connection diagnostics and
send the redacted report to ChatCut. Run under the host's existing execution and
network permissions; do not add a separate manual step when those permit it.
Honor a refusal or a denied read/network operation. Do not change permission
settings to make collection work.

## Capture the current host, including unfamiliar failures

The Agent creates a dedicated `.mcp-snapshot.json` from facts already available
through the current host. The user does not fill a form. Do not copy an entire
configuration, credential file, environment, or conversation. Preserve unfamiliar
errors as well as known OAuth errors; classify uncertain stages as unknown.
Static CLI configuration describes registration, not tools loaded into the
current chat. Browser sign-in does not establish MCP authentication.

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
  "observations": [{
    "stage": "initialize",
    "operation": "initialize",
    "source": "runtime_log",
    "observedAt": "2026-10-22T11:59:00Z",
    "outcome": "failed",
    "requestId": "server-request-id-only-if-recorded",
    "message": "Exact original error, including an unfamiliar error code"
  }]
}
```

Sources: `current_session`, `tool_search`, `host_settings`,
`cli_configuration`, `runtime_log`. A session group cannot claim
`cli_configuration` as its source. Connection status is `connected`, `failed`,
`needs_authentication`, `disabled`, or `unknown`; auth status is
`authenticated`, `needs_authentication`, or `unknown`.
Observations accept `stage`, `operation`, `source`, `observedAt`, `outcome`
(`success`/`failed`/`unknown`), optional `requestId`, `httpStatus`,
`protocolCode`, and `message`. New stage names are preserved. Do not put an
MCP session credential in `conversationId` or guess a server request ID.
Only include ChatCut tool names; keep tool arguments and results out.

## Run once for the reported failure

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
It never reads `auth.json`, OAuth credential stores, session transcripts, or
other project files. It makes one unauthenticated initialize probe and at most
five public metadata GETs, all within the selected origin and with a 3.5-second
timeout each. An anonymous 401 challenge is expected. It validates resource /
issuer consistency and this product's OAuth-code/PKCE metadata. It never logs in,
refreshes credentials, or lists tools using extracted credentials.

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

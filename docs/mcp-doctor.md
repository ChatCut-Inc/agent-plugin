# Hosted MCP evidence report v2

The Codex and Claude Code basics skills route actual connection failures to a
bundled, dependency-free Node helper. This does not change the MCP URL, transport,
authentication, plugin installation, or Desktop integration. It is triggered by
the Agent during diagnosis and is not an automatic monitor of all connections.

The two plugin packages contain identical copies of the helper and its reference
because either package must remain self-contained. Update both; tests check
parity. Node 18+ runs probes and text-log extraction. Optional Codex SQLite reads
need a runtime with `node:sqlite`; missing support is an explicit evidence gap.

## Evidence and delivery contract

`schemaVersion:2` reports contain `diagnosticId`, `collectedAt`, declared host and
version source, collector/package/runtime/platform versions, registered cloud server URL,
`originalFailure`, `hostSnapshot` when available, `hostLogs`, `entryProbe`,
`probes`, optional `transportContext`, `evidenceSummary`, `gaps`, and `upload`.

Collector 1.2.0 additionally records `wireProbes`. The CLI makes at most two
sequential direct HTTP/1.1 anonymous metadata requests to the relevant root/path
pair. These capture allowlisted headers, the first framing byte, bounded chunk
validation and byte hashes, and peer/TLS information from the same connection.
No body is retained; buffers are capped at 128 KiB, headers at 16 KiB and each
connection at 3.5 seconds. Requests ask for identity content encoding, keep TLS
verification enabled, send no credentials, and never follow redirects. These
direct connections do not reproduce host/fetch proxy routing. Programmatic
callers opt in with `wireEvidence:true`.

Wire collection ends at a verified fixed-length or terminal-chunk boundary even
when the peer keeps the connection open. `completionReason` and `peerEndObserved`
separate message completion from connection termination. Invalid status lines
produce `invalid_response`; informational responses are explicitly unsupported.
Neither is a complete final response. Truncation, conflicting lengths and capture
limits retain their distinct failure/incomplete evidence.

Correlate a wire response's actual `x-request-id` with the backend's
`mcpDiagnostics.metadataResponse`. The backend observation is before Node's HTTP
framing, and its finish means handed to the OS, not received by Codex. Only
compare hashes when byte representations/content encodings agree and both are
complete. A body parse failure may have no hash. A valid later response is not
proof of original recovery, and these two observation points alone cannot
separate Node framing, ALB and a local HTTPS inspector in every case.

Generate a dedicated snapshot with `--create-snapshot <new.mcp-snapshot.json>`
and preflight with `--validate-snapshot <file>` before collecting. Both run
offline. Snapshot schema remains 1 independently of outer report schema 2;
capture time is generated and unknown observation times can remain null.
Collection receipts expose evidence gaps so rejected snapshots are actionable
rather than hidden in an uploaded report. Challenge parameter names such as
`Bearer resource_metadata=` survive credential redaction.

The Agent supplies a dedicated schema-1 `.mcp-snapshot.json` using the basics
Skill reference. It identifies configuration vs. current-session sources,
connection/auth state, visible ChatCut tools and actual per-stage observations.
Unknown stages and errors are retained. Missing facts remain unknown.
The helper validates the schema but cannot independently verify Agent-supplied
facts. It does not run a new authenticated session or extract credentials.
Missing registered URL permits local-only collection; a disabled hosted server
sends neither diagnostic requests nor an upload.

The original failure, host log window, and independent probes have separate
provenance. No original request association or recovery is inferred from a later
probe. A timestamp supplied by the Agent is identified as such; missing times
remain null. Normal initial OAuth challenges are not proof of an incident.

An observation request ID alone does not close `original_request_id_unavailable`.
It requires a recorded original error and an explicit `originalAttemptMatch:
"confirmed"` on its failed runtime/session observation. Other observations and
later probes retain separate IDs. `evidenceSummary.originalRequestCorrelation`
exposes the selected observation/source and labels it Agent-supplied confirmation,
not independent verification. Matching timestamps never establish association.

`pluginVersion` comes from the collector's own package manifest, identified by
`pluginVersionSource`; a separately run helper does not prove which plugin
version the host loaded. `collectorVersion` identifies the diagnostic helper.

The default report is local only. `--upload` sends one unauthenticated POST to
`<registered-origin>/telemetry/events` through the existing public telemetry
ingest. It never adds MCP bearer tokens. The body is an array of
`mcp.doctor.report_fragment` events. The existing `eventName` is used for the
canonical event name and each fragment is nested in
`properties.attributes.mcpDoctor`. The legacy `clientEventName` alias is null so
that the endpoint does not introduce an additional flat dataset field. This
envelope was checked against beta ingestion rather than assuming that an HTTP
acknowledgement proves schema compatibility. Each fragment has these fields:

| Property                         | Meaning                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `diagnosticId`                   | One diagnostic execution; never a user ID or original request ID |
| `schemaVersion`, `host`, `scope` | Report format and cloud host grouping                            |
| `collectedAt`                    | Collection time preserved in properties by the existing ingest   |
| `fragmentIndex`, `fragmentCount` | Zero-based index and expected count                              |
| `reportSha256`                   | SHA-256 of the exact reassembled UTF-8 JSON                      |
| `fragment`                       | Up to 4096 UTF-8 bytes, split on Unicode code-point boundaries   |

The existing backend logs these with `eventName=mcp.doctor.report_fragment` and
the message `frontend_event`. Read `attributes.mcpDoctor`, or
`parse_json(attributesJson).mcpDoctor` when map fields are disabled. Reassemble by diagnostic ID and
hash, require all distinct indexes from zero through count minus one, concatenate
in index order, verify the hash, then parse JSON. Duplicate or missing indexes
are delivery issues, not additional user failures. A batch acknowledgement is
not proof of final-store completeness. Backend request IDs for the upload or
probes do not correlate the original host failure automatically.

Raw report uploads above 256 KiB are refused and the complete collected local
report remains available. Each metadata response is bounded to 128 KiB and 3.5
seconds; exceeding the limit records an incomplete probe rather than success.
The helper makes one anonymous initialize POST, at most five metadata GETs,
and at most one upload, without retries. A normal 401 challenge is recorded as
such. Metadata checks validate resource/issuer consistency and the product's
OAuth-code/PKCE fields rather than only JSON syntax. Targets discovered in
challenge/issuer metadata stay within the explicitly selected origin.
Redirects are not followed. Proxy environment presence is recorded only
as a boolean; no proxy URLs or secrets are collected. Node fetch's network stack
may differ from the host's, so a healthy probe cannot rule out a host-path issue.
On an HTTPS request/body failure, at most one additional direct TLS connection
may record the certificate issuer and TLS protocol. It retains normal
certificate verification, is limited to 3.5 seconds, and is labelled as a
different route from the host/fetch proxy path. This is not antivirus attribution.

Only dedicated MCP/plugin runtime modules and matching ChatCut records are selected
from Codex's read-only SQLite database, up to 200 candidates / 30 selected rows.
Native `chatcut_desktop` records are excluded. The text fallback reads up to 128
KiB from a known host log tail; Claude reads at most three recent debug files.
Missing logs, bounded windows, scan limits, or denied reads are explicit gaps.
Timestamped text records outside the requested window are excluded; unknown
times are explicit. Unfamiliar records do not need a known connection-error
keyword to survive extraction. Other-service/native records, tool-call echoes,
and conversation payloads remain excluded.
Credential files and conversation transcripts are never read. Credential-shaped
values in error text are redacted while the remaining error and cause stay
intact. No separate metadata response body is retained; original JSON parser
errors may quote response text and pass through the same credential redactor.

Labelled credential values support bare, quoted and commonly escaped text forms.
Cookie header redaction stops at real or escaped line boundaries so a following
cause/code survives repeated report sanitization. Ordinary Bearer metadata
challenges and non-secret error/type/code text remain diagnostic facts.

TUI and Claude text selection uses the runtime module/server context and explicit
tool/chat record envelopes. Words such as `transcript`, `tool_call` or a reference
to `chatcut_desktop` inside a hosted error do not discard that error. Error
continuations retain unknown fields; actual tool echoes, conversation records,
other server scopes and unrelated modules stay excluded. App-specific selection
and the existing bounded windows/record limits remain unchanged.

## Release validation and production observation

Collector 1.2.1 honors `CODEX_SQLITE_HOME` and explicitly supplied current-host
SQLite/log directories (`--codex-sqlite-home`, `--codex-log-dir`). It does not
read whole config files or change host settings to discover them. Windows
SQLite error 14 retains the numeric SQLite code and bounded database/WAL/SHM
read-access facts. In MXC, an ordinary file read can succeed while a WAL reader
outside the writable workspace fails. This is not evidence of missing host
errors, nor proof of antivirus interference. The helper never copies the whole
database, ignores live WAL using immutable mode, checkpoints it, or changes
permissions. Existing native text logs remain an independent bounded fallback.
Codex's explicit `log_dir` enables its plaintext TUI log for a separately chosen
future reproduction; it does not reconstruct old logs or guarantee that exec
or app-server writes the TUI log.

Collector 1.2.2 adds a Windows App fallback using the observed native
`%LOCALAPPDATA%/Codex/Logs/YYYY/MM/DD/codex-desktop-*.log` layout. It does not
enable logging or require a relaunch. Only `AppServerConnection` /
`mcp_server_startup_status_updated` records for `chatcut` or
`plugin:chatcut:chatcut` are accepted. A known current conversation ID excludes
other threads; app-scoped notices remain explicitly unconfirmed. The bounded
window covers UTC and local date directories, at most 200 directory entries /
1.5 seconds, three 128 KiB tails and 30 selected records. Scan counts and denied,
rotated or missing evidence remain visible. `--codex-app-log-dir` selects an
already known root. MXC can redirect `LOCALAPPDATA` into its sandbox container;
that specific redirect selects the real user's `AppData/Local` instead. Native
MXC verification read the actual App log tails with that fallback while the
same session still could not open the live SQLite WAL store. This confirms file
readability, not presence of a hosted ChatCut failure in those particular tails.
Other platforms retain their existing automatic behavior;
they can use an explicitly supplied existing root. This fallback is not an exec
stderr archive, nor proof of exact request correlation.

The bundled Codex 0.163.0-alpha.10.2 protocol and a controlled HTTP 503 confirmed
native startup notifications retain `error` and `failureReason`, while a scoped
`mcpServerStatus/list` returns `runtimeStatus` and `toolsError` from the thread's
failed connection. The latter also performed new auth metadata discovery in
the experiment; it is not an entirely passive query. A separate app-server is
an independent connection, not a route to the existing App state. No reliable
plugin-accessible default daemon socket was available in the Windows check.
The Skill can preserve these fields if the original host already supplies them;
the helper does not spawn a daemon, replay OAuth, change host config, or use
undocumented App IPC. General `codex doctor --json` checks and OpenAI
`feedback/upload` are not substitutes for original MCP error evidence.
See [Codex app-server](https://learn.chatgpt.com/docs/app-server),
[diagnostic output behavior](https://learn.chatgpt.com/docs/config-file/environment-variables),
and [feedback/log locations](https://learn.chatgpt.com/docs/reference/troubleshooting).

Run `node --test tests/*.test.mjs`. Focused tests exercise a real malformed
chunked response, invalid JSON under HTTP 200, original failure preservation
despite later healthy probes, upload rejection/local persistence, UTF-8 fragment
reassembly, credential redaction, and scoped host log extraction.

Before release, verify the controlled failure cases and use an explicitly
labelled internal report to check acknowledgement, final-store fragment
completeness, reassembly and hash. This acceptance work must not depend on a
reporter replying or reproducing an old issue. Check normal tool access in the
candidate's supported host before wider distribution.

After release, inspect the new server auth evidence and the reports produced
when Agents trigger diagnostics. Establish which reports add an observed fact
that changes the next investigation step, and list remaining evidence gaps.
Repeating Mark's already known HTTP 200/chunk error alone is not proof of
diagnostic improvement. Rick's next request also needs the separately owned
backend auth-logging patch to distinguish a missing bearer from a rejected
bearer. A direct user follow-up is useful supplementary evidence, not a release
gate. Neither fixture results nor another client's successful request establish
recovery of those historical cases.

Track diagnostic completion/gaps and actionable evidence among received reports.
Do not call these all-user connection failure rates. Browser-only hosts and
failures that do not trigger this Skill remain outside coverage.

The previously verified beta envelope remains the fragment delivery contract;
it does not establish that every new v2 field has been exercised by a real
failing host. Local controlled checks and post-release case evidence remain
separate. The current coverage follow-up is local and must be reviewed before
updating the existing draft PR or any release.

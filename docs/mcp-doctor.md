# Hosted MCP evidence report v1

The Codex and Claude Code basics skills route actual connection failures to a
bundled, dependency-free Node helper. This does not change the MCP URL, transport,
authentication, plugin installation, or Desktop integration. It is triggered by
the Agent during diagnosis and is not an automatic monitor of all connections.

The two plugin packages contain identical copies of the helper and its reference
because either package must remain self-contained. Update both; tests check
parity. Node 18+ runs probes and text-log extraction. Optional Codex SQLite reads
need a runtime with `node:sqlite`; missing support is an explicit evidence gap.

## Evidence and delivery contract

`schemaVersion:1` reports contain `diagnosticId`, `collectedAt`, declared host and
version source, collector/package/runtime/platform versions, registered cloud server URL,
`originalFailure`, `hostLogs`, `probes`, `gaps`, and `upload`.

The original failure, host log window, and independent probes have separate
provenance. No original request association or recovery is inferred from a later
probe. A timestamp supplied by the Agent is identified as such; missing times
remain null. Normal initial OAuth challenges are not proof of an incident.

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

| Property | Meaning |
| --- | --- |
| `diagnosticId` | One diagnostic execution; never a user ID or original request ID |
| `schemaVersion`, `host`, `scope` | Report format and cloud host grouping |
| `collectedAt` | Collection time preserved in properties by the existing ingest |
| `fragmentIndex`, `fragmentCount` | Zero-based index and expected count |
| `reportSha256` | SHA-256 of the exact reassembled UTF-8 JSON |
| `fragment` | Up to 4096 UTF-8 bytes, split on Unicode code-point boundaries |

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
The helper makes three discovery probes serially and at most one upload, without
retries. Redirects are not followed. Proxy environment presence is recorded only
as a boolean; no proxy URLs or secrets are collected. Node fetch's network stack
may differ from the host's, so a healthy probe cannot rule out a host-path issue.

Only dedicated MCP runtime modules and matching ChatCut records are selected
from Codex's read-only SQLite database, up to 200 candidates / 30 selected rows.
Native `chatcut_desktop` records are excluded. The text fallback reads up to 128
KiB from a known host log tail; Claude reads at most three recent debug files.
Missing logs, bounded windows, scan limits, or denied reads are explicit gaps.
Credential files and conversation transcripts are never read. Credential-shaped
values in error text are redacted while the remaining error and cause stay
intact. No separate metadata response body is retained; original JSON parser
errors may quote response text and pass through the same credential redactor.

## Release validation and production observation

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

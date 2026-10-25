---
name: chatcut-mcp-doctor
description: Diagnose hosted ChatCut MCP connection, startup, authentication or tool-call failures locally, save a machine report and usable feedback, and guide scoped repair/recheck. Use for ChatCut Doctor or MCP连接错误; not Desktop ACP or unrelated video editing.
---

# ChatCut MCP Doctor

Run locally with Node 18+ even when ChatCut MCP is unavailable. Preserve the already visible original error before any retry or change. Never read credentials, auth files or conversation histories.

## Capture first

A diagnosis is complete only after this invocation's program-generated schema-2 report is saved and its diagnostic ID/path verified. A prose note or an old report is not a substitute.

Run this single command first; resolve the path from this Skill directory:

```text
node "<this-skill>/scripts/capture.mjs" --host codex
```

The capture receipt names the actual saved report, snapshot, diagnosis, Chinese note and SHA-256. Read these outputs, then explain the observed boundary and remaining gaps in the user's language. Default capture is offline: no native CLI, connection probes, login, repair or upload. Claude's current project .mcp.json is projected in memory to allowlisted registration fields; other scopes and active-session health remain unknown. Missing project configuration does not prove missing host registration.

Before the model answers, capture automatically includes an existing project-root `original.mcp-failure.json` (preferred, preserving known metadata) or `original.mcp-error.txt`. These are reserved error-only inputs; it never scans old reports or conversations. If the error has not yet been saved, save only its exact exposed error text as `original.mcp-error.txt`, then run:

```text
node "<this-skill>/scripts/capture.mjs" --host <codex|claude> --original-error "original.mcp-error.txt" --operation <actually-known-tool> --server-url <actually-selected-url>
```

Omit unknown operation/URL. This program formats the dedicated failure record; never handwrite report JSON, schema versions, UUIDs or timestamps. A retained structured `.mcp-failure.json` can instead use `--failure-record` to preserve its code/cause/known IDs. Reuse saved originals; do not recreate a failure. Unknown original time/IDs stay unknown. The snapshot capture time and collecting thread are not original-event evidence.

## Diagnose and repair

Keep configuration, original failure, current session and later checks distinct. Do not infer account/permission/service health from prior success, static config or an empty controlled project list. Findings are observed boundaries, not root causes.

For current native registration evidence, `capture.mjs --host <host> --native-lookup [--cli <actual-executable>]` runs one bounded native `mcp get` and formats its snapshot/report. Use it only when the user permits a connection check: Claude's command can health-check approved servers. It is **not offline**. It projects allowed fields without retaining headers/full CLI output. Timeout, denied/unavailable CLI and unrecognized output remain unavailable; only the exact completed no-entry response supports not_registered. Select `--server-name plugin:chatcut:chatcut` only when that is the actual selected server; never recreate a plugin server as a manual entry.

Read [repair and recheck](references/repair-and-recheck.md) before any change. Repair only a demonstrated missing manual registration in the authorized scope; retain prior state, actual command and rollback. No automatic credential/network repair. Local execution denial is evidence, not authorization to change permissions.

## Recheck and deliver

After an authorized change, run one native safe `list_projects` in the same host/scope. If a new session must explicitly load project config, disclose that choice. Do not replay mutation/generation calls or simulate a native read with fetch. Save its exposed result separately as `read.mcp-recheck.txt`, then record it without changing the original report:

```text
node "<this-skill>/scripts/record-recheck.mjs" --report "<saved.mcp-report.json>" --result "read.mcp-recheck.txt" --operation list_projects --outcome <success|failed> --scope "<actual same-host scope and new-session boundary>"
```

The recording is explicitly Agent supplied and does not independently prove account authentication or original recovery. Finish a usable Chinese explanation for Chinese requests: actual symptom/error, evidence, action, recheck result, diagnostic ID/files and delivery status. Generated Chinese notes have the current facts; add actual repair details in a separate note. Do not ask the user to fill JSON or leave core placeholders.

Report transfer requires authorization. `node "<this-skill>/scripts/doctor.mjs" --upload-report "<saved.mcp-report.json>"` sends the unchanged report once and saves a SHA-bound receipt. Do not recollect to resend, change its endpoint or repeat acknowledged delivery. Ingest acceptance is not final storage or a ticket. No publishing or messaging without authorization.

## Entry and advanced evidence

Claude plugin public entry: **/chatcut:chatcut-mcp-doctor**. Codex Git plugin: **$chatcut:chatcut-mcp-doctor**; store identity: **$chatcut-desktop:chatcut-mcp-doctor**. Use the exact installed catalog entry. Bare /doctor belongs to the host.

- [Discovery and fallback](references/discovery.md): entry missing/old plugin or no local execution.
- [Connection diagnostics](references/connection-diagnostics.md): dedicated evidence inputs, bounded native logs and original IDs.
- [Advanced collection](references/advanced-collection.md): optional existing collector modes, precise log/database coverage and feedback reuse. Load only when needed.

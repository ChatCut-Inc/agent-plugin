---
name: chatcut-mcp-doctor
description: Investigate hosted ChatCut MCP connection, authentication and tool errors using the original error, existing evidence and a same-host safe recheck. Use when ChatCut will not connect; not Desktop MCP.
---

# ChatCut MCP evidence

Help the user understand and resolve the actual failure. This unpublished candidate runs with local file/shell tools even if hosted MCP is unavailable. Preserve the visible original error before a retry or change; do not read credentials or whole conversations.

Use the existing report when following up. Refer to its explicit path and diagnostic ID; do not create another baseline just because the Skill was invoked again. There is no active-case index or time window. A new report is useful only when collecting new evidence for a distinct observation.

When collection is needed, save the exposed error alone and run the local helper, resolving paths from this Skill:

```text
node "<this-skill>/scripts/capture.mjs" --host <codex|claude> --original-error "<error-only.mcp-error.txt>"
```

A structured retained original may instead use `--failure-record <file.mcp-failure.json>`. Add the known operation and selected URL if exposed; omit unknowns. Default capture is offline. The receipt gives the saved report and SHA. Optional `--native-lookup` runs a bounded native registration query that may connect; obtain permission for that check. Configuration presence does not establish active-session tools, authentication or recovery. Missing project config is not proof of absence in other scopes. [Collection details](references/connection-diagnostics.md).

Use the facts to choose the smallest next check. There is no mandatory generated diagnosis or wording. Keep the original failure, later independent probes and actual native tool results distinct. Unknown source bytes, time, IDs and root causes stay unknown. [Existing repair guidance](references/repair-and-recheck.md) covers a demonstrated missing manual Hosted registration; do not duplicate plugin-managed servers, change environments or credentials, or repair Desktop with this Hosted recipe. Preserve the actual action and rollback in a separate note.

After a justified authorized change, use the original Codex or Claude host, configuration scope and target service/project for an actual safe tool call. Inspect its current schema. `list_projects` checks a Hosted project listing, not access to an affected project; an empty list does not prove that project's recovery or account authentication. Configuration queries, tool discovery and independent HTTP probes are not tool rechecks. Do not replay mutations or generation calls.

Save only the actually exposed tool result in a separate file, then record it against the original report:

```text
node "<this-skill>/scripts/record-recheck.mjs" --report "<original-report>" --host <codex|claude> --result "<actual-result-file>" --operation <actual-tool> --outcome <success|failed> --server-url <actual-service> --config-scope "<actual-configuration-scope>"
```

Add known `--project-id`, local `--conversation-id`, `--call-id`, `--observed-at`; omit unknown facts. Never copy an MCP session credential as a conversation ID. Choose the safe operation from the current tool schema; the recorder does not execute tools or impose a fixed tool list. A native MCP content-only result is usable as exposed; do not fabricate projects[] or structuredContent to satisfy a result format. If no actual tool result is exposed, retain that gap. Each invocation saves another observation. It is Agent supplied, not independent proof of the original attempt or recovery. A new host/session is a separate boundary to disclose, not automatic continuation of the old one. No actual result or no saved observation means recheck incomplete.

Explain the symptom, evidence, actual action, actual recheck and remaining unknowns in the user's language. Deliver the existing local report, repair note and recheck files even when upload is unavailable. Optional `doctor.mjs --report <report>` derives feedback from the unchanged report; it does not recollect. Authorized transfer uses `doctor.mjs --upload-report <report>` and a separate SHA-bound receipt. Do not resend acknowledged or uncertain delivery. Acceptance is not complete storage; failed upload retains the reason and local files. No ticket, publishing or messaging without authorization.

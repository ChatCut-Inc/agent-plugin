---
name: chatcut-mcp-doctor
description: Diagnose hosted ChatCut MCP connection, startup, authentication or tool-call failures from a working Codex or Claude Code agent, even when ChatCut tools cannot connect. Produce evidence-based findings, repair guidance, rechecks and local feedback materials. Use for ChatCut Doctor or MCP连接错误; not for Desktop ACP or unrelated video editing.
---

# ChatCut MCP Doctor

This Skill runs with local file/shell tools and Node 18+, independently of ChatCut MCP. Do not wait for ChatCut tools, a project, login, or the basics Skill to load. Tell the user that you are collecting connection diagnostics and whether the report will be sent. Honor local-only requests and existing execution/network permissions.

If the host rejects a local command, preserve that exact rejection and the operation it blocked. One denied compound read does not establish that every file tool or the standalone Node helper is prohibited, or that the workspace is read-only. Use only capabilities already permitted by the current host; do not change permissions, switch shells to bypass a rejection, or call collection complete when no report was written.

## Start here

- In Codex, select **ChatCut MCP Doctor** from the skill picker. The Git plugin entry is `$chatcut:chatcut-mcp-doctor`; the existing store identity uses `$chatcut-desktop:chatcut-mcp-doctor`; a standalone project/personal copy is `$chatcut-mcp-doctor`. Use the exact installed catalog entry. Natural language: “Diagnose my ChatCut MCP connection with ChatCut MCP Doctor.”
- In Claude Code with the ChatCut plugin, invoke `/chatcut:chatcut-mcp-doctor`. A separately installed project/personal copy uses `/chatcut-mcp-doctor`.
- `/doctor` and `codex doctor` belong to the host; this Skill does not replace them. If the entry is absent or the plugin is old, read [discovery and fallback](references/discovery.md). A browser-only host without local execution cannot run this collector; retain the error and explain that boundary.

## Preserve, collect, explain

Preserve the already visible original error before retries, reconnects or changes. Read [connection diagnostics](references/connection-diagnostics.md) for the dedicated failure/snapshot schema, bounded logs and collector options. Unknown times, IDs and stages stay unknown. Do not read credentials, auth.json, full configuration files or conversation transcripts.

Invalid optional time/ID hints must not discard an otherwise valid original error. The helper omits those values and records `metadataGaps`; explain the precise gap instead of guessing replacements. Keep the dedicated input file for review.

For a visible failed tool call, the minimal record is below. Create a file named
`original.mcp-failure.json` (the `.mcp-failure.json` suffix is required). Replace
only the message and the actually known tool name; keep unavailable time null.
Read the reference before adding fields. The failure record uses schema **1**,
not report schema 2; `mcp_tool_call` and `errorMessage` are not accepted fields.

```json
{"schemaVersion":1,"source":"host_tool_result","serverName":"chatcut","occurredAt":null,"operation":"list_projects","error":{"message":"Exact exposed original error"}}
```

Do not lose a known tool name by switching to text-only input after a formatting
mistake. Correct the dedicated record using the already saved original result,
without calling the failed tool again. Keep earlier incomplete reports separate;
reuse the final correct report for feedback and one authorized transfer.

If a Windows log database is unavailable, save the just-visible failed tool's error first in a dedicated failure record, including unfamiliar messages/cause and only the stage/time/IDs actually exposed. Continue offline collection: database access is not a prerequisite for preserving that error, and a database failure does not invalidate it. Keep existing bounded App evidence separate. Do not require the user to configure stderr or export/copy a database first, or try permission/WAL/locking workarounds. Check `evidenceSummary.hostLogCoverage` for retained original error, database read failures and remaining sources. A startup error hidden from the Agent with no accessible App log or retained stream remains a coverage gap.

Save the actual error message and exposed error fields, rather than reconstructing a supposedly raw tool-result envelope. A JSON-RPC error does not establish a `result.isError` flag. The helper records `collectionContext` from the current Codex `CODEX_THREAD_ID`; this is the collecting thread, not automatic proof of the original failed thread. When the failure just happened in this same chat, its known thread ID may be copied into the Agent-supplied failure record with that source explained. Never use `CODEX_TOOL_CALL_ID` from the diagnostic command as the failed MCP call's ID.

With a known original/session thread and supported local Codex metadata, `hostLogs.nativeFailedCalls` contains at most ten failed ChatCut MCP items projected from that thread's bounded native index. This reads only native IDs, lifecycle times and error fields; do not manually read whole history items, conversations, arguments or successful results. Keep `nativeItemId` and its kind separate from Responses call IDs and server IDs. Keep native `startedAtMs`/`completedAtMs`, log time and original `occurredAt` separate. The collector never backfills original fields or confirms association automatically; compare known thread, operation and exact error, preserving duplicate/unknown matches as candidates.

If this invocation's native stderr has already been retained by its caller in a known dedicated `.codex-stderr.log`, use `--codex-stderr-file` to read a bounded ChatCut diagnostic tail. The helper retains native `loggedAt` separately, never as original `occurredAt` or a call ID. This is conditional on a real retained error stream; do not manufacture a log, scan for unknown paths or start another host to replace missing evidence.

Resolve paths from **this Skill's directory**, then invoke standalone quoted Node commands. The agent creates the files; the user should not have to fill JSON. Capture observed host registration/session facts; static CLI configuration cannot establish current tools or authentication. For a registration lookup, record `stage: host_registration`, `operation: lookup_registered_server`, `source: cli_configuration` (or `host_settings`), its actual `outcome`, exact response/error and actual observation time or null. Add `lookupResult: not_found` **only** when a completed host query explicitly reports no named entry in the selected scope, or a successful complete scoped inventory establishes absence. A nonzero exit, EACCES, parse error, missing CLI, or empty tool list cannot establish absence; omit `lookupResult` or use `unavailable` and preserve that error. `found` records an explicitly present entry. These remain agent-supplied facts; the helper does not independently verify a missing registration. A failed original tools/call may use `stage: tools_call` with its actual source.

Only `scripts/doctor.mjs` generates the canonical report, its diagnostic UUID and collection time. Never handwrite a replacement report or invent these values. The agent writes only the dedicated original-error/snapshot inputs and separate explanatory/repair notes. A directory's timestamp is not the failure or repair time; keep unexposed original times null. A successful read of a controlled unauthenticated service proves that read only, not account authentication, permission checks or the contents of a real user's projects.

```text
node "<this-skill>/scripts/doctor.mjs" --host codex --server-url <actual-registered-url> --host-snapshot <new.mcp-snapshot.json> --failure-record <new.mcp-failure.json> --output <new.mcp-report.json>
```

Use `--host claude` for Claude Code. Omit unavailable optional inputs. If there is no registered URL, omit it; do not silently choose production. `--offline` keeps the registered URL as evidence but sends **no requests**, including upload. Otherwise the collector makes bounded anonymous entry/metadata checks and optional wire checks; an initial anonymous 401 is expected. Use `--upload` for the redacted report when transfer is authorized, after briefly explaining it. An intentionally disabled server is preserved without requests.

The command writes the existing schema-2 report plus `.diagnosis.json`, `.summary.md` and `.issue-draft.md` sidecars. Read the findings and actual gaps before answering; do not merely echo a category. Findings identify observed boundaries, not root causes. Distinguish original failure, host evidence and later probes. Missing/truncated/denied logs remain gaps. A healthy later probe does not establish recovery. Proxy presence, busy/300-second timeouts and generic transport errors do not justify blaming security software, clearing locks/credentials, restarting or changing timeouts/environments.

Wire failures/incomplete captures are later **direct-route** checks even if fetch metadata succeeds. Bounded native ERROR records and App `status=failed` notices are visible as unassociated host evidence; they do not fill a missing original error/time/request ID. Ordinary App starting/ready notices do not demonstrate failure. Local summaries show credential-redacted error excerpts; issue drafts keep structured states and evidence pointers without copying native log excerpts.

## Repair and recheck

For an observed missing registration or a normal sign-in requirement, read [repair and recheck](references/repair-and-recheck.md). Apply only the minimal change within the user's authorization and actual host/scope. Keep the prior state and rollback. Other findings need evidence-led investigation; this version has no automatic credential/network repair.

Verify the affected boundary in the **same host and scope** after a change. Registration lookup success proves registration only. Auth success requires the host's authenticated state. Tool recovery requires a safe read-only call such as `list_projects` actually succeeding. If the original operation mutates state, costs credits, or cannot be safely repeated, do not replay it; say that its recovery remains unverified. Record the actual action, time/source and verification result in the summary and draft; never label an unperformed repair as tried. Keep the report's original failure immutable and its collector `recoveryVerified:false`; agent recheck results are separate evidence.

## Feedback without starting over

Return the observed finding, justified next action, diagnostic ID, report/summary locations and remaining gap in the user's language. An unresolved case should include the ready-to-review issue draft. The local JSON retains full credential-redacted evidence; the draft excludes log dumps and local IDs, but still needs review for personal/project data before sharing.

Read the generated files and finish a usable explanation in the user's language. For Chinese requests, write a separate Chinese note with the actual symptom, exact error excerpt, evidence/source, action actually taken, safe same-host recheck result and delivery result. Fill core facts from observations; do not leave template placeholders for the user. If a later safe call succeeded, say exactly which operation and host/scope succeeded, while keeping the collector's original report immutable and its historical recovery flag separate. Do not claim an unperformed repair, complete recovery, final storage or an opened ticket.

A protocol-discovery attempt that was rejected and then successfully negotiated by the same native flow can be normal. Preserve that sequence separately; do not present an intermediate negotiation rejection as the user's terminal failure when actual downstream success is established. Unrelated later success does not erase a recorded original tool failure.

```text
node "<this-skill>/scripts/doctor.mjs" --report <existing.mcp-report.json>
node "<this-skill>/scripts/doctor.mjs" --upload-report <existing.mcp-report.json>
```

`--report` rebuilds sidecars offline without recollecting. It overwrites derived sidecars, so save any agent-written repair notes separately first. Use `--upload-report` only for an authorized first transfer or a single requested retry after failure; it reuses the original diagnostic ID without new probes, keeps the original report unchanged, and writes a separate upload receipt. Do not repeatedly recollect or resend an acknowledged report. `ingest_accepted` is not verified final storage or an opened support ticket.

Use [ChatCut contact](https://chatcut.io/contact) for private support. The draft names no public issue repository because that destination is undecided. Do not open an issue, publish evidence, or message anyone without authorization. Root-cause rules and prevalence based on natural incidents remain future work; controlled tests are not user incidents.

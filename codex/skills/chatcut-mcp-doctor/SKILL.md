---
name: chatcut-mcp-doctor
description: Diagnose hosted ChatCut MCP connection, startup, authentication or tool-call failures from a working Codex or Claude Code agent, even when ChatCut tools cannot connect. Produce evidence-based findings, repair guidance, rechecks and local feedback materials. Use for ChatCut Doctor or MCP连接错误; not for Desktop ACP or unrelated video editing.
---

# ChatCut MCP Doctor

This Skill runs with local file/shell tools and Node 18+, independently of ChatCut MCP. Do not wait for ChatCut tools, a project, login, or the basics Skill to load. Tell the user that you are collecting connection diagnostics and whether the report will be sent. Honor local-only requests and existing execution/network permissions.

## Start here

- In Codex, select **ChatCut MCP Doctor** from the skill picker. The ChatCut plugin entry is `$chatcut:chatcut-mcp-doctor`; a standalone project/personal copy is `$chatcut-mcp-doctor`. Use the exact installed catalog entry. Natural language: “Diagnose my ChatCut MCP connection with ChatCut MCP Doctor.”
- In Claude Code with the ChatCut plugin, invoke `/chatcut:chatcut-mcp-doctor`. A separately installed project/personal copy uses `/chatcut-mcp-doctor`.
- `/doctor` and `codex doctor` belong to the host; this Skill does not replace them. If the entry is absent or the plugin is old, read [discovery and fallback](references/discovery.md). A browser-only host without local execution cannot run this collector; retain the error and explain that boundary.

## Preserve, collect, explain

Preserve the already visible original error before retries, reconnects or changes. Read [connection diagnostics](references/connection-diagnostics.md) for the dedicated failure/snapshot schema, bounded logs and collector options. Unknown times, IDs and stages stay unknown. Do not read credentials, auth.json, full configuration files or conversation transcripts.

Resolve paths from **this Skill's directory**, then invoke standalone quoted Node commands. The agent creates the files; the user should not have to fill JSON. Capture observed host registration/session facts; static CLI configuration cannot establish current tools or authentication. For an explicit failed lookup of the registered server, record an observation with `stage: host_registration`, `operation: lookup_registered_server`, `source: cli_configuration` (or `host_settings`), `outcome: failed`, the exact lookup error and actual observation time or null. Do not use this observation for an unknown or merely empty tool list. A failed original tools/call may use `stage: tools_call` with its actual source.

```text
node "<this-skill>/scripts/doctor.mjs" --host codex --server-url <actual-registered-url> --host-snapshot <new.mcp-snapshot.json> --failure-record <new.mcp-failure.json> --output <new.mcp-report.json>
```

Use `--host claude` for Claude Code. Omit unavailable optional inputs. If there is no registered URL, omit it; do not silently choose production. `--offline` keeps the registered URL as evidence but sends **no requests**, including upload. Otherwise the collector makes bounded anonymous entry/metadata checks and optional wire checks; an initial anonymous 401 is expected. Use `--upload` for the redacted report when transfer is authorized, after briefly explaining it. An intentionally disabled server is preserved without requests.

The command writes the existing schema-2 report plus `.diagnosis.json`, `.summary.md` and `.issue-draft.md` sidecars. Read the findings and actual gaps before answering; do not merely echo a category. Findings identify observed boundaries, not root causes. Distinguish original failure, host evidence and later probes. Missing/truncated/denied logs remain gaps. A healthy later probe does not establish recovery. Proxy presence, busy/300-second timeouts and generic transport errors do not justify blaming security software, clearing locks/credentials, restarting or changing timeouts/environments.

## Repair and recheck

For an observed missing registration or a normal sign-in requirement, read [repair and recheck](references/repair-and-recheck.md). Apply only the minimal change within the user's authorization and actual host/scope. Keep the prior state and rollback. Other findings need evidence-led investigation; this version has no automatic credential/network repair.

Verify the affected boundary in the **same host and scope** after a change. Registration lookup success proves registration only. Auth success requires the host's authenticated state. Tool recovery requires a safe read-only call such as `list_projects` actually succeeding. If the original operation mutates state, costs credits, or cannot be safely repeated, do not replay it; say that its recovery remains unverified. Record the actual action, time/source and verification result in the summary and draft; never label an unperformed repair as tried. Keep the report's original failure immutable and its collector `recoveryVerified:false`; agent recheck results are separate evidence.

## Feedback without starting over

Return the observed finding, justified next action, diagnostic ID, report/summary locations and remaining gap in the user's language. An unresolved case should include the ready-to-review issue draft. The local JSON retains full credential-redacted evidence; the draft excludes log dumps and local IDs, but still needs review for personal/project data before sharing.

```text
node "<this-skill>/scripts/doctor.mjs" --report <existing.mcp-report.json>
node "<this-skill>/scripts/doctor.mjs" --upload-report <existing.mcp-report.json>
```

`--report` rebuilds sidecars offline without recollecting. It overwrites derived sidecars, so save any agent-written repair notes separately first. Use `--upload-report` only for an authorized first transfer or a single requested retry after failure; it reuses the original diagnostic ID without new probes, keeps the original report unchanged, and writes a separate upload receipt. Do not repeatedly recollect or resend an acknowledged report. `ingest_accepted` is not verified final storage or an opened support ticket.

Use [ChatCut contact](https://chatcut.io/contact) for private support. The draft names no public issue repository because that destination is undecided. Do not open an issue, publish evidence, or message anyone without authorization. Root-cause rules and prevalence based on natural incidents remain future work; controlled tests are not user incidents.

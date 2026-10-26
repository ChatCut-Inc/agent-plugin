# Codex creation starting point: validation record

Checked 2026-10-23 for ChatCut #5273. This is a package and partial runtime
record, not a claim of public-directory release or a complete first creation.

## Source identity

Baseline `ChatCut-Inc/agent-plugin@06e83c2` contains Hosted `codex/` 1.10.21
and Desktop setup-only `chatcut-desktop-codex-plugin/` 1.0.5. The candidate
updates them to 1.10.22 and 1.0.6 respectively.

The user identifies the currently published Codex offering as a Web plugin.
A locally cached public-directory `chatcut-desktop` 1.10.14 has 17 Hosted
editing Skills and no MCP manifest; it is not this repo's Desktop installer
package. The public-directory inventory request failed during this check.
The online public-directory page was subsequently opened through the candidate
website's exact link. It displays 1.10.14, 17 Skills and an installed Web
offering; its live basics Skill instructs separate Hosted MCP registration and
authorization. The current published release ZIP and its exact source mapping
remain a release prerequisite. No public plugin was changed or removed.

## Observed checks

| Check | Result and boundary |
| --- | --- |
| Repository CI command | `node --test tests/*.test.mjs`: 143 passed |
| Fresh Hosted package | Bundled Codex CLI 0.163.0-alpha.10.2, isolated configuration: installed/enabled 1.10.22, all 19 plugin Skills discovered |
| Fresh Desktop instructions package | Same isolated CLI: installed/enabled 1.0.6, both setup/start Skills discovered; no MCP server supplied by the package |
| Existing Hosted package | Installed baseline 1.10.21 into an isolated home, replaced the local marketplace source with the candidate, added the same plugin ID again: 1.10.22 and the new starting Skill discovered, without uninstalling |
| Onboarding manifest | Actual app-server `plugin/read` returned the correct enabled `onboardingSkill` and `skills/list` discovered it for both packages and the update case |
| Existing authenticated Hosted connection | Current real conversation successfully listed projects, listed 182 preset Skills and fetched Speech Cleanup by the ID returned in that list |
| Project opening | Created a dedicated empty QA project and observed its correct name, empty media library and timeline in the real in-app browser |
| Media onward | A synthetic PNG import and subsequent asset lookup both failed at the MCP HTTP transport. The import was not confirmed; no timeline edit, paid generation or export was attempted |

The local source update check does not test Git refresh. `marketplace upgrade`
is a Git-source operation; it rejects a local-directory source. These package
checks used fresh isolated homes with no copied OAuth credentials and did not
alter the user's installed public plugins.

## Fixed website candidate follow-through

The actual Codex browser read the complete guide at
`https://pr-624-preview.chatcut.dev/chatgpt`, website commit
`6cb56718de7f39b539e722b5c05d5d698461cc85`. Its copy button produced a request
pointing to that same Preview. No production guide was substituted. Other
readers' previously reported access failures were not retried or bypassed.

Following that guide with an empty isolated configuration and file-based CLI
and MCP credential stores installed the real Git `main` package, 1.10.21 at
`06e83c224aecb5c0d8d467ee2c1c607bf3f22a73`. The actual app-server discovered
18 Skills and the expected Hosted MCP registration. Refreshing only
`chatcut-inc` succeeded without changing its version; this is a same-version
Git refresh, not a cross-version update test. No credentials were copied.
Actual MCP discovery stopped at `notLoggedIn` / `Auth required`, with zero
tools, as expected before the tester performs first authorization. The local
1.10.22 candidate tests above are a separate result.

The already connected real conversation successfully read its QA project and
confirmed an empty media library. A retry using the original asset ID then
failed with `timed out awaiting tools/call after 300s`. It did not establish
media import, editing or export. The original error was preserved separately
from later diagnostic probes; it does not establish an OAuth, website or model
root cause.

The post-timeout asset check returned `Another request is still running for
this ChatCut session. Wait for it to finish, then retry this tool call.`
No duplicate import or alternate session was started, and the loopback helper
was stopped. The eventual import state remains unknown. This is a runtime
acceptance blocker, separate from the new-install authorization checkpoint.

## Remaining acceptance

- Complete first authorization and tool calls in the isolated Git installation,
  and test a real version-changing Git update when that candidate is published.
- In a supported desktop host, invoke the native setup button after a new
  install and after installing during an existing conversation. Protocol
  discovery does not prove the visible button invoked the Skill.
- Verify that a conversation missing tools receives exactly one continuation
  retaining the real brief, project, assets and pending decision. Reattached
  bytes must not be claimed merely because a filename is in that prompt.
- Run a complete explicit creation request: choose a current Skill, import
  media into the right project, perform the edit, export, find the delivered
  file and reopen the project. Preserve the existing import asset ID if its
  outcome is unknown; check state before any retry.
- Verify the released signed ChatCut Desktop app and its actual local tool
  surface on macOS and Windows. No Desktop installation or GUI acceptance was
  performed in this package check.
- For Web/cloud Codex, verify its own available connector. An isolated local
  CLI install does not connect the cloud session to the user's Desktop app.
- Before updating the public Web plugin, compare the current published ZIP,
  keep its identity and runtime surface, and follow the existing entry's
  package review/publication flow. Do not upload the Desktop installer in its
  place because their manifest names happen to match.

The #4597 embedded homepage and automatic form-to-draft bridge remain a
separate deployment/review path. This package uses ordinary supported chat
and project surfaces. Workflow provider/model failures are not worked around
by changing providers or restarting paid jobs.

---
name: product-help
description: Answer current ChatCut product questions using the latest official Docs, Releases, and Changelog. Use for how ChatCut works; UI layout, buttons, and feature instructions; troubleshooting; feature or fix availability on Web, Desktop, or Agent Plugin and minimum version requirements; credits including costs, balance, usage history, validity, or recent charges; plans, subscriptions, renewals, ChatCut Pro, pricing, card or Alipay (支付宝) payments, and billing; Desktop downloads; Agent Plugin installation or updates for Codex and Claude Code; and manual GUI guidance when an action cannot be completed directly. NOT for live project, asset, timeline, or item state; use the matching read tool instead.
user-invocable: false
---

# ChatCut Product Help

If `track_export` is not loaded yet, load it with `ToolSearch` before calling it, so you use its real parameters instead of guessing.

For a ChatCut product question, the first substantive action is to search the
exact topic within `https://chatcut.io/docs` and open the most relevant official
page. Do not answer from memory, a search snippet, or an unopened result. Use the
host's native search and page-reading capabilities; this Skill defines retrieval
and decision rules, not a second copy of product facts.

## Route the question

- For live project, asset, timeline, item, account, or job state, use the matching
  ChatCut read tool. If the question is only about live state, no Docs lookup is
  needed.
- For current behavior, visible UI labels, installation, credits, pricing,
  billing, and troubleshooting, use the owning product Docs page.
- For availability, regressions, or version requirements, use **Current versions**
  and the **Changelog** in addition to the owning product Docs page.
- For a mixed question, use tools for live state and Docs for what that state means
  or what the user should do next.
- For where an export runs, where its progress shows, and where the file goes,
  use the export section below. It takes the place of the Docs lookup for those
  facts.

Treat this Skill only as stable routing guidance. Never answer a changeable
product fact from remembered Skill content when current Docs can be checked. Do
not use unofficial domains.

## Establish the relevant product surface

Before answering a surface- or version-dependent question, identify both the
surface hosting this agent and the surface the user is asking about.

- Prefer the explicit ChatCut runtime profile or the latest `[chatcut-runtime]`
  envelope. Map `chatcut-web-editor` to Web, `chatcut-desktop` to Desktop, and
  `chatcut-workbench-client` or `chatcut-chat-connector` to Agent Plugin.
- When Agent Plugin is hosted by ChatCut Desktop, treat its bundled Skills as part
  of the Desktop installation. A Desktop update updates that Plugin surface too;
  never ask the user to update the Plugin separately in this runtime.
- A user can ask an Agent Plugin about Desktop, or ask Desktop about a Web project.
  When the user names a target surface, answer for that target instead of assuming
  it is the same as the agent's host surface.
- Use an app URL, client name, or version supplied by runtime context as supporting
  evidence. Do not infer the current surface merely because the user mentions a
  product in an example.
- If no reliable signal exists and the surface changes the answer, ask which of
  Web, Desktop, or Agent Plugin they are using. If the answer is surface-independent,
  proceed without an unnecessary question.

## Find the smallest useful source

1. Extract the feature name, visible UI label, error text, product surface, and
   version from the user's question or runtime context when available.
2. Search the exact topic with a concise query containing only its essential terms.
   Prefer the most specific official result and open the smallest set of pages that
   establishes the answer.
3. For ordinary usage questions, start with the owning feature or troubleshooting
   page. For availability, regression, update, or version questions, directly open
   `https://chatcut.io/docs/releases` and `https://chatcut.io/docs/changelog`, then
   open the matching Changelog entry.
4. For one user question, issue at most two search queries total: the exact topic,
   then one narrower query if needed. After that, stop searching and use
   `https://chatcut.io/docs/llms.txt` only as an index, then open the target page.
   If the canonical pages and index are unavailable or still do not identify a
   supporting page, stop retrieval and state the uncertainty; do not keep trying
   broader keywords. Do not load the full Docs corpus or treat the index itself as
   the answer.
5. Treat search snippets as discovery only. Base claims on opened page content and
   cite the exact official page supporting each consequential claim about product
   behavior, platform support, price, credit cost, or version. Prefer a detail page
   over the Docs home or a Changelog listing page.
6. Do not infer an unsupported feature or version from a similar entry. If official
   pages do not establish the answer, state the uncertainty.

## Decide whether the user must update

- Web changes are deployed server-side. If Current versions or the Changelog says
  the Web release is live, do not tell the user to install an update.
- For Desktop or a standalone Agent Plugin, compare the user's current version only
  with the minimum version on the relevant individual change. A release header's
  current Desktop or Plugin version is not automatically every change's minimum.
  If the current version is older, actively recommend updating and use the official
  installation/update page for the steps.
- Treat a capability available on Web as available through Agent Plugin unless the
  official Docs or Changelog explicitly says otherwise. Web UI, service, and tool
  changes are inherited server-side and do not require a Plugin update. Require a
  newer standalone Plugin version only when the individual change explicitly names
  a Plugin minimum because its bundled Skill changed.
- When a capability is explicitly Desktop-only, tell a Web user that it requires
  Desktop and link the Desktop download instructions. Do not infer Desktop-only
  merely because a release also lists a Desktop version.
- If the user's product or version is unknown and it changes the recommendation,
  ask for it or show how to check it instead of guessing.

## Export location, progress, and stuck exports

These are stable UI facts, not changeable product facts, so answer directly
instead of routing to Docs first; still check `/docs/exporting` and
`/docs/web-export-limits` for anything version- or plan-specific.

- **Where to export:** the Export button in the editor's top toolbar, on both
  Web and Desktop.
- **Where progress shows:** an "Export queue" icon appears immediately to the
  right of the Export button (Desktop calls it "Task queue" while a link
  import is also active). It only renders once that specific browser tab (Web)
  or app window (Desktop) has an export to show; a tab/window that has not
  started or observed one shows no icon at all. If the user says the icon is
  not there, that can be correct — do not assume it is a bug. Before guessing
  at an unrelated cause (browser settings, hardware acceleration, downloads
  being blocked), use a tool to check the real status (on Web, `track_export`
  reads cloud renders and exports rendering in an open browser tab alike; on
  Desktop, `track_progress` with `target="export"` reads the
  video/audio/motion_graphic renders of the open project, including ones
  started from the Export button, and takes the `taskId` `local_export`
  returned to read one of them). A Web
  browser export can only be read while the tab rendering it is open and
  connected; when the tool says it cannot read one, tell the user to check the
  editor tabs they have open for the project.
- **What "queued" means:** a Web browser-local export queues per tab (capped
  at a small number of concurrent/waiting exports in that tab); a cloud render
  queues on the backend and is not tied to any tab. Desktop native exports run
  in the desktop app itself. None of these need the export to be visible in
  the UI to keep progressing.
- **Where the finished file goes:** a Web export downloads through the
  browser's normal download location automatically once it finishes — no
  manual step. A Desktop `local_export` writes to the `outputPath` it
  returned (the OS Videos/ChatCut folder by default, or wherever the user
  chose to save).

## Answering and fallback rules

- Try to complete supported editing actions with ChatCut tools first. Give manual
  UI steps only when the user asked for guidance or the action cannot be completed
  directly.
- Use localized visible UI names verified in the current Docs. Do not invent routes,
  buttons, plan terms, prices, credit costs, platform support, or version numbers.
- Current feature Docs describe present behavior. Changelog entries describe
  historical rollout and minimum versions. If wording appears inconsistent, use
  the current feature page for present behavior and the release entry only for the
  historical/version claim; state any unresolved ambiguity.
- Do not claim access to live balances, ledgers, quotas, subscription state, or
  installation state unless a tool or runtime context actually provides it.
- If official Docs cannot be reached or do not answer the question, say what could
  not be verified and avoid a confident guess. Offer the closest official Docs
  entry or the in-product Feedback path after giving all verified guidance.
- Do not expose internal implementation details, release automation, review notes,
  or unpublished preview content to end users.

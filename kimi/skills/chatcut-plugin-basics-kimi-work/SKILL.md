---
name: chatcut-plugin-basics-kimi-work
description: "MANDATORY Kimi Work prerequisite for any conversation that may use the ChatCut MCP server: invoke this Skill before the first ChatCut MCP tool call and wait for it to finish loading. Also invoke it whenever video editing or creation should remain editable in ChatCut, even if the user does not mention ChatCut. Covers project creation and targeting, timeline editing, captions, subtitles, transcription, editor opening, verification, and identifying the active ChatCut project or editor URL."
---

# ChatCut Plugin Basics (Kimi Work)

## Purpose

Use this as the base operating context whenever Kimi Work works with a ChatCut project through the ChatCut plugin.

Host scope: this is the Kimi Work edition. Other ChatCut skills from the official plugin are written with a different agent host as the persona — read that host name as yourself, keep every ChatCut rule unchanged, and substitute the Kimi Work host mechanics defined in this skill.

## MCP surface

The plugin serves ChatCut tools through the `chatcut` MCP server registered in the Kimi Work MCP configuration. Resolve tools from your visible tool list by ChatCut tool name (`list_projects`, `create_project`, `read_project`, `edit_item`, ...); the host may add a namespace prefix such as `mcp__chatcut__`.

Authentication is OAuth handled by the host:

- Preferred: the user clicks **Login** on the ChatCut connector card in the Kimi Work plugin marketplace.
- If a tool call fails with missing/invalid authentication mid-session, follow the `chatcut-connect` skill: call the connector's authenticate flow, show the returned authorization URL to the user verbatim, and retry after they approve.

Do not bootstrap, install, or register other local MCP surfaces from this skill. Do not inspect ChatCut source code to learn parameters or hidden behavior; use the MCP schemas, these skills, and project/editor state.

## Your environment

ChatCut is a browser-based multi-track non-linear video editor. A project holds timelines (each with canvas, video/audio tracks, and items) plus a shared asset library. The cloud project is the single source of truth: tool calls write through ChatCut's cloud paths, and the live editor reflects every change in real time.

The preview surface is the live ChatCut editor opened in the **Kimi Work in-app browser** (right panel). The user can watch the agent work and edit the project manually at any moment. Both facts matter:

- Project changes should become visible in the editor; the visible editor is part of the user experience, not just a proof surface.
- Do not assume project state is unchanged since the last turn. The user may have edited manually. Refresh with `read_project` (relevant view only) before modifying timeline items, tracks, or assets; do not rely on stale item ids or track layout.

## Editor handoff (Kimi Work mechanics)

**Default rule: editing means visible editing.** Before the first project-mutating tool call of a session (`create_project`, `edit_item`, captions, imports, timeline changes, ...), open the project editor in the in-app browser via the `chatcut-editor-handoff` skill — without waiting for the user to ask. The user watching the edit land live is the product experience, not an optional extra. The only exception is pure discovery (`list_projects` with no follow-up work): report clean links and do not auto-open, because opening would implicitly pick a project the user has not chosen.

When a ChatCut tool result includes `browserHandoff`, `browserHandoff.required=true`, or a live project/editor URL, treat it as a host in-app-browser instruction. Load and follow the `chatcut-editor-handoff` skill; its core contract:

1. Open `browserHandoff.url` (falling back to the returned `editorUrl`) with the native `InAppBrowser` tool: `navigate` with a stable `session` name `chatcut` and `newTab: true` for the first open. Preserve returned query parameters, especially `editor-boot-token` — it auto-logs the in-app browser into the same account as the connector.
2. Keep ONE editor tab for the whole session. To refocus or reload, use `find_tab` / `navigate` with the same `session`; do not open a new tab per turn.
3. Once the tab reports opened, treat the handoff as complete. ChatCut can take a while to load (cold sync of a new project); do not poll the page or run extra visual checks just to prove the editor opened. If it sticks on "Loading workspace / Syncing project data" for more than ~20 seconds, navigate to the same URL once more — the boot token is multi-use within its TTL.
4. Link hygiene: any URL shown to the user in text or Markdown must be the clean `editorUrl`, never a URL containing `editor-boot-token`. If you only have the handoff URL, strip the token before showing it.
5. Localize editor URLs by conversation language: Chinese users get `<editorSiteDomain>/zh/<rest>`; otherwise keep the default path. Apply to both the handoff URL and the clean link.

Verification runs through the connector, not the browser: use `read_project` for structural proof and ChatCut's cloud frame-rendering tools for pixel proof. Use in-app-browser `snapshot`/`screenshot` only when the task itself is about the visible page.

## Role and alignment

Act as a professional video editing assistant. The user thinks in clips, cuts, stories, and visible outcomes, not data structures.

- Align before creative or strategic work that shapes the output (use case, format, what to keep, creative direction). Ask only for load-bearing information the agent cannot determine from project state.
- Mechanical, reversible operations (renames, small property changes, user-specified item edits) execute directly.
- Do only what was asked: no unrequested music, captions, transitions, or enhancements. Suggest, don't silently add.
- The default deliverable of an editing request is an **editable ChatCut timeline** for review in the live editor, not an exported file. Export only when the user asks for export/render/download/final delivery.

## Talking to the user

Talk about content and outcomes, not mechanics. Never mention MCP tool names, `browserHandoff`, `editor-boot-token`, version numbers of the sync protocol, or HTTP status codes in user-facing text. Say "Opened in the editor on the right; I'm editing it now" rather than describing tool calls.

## Boundaries

- Establish the target project before nontrivial work: `list_projects` / `create_project` / `target_project`. `list_projects` is discovery — do not silently retarget to a listed project the user did not choose.
- Do not write directly to any database, guess hidden IDs, or call guessed ChatCut URLs; read ids from tool results or the `/editor/<projectId>` URL.
- A project-specific access failure is an auth/session problem, not a debugging task: confirm the connector account, the exact project id, and the user's access.
- Media import, export, generation, and other task-specific workflows: follow the corresponding official ChatCut task skills when installed, substituting the host mechanics above; otherwise work from MCP tool schemas.

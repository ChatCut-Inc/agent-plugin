---
name: chatcut-plugin-basics-grok-bot
description: "Hosted ChatCut plugin sessions on Grok Bot only (the `chatcut` MCP server). MANDATORY Grok Bot prerequisite for any conversation that may use the ChatCut MCP server: invoke this Skill before the first ChatCut MCP tool call. Use when the user wants to create or continue a ChatCut project from a phone or while away from a laptop, remotely edit an in-progress cloud project, add captions, transcribe, trim, clean a talking-head, add B-roll or overlays, generate media, export, import from /workspace or chat attachments, or open an editor URL. Also invoke it when ChatCut tools appear missing: that is normally an unauthenticated MCP server rather than a broken install."
---

# ChatCut Plugin Basics (Grok Bot)

## Purpose

Use this as the base operating context whenever Grok Bot works with a ChatCut project.

Grok Bot is an always-on teammate on a **cloud computer**. It edits the ChatCut **cloud project**, not a live ChatCut Desktop window on the user's laptop. The laptop may be closed.

This is the Grok Bot edition. In Grok Build, use `chatcut-plugin-basics-grok`. In Claude Code, use `chatcut-plugin-basics-claude`. In Codex, use `chatcut-plugin-basics`.

Load this skill before the first ChatCut MCP tool call. Then load craft skills (`talking-head-guide`, `create-motion-graphics`, `video-gen`, `voice`, `music`, `export`, `verification`, `asset-import`) for those jobs.

Craft skills in this package may still mention ChatCut Desktop, Claude Code, or Codex. On Grok Bot, ignore Desktop-only and in-app Browser-pane instructions. Never emit ChatCut `<widget>`, `<choices/>`, `<visual-option>`, or `<clone-voice/>` tags. Use `widget-forms` and ordinary chat instead. Discover tools with the host tool catalog (`search_tool` or the Bot equivalent), not Claude `ToolSearch`. Hosted import uses `import_media` and `asset-import`, not Desktop `push_asset`.

## Product job

Grok Bot's ChatCut job is **remote continuation**:

1. The user already has (or wants) a ChatCut cloud project.
2. They message the Bot from the Grok Bot app, including **iOS**.
3. The Bot targets that project through hosted MCP and applies the edit.
4. The Bot returns a clean `editorUrl` and a short note of what changed.

Do not try to remote-control ChatCut Desktop, Grok Build, Claude Code, or Codex. Those sessions are on another machine.

## MCP surface

Tools come from the plugin `chatcut` HTTP server:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Headers for this package: `x-chatcut-mcp-client: grok_bot`, `x-chatcut-mcp-surface: grok-bot`.

Resolve tools by ChatCut name (`list_projects`, `target_project`, `read_project`, `edit_item`, `browse_assets`, `get_editor_url`, `submit_export`, ...).

Authenticate from **Settings → Plugins**. ChatCut uses MCP OAuth (PKCE, dynamic client registration). Do not ask the user to paste tokens or cookies.

If ChatCut tools are missing, the server is not signed in (401). Tell the user to authenticate ChatCut in Settings → Plugins, then start a **new chat**. Reinstalling does not fix a missing login.

## Continue an existing project (phone / away from laptop)

This is the default when the user names a project, pastes an editor URL, or says they have a cut in progress.

1. Call `list_projects`.
2. Match the named project, or read `projectId` from `/editor/<projectId>` in a pasted URL.
3. Call `target_project` with that id. Do not create a new project unless they asked for a new one.
4. Call `read_project` / `preview_timeline` / `browse_assets` for the requested scope only.
5. Apply the requested edit. Do only what was asked.
6. Return the clean `editorUrl` plus a short what-changed summary. Tell the user they can open that link on the phone to play the result.

If several projects match, ask which one. Do not pick a plausible name silently.

## New project

If the user wants a new ChatCut project, call `create_project`, send the clean `editorUrl` immediately, then wait for footage (editor upload, chat attachment, or `/workspace`) before long analysis.

## Editor URLs

When a tool result includes `editorUrl`, `liveProject`, or `browserHandoff`:

1. Use the clean `editorUrl` for the user.
2. Strip `dockviewLayout`, `editor-boot-token`, and other host-only query parameters.
3. Send that URL in chat so a phone user can open it.
4. On the Agent Computer desktop app, also open the same clean URL in the cloud browser when that helps the user watch. On **iOS**, do not require Agent Computer. The chat link is enough.

Localize the path from the user's language: Chinese `/zh/…`, Spanish `/es/…`, otherwise English. Preserve the editor domain, remaining path, query, and hash.

Billing or pricing URLs stay ordinary links. They are not editor handoff.

## Files

Grok Bot cannot read the user's laptop disk. Never ask for `~/Movies` or similar paths.

Import order:

1. `browse_assets` in the targeted project. The user may already have uploaded in ChatCut.
2. Chat attachments or files in `/workspace` — then `asset-import` (`import_media` + `upload-media.mjs`).
3. Otherwise tell the user to open the `editorUrl` and upload in ChatCut, then continue from `browse_assets`.

For phone users with existing footage already in the project, skip import. Edit the assets that are there.

## Forms

Never emit ChatCut widget tags. Never call `ask_followup_questions`. Ask structured questions in chat. Stop until the user answers. Load `widget-forms` for consent, voice choice, and similar fields.

## Editing rules

Act as a professional video editing assistant. Align on creative direction before expensive generation. Do only what was asked. Deliver an editable ChatCut timeline, not a flattened local MP4.

Refresh `preview_timeline` / `inspect_item` before mutations when state may be stale.

Export only when the user asks: `submit_export`, then `track_export`. On a phone continuation, default to the live project for review, not an MP4.

On auth or project-access errors, confirm the Bot's ChatCut account is the same account that owns the project, and confirm the exact project id.

## Verification

A successful mutation is not visual proof. Load `verification` or inspect composed frames when the result must be seen. If visual tools are blocked, say so and point the user to Play in the editor URL.

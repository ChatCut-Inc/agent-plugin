---
name: chatcut-plugin-basics-grok-bot
description: "Hosted ChatCut plugin sessions on Grok Bot only (the `chatcut` MCP server). MANDATORY Grok Bot prerequisite for any conversation that may use the ChatCut MCP server: invoke this Skill before the first ChatCut MCP tool call. Covers captions, transcription, trimming, talking-head cleanup, B-roll, overlays, generation, export, project opening, importing from /workspace, targeting, verification, and identifying the active ChatCut editor URL. Also invoke it when ChatCut tools appear missing: that is normally an unauthenticated MCP server rather than a broken install."
---

# ChatCut Plugin Basics (Grok Bot)

## Purpose

Use this as the base operating context whenever Grok Bot works with a ChatCut project through the ChatCut plugin.

Grok Bot runs on a persistent **cloud computer**. It cannot read the user's laptop disk. Local ChatCut Desktop (`chatcut_desktop`) is not available here.

Host scope: this is the Grok Bot edition. In Grok Build, use `chatcut-plugin-basics-grok`.

## MCP surface

Tools come from the plugin-provided `chatcut` HTTP MCP server at `https://api.chatcut.io/api/external-mcp/mcp`. Resolve tools by ChatCut name (`read_project`, `edit_item`, ...).

Authenticate from **Settings → Plugins** (or the Cursor MCP sign-in that Grok Bot shares). ChatCut uses standard MCP OAuth with PKCE and dynamic client registration. Do not ask the user to paste access tokens or cookies.

If no ChatCut tools exist after install, the server is not signed in (401). Tell the user to authenticate the ChatCut connector, then start a **new chat**. Reinstalling does not fix a missing login.

## Editor

Grok Bot has a cloud browser on the Agent Computer. That browser is the visible NLE.

When a tool result includes `editorUrl`, `liveProject`, or `browserHandoff`:

1. Use the clean `editorUrl`.
2. Strip `dockviewLayout` and `editor-boot-token` if they are present.
3. Open that URL in the Agent Computer browser so the user can watch **Agent Computer**.
4. Also send the clean URL in chat.

Localize the path: Chinese `/zh/…`, Spanish `/es/…`, otherwise English.

## Files

Never ask Grok Bot to read `~/Movies` or other laptop paths.

Import order:

1. `browse_assets` in the targeted ChatCut project.
2. Files the user placed in `/workspace` or attached in chat — then `asset-import`.
3. Otherwise tell the user to upload in the ChatCut editor that is open on the Agent Computer.

## Forms

Never emit ChatCut `<widget>` tags. Never call `ask_followup_questions`. Ask structured questions in chat. Stop until the user answers.

## Editing rules

Act as a professional video editing assistant. Align on creative direction before expensive generation. Do only what was asked. Deliver an editable ChatCut timeline, not a flattened local MP4.

Project tools: `list_projects`, `create_project`, `target_project`, `get_editor_url`. Refresh `preview_timeline` / `inspect_item` before mutations. Load craft skills (`talking-head-guide`, `create-motion-graphics`, `video-gen`, `voice`, `music`, `export`, `verification`) for those jobs.

Export: `submit_export` then `track_export`.

On auth or project-access errors, confirm the editor and the connector use the same ChatCut account and the exact project id.

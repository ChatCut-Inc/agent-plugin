# Grok Bot install instructions — ChatCut

This installs the ChatCut plugin for **Grok Bot** (and Cursor). It is not the Grok Build plugin.

The package lives at `grok-bot/` in:

```text
https://github.com/ChatCut-Inc/agent-plugin.git
```

Grok Bot plugins are Cursor plugins. The public listing path is https://cursor.com/marketplace/publish. Do not submit this package to `xai-org/plugin-marketplace`.

## Host environment gate

If this conversation is Grok Build, Claude Code, or Codex on a laptop, stop. Use `docs/grok-build-install.md`, `docs/claude-code-install.md`, or the ChatGPT install guide instead.

If this conversation is Grok Bot (desktop or iOS) or Cursor, continue.

## Agent execution contract

If you are Grok Bot reading this for a user, read this whole guide before acting. Do not stop after install or login.

Required order:

1. Confirm the host is Grok Bot or Cursor.
2. Install and authenticate ChatCut.
3. Start a **new chat**.
4. Create or **target an existing** ChatCut cloud project.
5. Send the clean `editorUrl`.
6. Print the self-report at the end.

Run the steps you can. Do not only describe them.

## What this plugin does

Grok Bot edits ChatCut **cloud projects** through hosted MCP. The user's laptop may be closed. This is how a user continues an in-progress cut from a phone.

It does not control ChatCut Desktop, Grok Build, Claude Code, or Codex on another machine.

## Install

### Marketplace (preferred)

1. In Grok Bot, open **Settings → Plugins**.
2. Install **ChatCut**.
3. Complete the ChatCut browser sign-in. Do not paste tokens or cookies.
4. Tell the user to start a **new chat**.
5. In that chat, attach ChatCut with `@` when the host requires it.

If ChatCut is not yet in the marketplace, add this repository as a plugin source and install the `grok-bot` folder.

### MCP endpoint (manual)

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Headers:

```text
x-chatcut-mcp-client: grok_bot
x-chatcut-mcp-surface: grok-bot
```

ChatCut uses MCP OAuth (PKCE, dynamic client registration, `offline_access`). If the host only accepts a static bearer header and cannot run OAuth, stop and say Grok Bot cannot sign in to ChatCut yet.

## First editing conversation

After a new chat can see ChatCut tools:

**Existing project (usual phone case):** call `list_projects`, `target_project` with the user's project, then confirm with `read_project`. Send the clean `editorUrl`.

**New project:** call `create_project` and send the clean `editorUrl` so the user can upload footage in ChatCut.

Strip `dockviewLayout` and `editor-boot-token` from any user-facing URL.

On iOS, do not require the Agent Computer view. The editor link in chat is enough.

## Files

Never ask for laptop paths. Use assets already in the ChatCut project, chat attachments, `/workspace`, or tell the user to upload in the ChatCut editor.

## Example prompts after install

```text
Continue my ChatCut project <name or editor URL>. Shorten the intro and fix the captions.
```

```text
Create a ChatCut project, send me the editor link so I can upload this interview, then add captions.
```

## Required self-report

```text
ChatCut for Grok Bot: installed=<yes/no> authenticated=<yes/no> project=<id or none> editor=<url or none> new-chat-needed=<yes/no>
```

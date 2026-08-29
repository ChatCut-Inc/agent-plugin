# Grok Bot install instructions — ChatCut

Grok Bot plugins are Cursor plugins. Submit and install through the Cursor / Grok Bot marketplace, not `xai-org/plugin-marketplace`.

This package lives at `grok-bot/` in:

`https://github.com/ChatCut-Inc/agent-plugin.git`

## Host environment gate

This guide is for **Grok Bot** (Settings → Plugins) or Cursor. It is not for Grok Build. If this conversation is Grok Build on a laptop, use `docs/grok-build-install.md` instead.

## Agent execution contract

1. Confirm the user is in Grok Bot or Cursor.
2. Install the ChatCut plugin from Settings → Plugins, or from the Cursor marketplace listing.
3. Authenticate ChatCut with the browser OAuth flow. Do not paste tokens.
4. Start a **new chat**.
5. Create or target a ChatCut project, open the clean `editorUrl` on the Agent Computer, and tell the user to watch **Agent Computer**.

## Manual install (until the Cursor listing is live)

From a Grok Bot or Cursor workspace that accepts a git plugin source, install the `grok-bot` folder of this repository. The MCP server is:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Headers:

```text
x-chatcut-mcp-client: grok_bot
x-chatcut-mcp-surface: grok-bot
```

## Authenticate

ChatCut uses MCP OAuth (PKCE, dynamic client registration, `offline_access`). Complete the browser approval. If the host only accepts a static bearer header and cannot run OAuth, stop and report that Grok Bot cannot sign in to ChatCut yet. Do not ask the user to paste cookies.

## Files

Grok Bot cannot read the user's laptop. Import from `/workspace`, chat attachments, or the ChatCut editor upload UI on the Agent Computer.

## Required final step

After a new chat can see ChatCut tools, create a project, open `editorUrl` on the Agent Computer, and print:

```text
ChatCut for Grok Bot: installed=yes authenticated=<yes/no> editor=<url>
```

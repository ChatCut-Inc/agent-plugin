---
name: connect-chatcut-desktop
description: Install, open, connect, or repair ChatCut Desktop so Grok Build can use the local chatcut_desktop MCP tools. Use when the user wants the native ChatCut editor, local files, or when chatcut_desktop tools are missing. Do not use when chatcut_desktop tools are already available.
---

# Connect ChatCut Desktop (Grok Build)

Use the signed production Desktop app as the source of the local MCP server. Local media stays on this computer (`push_asset`). The hosted `chatcut` plugin is a different connection.

If `chatcut_desktop` tools are already available, call `get_active_project` and continue with the user's editing request. Do not reinstall the app.

ChatCut Desktop currently auto-registers Claude Code and Codex only. Grok Build needs an explicit `grok mcp add` until Desktop ships Grok auto-register. That is expected. It is not a broken install.

## Download

Use only the matching official URL:

- macOS Apple Silicon: `https://api.chatcut.io/desktop/download/macos`
- macOS Intel: `https://api.chatcut.io/desktop/download/macos-x64`
- Windows x64: `https://api.chatcut.io/desktop/download/windows`

ChatCut Desktop supports macOS 13 or newer on Apple Silicon or Intel and Windows on x64. Linux is unsupported.

## Install or open

1. Detect the operating system and architecture and choose the URL above if the app is missing.
2. On macOS, install `ChatCut.app` into `/Applications` or `~/Applications`. On Windows, run the official installer.
3. Open ChatCut Desktop and ask the user to sign in there if needed. Do not handle their credentials.

## Register the local MCP with Grok

After ChatCut Desktop is open, register the launcher Grok can spawn:

macOS / Linux:

```bash
LAUNCHER="$HOME/Library/Application Support/ChatCut/chatcut-mcp"
grok mcp add chatcut_desktop -- "$LAUNCHER"
grok mcp doctor chatcut_desktop
```

Windows:

```bat
grok mcp add chatcut_desktop -- "%APPDATA%\ChatCut\chatcut-mcp.cmd"
grok mcp doctor chatcut_desktop
```

The launcher must exist and be executable. If it is missing, ChatCut Desktop has not finished writing it; open the app once more and retry.

Doctor must show a healthy stdio server and a non-zero tool count. If the command is missing, ChatCut Desktop is not installed or has not launched.

Grok loads MCP tools when a session starts. After a successful register, tell the user to start a **new** Grok session (or press `r` in `/mcps`) before editing.

Do not add the hosted `https://api.chatcut.io/api/external-mcp/mcp` URL as `chatcut_desktop`. That hosted server is the `chatcut` plugin, not Desktop.

## User handoff

If automation cannot download, install, open, or register, stop. Tell the user what blocked the step and give the official download URL plus the `grok mcp add` command for their OS.

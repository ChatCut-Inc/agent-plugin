# Grok Build install instructions — ChatCut

This installs the ChatCut plugin from the public marketplace repository:

`https://github.com/ChatCut-Inc/agent-plugin.git`

The example uses the `main` Git ref.

## Host environment gate

First determine whether this conversation is running inside **Grok Build** (`grok` TUI or CLI) on the user's local machine, or in a web/remote workspace.

If you are in a web, Grok Bot cloud computer, or isolated remote workspace, stop before running install commands. Those environments cannot write the local `~/.grok` plugin directory. Tell the user to open Grok Build on the machine where they want to edit videos, start a new conversation there, and paste:

English:

```text
Read chatcut.io/grok to install the ChatCut plugin and set up a new ChatCut task for me.
```

Chinese:

```text
阅读 chatcut.io/grok，帮我安装 ChatCut 插件并创建一个新任务。
```

If you are inside Grok Build on the user's local machine, continue.

Grok Build is a terminal UI. It has no in-app Browser pane. After setup, open the ChatCut editor in the system browser, or connect ChatCut Desktop for a native editor.

## Agent execution contract

If you are a Grok Build agent reading this for a user, read this whole guide before running commands. Do not stop after install, login, or verification.

Required order:

1. Complete the Host environment gate.
2. Install, authenticate, and verify the ChatCut plugin.
3. Open the user's first editing conversation.
4. Setup is incomplete until you print one required self-report from the final step.

Run the commands yourself when the user has asked you to set up ChatCut; do not only describe them.

## Prerequisites

```bash
grok --version
git --version
```

Grok Build plugin support is required. If `grok` is missing, install it from https://x.ai/docs/build/overview and ask the user to sign in with `grok login` before continuing.

## Install

Add the marketplace and install the plugin. `--trust` is required so the hosted MCP server can attach:

```bash
grok plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git
grok plugin marketplace list
grok plugin install chatcut --trust
grok plugin enable chatcut
```

The marketplace registers as `chatcut-inc`. Confirm `grok plugin list` shows `chatcut` enabled.

Do not start a new conversation yet. Complete authentication and verification first.

## Authenticate

There is no `grok mcp login` command.

1. Tell the user a browser window will open for ChatCut sign-in.
2. Ask them to open `/mcps` in Grok, select `chatcut`, and press `i`.
3. They sign in to chatcut.io and approve access.
4. Run:

```bash
grok mcp doctor chatcut
```

The hosted server URL must be `https://api.chatcut.io/api/external-mcp/mcp`. If doctor reports that authentication is needed, return to step 2. If the server is missing, confirm the plugin is trusted (`grok plugin install chatcut --trust`) and enabled.

Optional MCP-only fallback when the plugin package is not wanted:

```bash
grok mcp add --transport http chatcut https://api.chatcut.io/api/external-mcp/mcp \
  -H 'x-chatcut-mcp-surface: grok-build' \
  -H 'x-chatcut-mcp-client: grok_build'
```

Prefer the plugin install. Skills are the editing brain.

## ChatCut Desktop (optional, best live editor)

If the user wants the native ChatCut editor and local files, open ChatCut Desktop on this computer, then:

```bash
LAUNCHER="$HOME/Library/Application Support/ChatCut/chatcut-mcp"
grok mcp add chatcut_desktop -- "$LAUNCHER"
grok mcp doctor chatcut_desktop
```

On Windows use `%APPDATA%\ChatCut\chatcut-mcp.cmd`. Doctor must report a healthy stdio server. Load `connect-chatcut-desktop` if the launcher is missing.

Desktop auto-register currently covers Claude Code and Codex only. The `grok mcp add` step is required until Desktop ships Grok auto-register.

## Verify

```bash
grok plugin details chatcut
grok mcp doctor chatcut
```

Expected: plugin inventory includes Grok host-adapter skills plus craft skills, and one HTTP MCP server named `chatcut`. After OAuth, doctor is healthy or at least no longer "needs authentication".

Grok captures tools when a session starts. Tell the user to start a **new session** (or press `r` in `/mcps`) before editing.

## Required final step: open the first editing conversation

After verification, create or target a ChatCut project with the ChatCut tools, print the clean `editorUrl`, and open it in the system browser (`open '<editorUrl>'` on macOS). Tell the user they can watch the timeline there.

Then print this self-report and stop:

```text
ChatCut for Grok Build: installed=yes authenticated=<yes/no> new-session-needed=yes editor=<url>
```

Do not attempt a ChatCut tool call in the installation session after you have told the user to start a new session.

## Failure-mode debugging

- **`grok` missing:** install Grok Build, then `grok login`.
- **Plugin listed but MCP blocked:** reinstall with `--trust`. Untrusted plugins do not attach MCP servers.
- **Doctor says needs authentication:** `/mcps` → `chatcut` → `i`. Do not reinstall.
- **Tools missing in this chat:** start a new session.
- **Marketplace clone is slow:** the git fetch can take minutes. Poll it. Do not cancel a live clone.
- **Want Desktop instead of the hosted editor:** see ChatCut Desktop section. That is `chatcut_desktop`, not `chatcut`.

# GitHub Copilot CLI install instructions - ChatCut

This installs the ChatCut plugin from the public marketplace repository:

`https://github.com/ChatCut-Inc/agent-plugin.git`

The example pins the marketplace to the `main` branch.

## Host environment gate

Run this setup in GitHub Copilot CLI on the local machine where the user wants
to work with ChatCut. A web or isolated remote agent cannot configure that
machine's `~/.copilot` directory or complete its browser OAuth flow.

If the current environment is remote or isolated, stop before installation and
tell the user to open GitHub Copilot CLI locally and enter:

```text
Read the GitHub Copilot CLI install guide at https://github.com/ChatCut-Inc/agent-plugin/blob/main/docs/copilot-cli-install.md and install ChatCut for me.
```

## Agent execution contract

When the user asks an agent to perform this setup, run the commands rather than
only describing them. Installation is complete only after all of these gates
pass:

1. The `chatcut-inc` marketplace is registered.
2. `chatcut@chatcut-inc` is installed and enabled.
3. The plugin-contributed `chatcut` MCP server is present.
4. The user completes ChatCut OAuth.
5. A fresh Copilot CLI session successfully calls a read-only ChatCut tool.

## Prerequisites

Verify that Copilot CLI supports plugins and that Git is available:

```bash
copilot --version
copilot plugin --help
copilot mcp --help
git --version
node --version
```

If `copilot` exists but the plugin commands are unavailable, run:

```bash
copilot update
```

Then repeat the prerequisite checks. If `copilot` is not installed, use
GitHub's current official Copilot CLI installation instructions rather than an
unverified third-party installer.

Node.js 18 or newer is required only when Copilot imports local or attached
media through the bundled upload helper. ChatCut editing against existing
project assets and editor-uploaded media remains available without Node.js.
The plugin bundles FFmpeg for Apple Silicon macOS and x64 Windows. On other
platforms, local media import also requires `ffmpeg` and `ffprobe` on `PATH`:

```bash
ffmpeg -version
ffprobe -version
```

If those local-media prerequisites are unavailable, use the ChatCut editor's
upload UI rather than claiming that local-file import is ready.

## Remove only a legacy standalone server

Before installing the plugin, check whether a user-configured MCP server already
uses the exact name `chatcut`:

```bash
copilot mcp get chatcut
```

If the command reports no server, continue. If it reports a user-scoped
standalone server, remove only that legacy entry:

```bash
copilot mcp remove chatcut
```

Do not remove the plugin-contributed `chatcut` server after installation.

## Install

Add ChatCut's marketplace and install the plugin:

```bash
copilot plugin marketplace add ChatCut-Inc/agent-plugin#main
copilot plugin install chatcut@chatcut-inc
```

The marketplace command clones the repository and can take several minutes.
Wait for the current command to exit instead of launching concurrent retries.

Verify discovery:

```bash
copilot plugin list
copilot mcp get chatcut
copilot plugins list --kind plugin --kind mcp --kind skill
```

The plugin list must show `chatcut@chatcut-inc` as enabled, and the MCP entry
must point to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

## Authenticate

Copilot CLI performs remote MCP OAuth from its interactive MCP dashboard:

1. Start or return to an interactive `copilot` session.
2. Enter `/mcp`.
3. Select the plugin-contributed server named `chatcut`.
4. Choose **Authenticate**.
5. Complete the ChatCut authorization page in the browser.

Do not add an OAuth token to `.mcp.json`, shell history, or environment
variables. If authentication fails with a transient timeout or 5xx response,
wait for the attempt to finish and retry once; do not reinstall the plugin.

## Required fresh-session validation

Copilot CLI captures plugin skills and MCP tools when a session starts. After
installation and authentication, start a new session with `/new` or restart
Copilot CLI. Then make a natural-language request that explicitly names
ChatCut, for example:

```text
Use ChatCut to list my available projects without changing anything.
```

The validation succeeds only when a ChatCut tool, such as `list_projects`,
returns a result. A configured or connected status by itself is not an
end-to-end proof.

ChatCut supports editable video workflows including timeline editing, speech
cleanup, captions, transitions, B-roll, motion graphics, transcription, export,
and generation of video, voiceover, music, sound effects, and other project
assets exposed by the Copilot connector.

## Troubleshooting

### Marketplace clone is slow or interrupted

Let the active clone finish. For TLS, DNS, timeout, or interrupted-transfer
errors, retry after checking the user's existing proxy configuration. Do not
guess a proxy address or leave an unverified proxy configured.

If the full clone repeatedly fails, use a shallow local clone and register that
directory:

```bash
git clone --depth 1 --branch main https://github.com/ChatCut-Inc/agent-plugin.git
copilot plugin marketplace add /absolute/path/to/agent-plugin
copilot plugin install chatcut@chatcut-inc
```

### The MCP server needs authentication

Open `/mcp`, select `chatcut`, and choose **Authenticate**. After the browser
flow succeeds, use `/new` or `/restart` before testing the tools again.

### Tools do not appear

Confirm the plugin and server:

```bash
copilot plugin list
copilot mcp get chatcut
```

If both are present, start a fresh session. Reinstall only when the plugin is
actually missing; authentication and session refresh problems are not fixed by
reinstalling.

## Update

Refresh the marketplace and plugin:

```bash
copilot plugin marketplace update chatcut-inc
copilot plugin update chatcut
```

Start a new session after updating so the refreshed skills and tools load.

# Desktop patch: auto-register Grok Build

ChatCut Desktop already auto-registers `chatcut_desktop` with Codex, Claude Code, and WorkBuddy. It does not register Grok Build.

Grok Build already *consumes* a Claude-compat copy when Desktop writes `~/.claude.json`, but that fails for users who do not have Claude Code and for users who disable Claude MCP compat.

## Current code (ChatCut.app asar, 2026-08)

`INTEGRATIONS` in the Desktop MCP module:

```js
const INTEGRATIONS = [
  {
    buildCommand: (name, executable) =>
      `codex mcp add ${name} -- ${shellQuote(executable)}`,
    id: "codex",
    label: "Codex CLI",
  },
  {
    buildCommand: (name, executable) =>
      `claude mcp add ${name} -- ${shellQuote(executable)}`,
    id: "claude-code",
    label: "Claude Code",
  },
];
```

`autoRegisterMcpIntegrations` runs ChatGPT, Claude Code, and WorkBuddy only.

Launcher path (already correct for Grok):

- macOS: `~/Library/Application Support/ChatCut/chatcut-mcp`
- Windows: `%APPDATA%\ChatCut\chatcut-mcp.cmd`

Grok command (verified on 2026-08-29):

```bash
grok mcp add chatcut_desktop -- "$LAUNCHER"
```

Doctor reports 55 tools and a healthy stdio handshake when Desktop is open.

## Required Desktop change

1. Detect `grok` on PATH (GUI-safe PATH, same helper as `resolveLocalAgentCli`). Also check `~/.local/bin/grok` and the official install locations.
2. Add an integration:

```js
{
  buildCommand: (name, executable) =>
    `grok mcp add ${name} -- ${shellQuote(executable)}`,
  id: "grok-build",
  label: "Grok Build",
}
```

3. Add `getGrokBuildMcpConnection` / `connectGrokBuildMcp` that run `grok mcp list` / `grok mcp add` / `grok mcp doctor chatcut_desktop`.
4. Include that family in `autoRegisterMcpIntegrations` with an `autoRegisterOptOut.grokBuild` flag.
5. Show **Grok Build** in the Desktop MCP integrations UI next to Claude Code and Codex.
6. Do not write `~/.claude.json` as a substitute for `~/.grok/config.toml`.

Until this ships, the Grok plugin skill `connect-chatcut-desktop` runs `grok mcp add` itself.

## Headers for a future hosted Desktop bridge

If Desktop ever opens the hosted MCP as well, send:

```text
x-chatcut-mcp-client: grok_build
x-chatcut-mcp-surface: grok-build
```

Do not reuse `codex` or `claude_code` surface values.

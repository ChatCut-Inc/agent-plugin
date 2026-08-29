# ChatCut Agent Plugin

The ChatCut Agent Plugin connects Codex, Claude Code, Grok Build, and Grok Bot to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `codex/` - the Codex / ChatGPT plugin package.
- `claude/` - the Claude Code plugin package.
- `grok/` - the Grok Build plugin package (no vendored ffmpeg binaries).
- `grok-bot/` - the Grok Bot / Cursor Agent Plugins package.
- `chatcut-desktop-codex-plugin/` - the store-facing, skill-only package that
  helps Codex install and connect the signed ChatCut Desktop app.
- `.grok-plugin/marketplace.json` - Grok Build marketplace index.
- `.cursor-plugin/marketplace.json` - Cursor / Grok Bot marketplace index.
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `grok/.grok-plugin/plugin.json` - Grok Build plugin metadata.
- `codex/.mcp.json` / `grok/.mcp.json` / `grok-bot/mcp.json` - hosted MCP config.
- Host adapters live in each package `skills/`. Claude and Codex craft skills
  may be symlinks. Grok packages **copy** craft skills because Grok Build
  installs only the plugin directory and does not follow parent-tree symlinks.
  The Grok packages do not vendor ffmpeg binaries.

## Requirements

- A ChatCut account.
- Codex with plugin support, Claude Code 2.x (CLI or desktop app), Grok Build, or Grok Bot.
- Access to a ChatCut project you want to edit.

## Authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used:

- Codex: `codex mcp login chatcut`
- Claude Code: `claude mcp login plugin:chatcut:chatcut`
- Grok Build: `/mcps` → `chatcut` → `i` (there is no `grok mcp login`)
- Grok Bot: Settings → Plugins authenticate

Follow the sign-in flow to connect your ChatCut account.

Install instructions per host:

- Codex: [chatcut.io/chatgpt](https://chatcut.io/chatgpt)
- Claude Code: [chatcut.io/claude](https://chatcut.io/claude) (agent-executable copy in [./docs/claude-code-install.md](./docs/claude-code-install.md))
- Grok Build: [./docs/grok-build-install.md](./docs/grok-build-install.md)
- Grok Bot: [./docs/grok-bot-install.md](./docs/grok-bot-install.md)

Grok Build marketplace submit: [./docs/xai-marketplace-submission.md](./docs/xai-marketplace-submission.md).
Desktop Grok auto-register patch: [./docs/desktop-grok-mcp-register.md](./docs/desktop-grok-mcp-register.md).

## Example Prompts

After installing and authenticating the plugin, try prompts like:

- `Import this video into my ChatCut project.`
- `Add a simple motion graphic overlay.`
- `Generate a voiceover and background music.`
- `Transcribe this clip and add captions.`
- `Export the current project.`

Grok Bot (phone or away from a laptop):

- `Continue my ChatCut project <name or editor URL>. Shorten the intro and fix the captions.`

## Repository

The public plugin repository is:

```text
https://github.com/ChatCut-Inc/agent-plugin.git
```

## Support

For product information, visit [chatcut.io](https://chatcut.io).

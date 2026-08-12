# ChatCut Agent Plugin

The ChatCut Agent Plugin connects Codex and Claude Code to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `codex/` - the Codex plugin package.
- `claude/` - the Claude Code plugin package.
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `codex/.mcp.json` - Codex MCP server configuration.
- `codex/skills/` - host adapters plus direct symlinks to canonical craft skills in `apps/agent/.claude/skills/`.
- `claude/skills/` - Claude-specific adapters plus direct symlinks to the same canonical agent skills.
- `codex/assets/` - plugin icons and brand assets, shared with Claude through a symlink.

The marketplace distribution is binary-free. Media import uses compatible
FFmpeg tools from `PATH` when available; otherwise it downloads only the pinned
release assets for the current platform, verifies their size and SHA-256, and
stores them in a shared cache capped at two versions and 500 MiB. No background
updater or resident service is installed.

## Requirements

- A ChatCut account.
- Codex with plugin support, or Claude Code 2.x (CLI or desktop app).
- Access to a ChatCut project you want to edit.

## Authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used (`codex mcp login chatcut`, or `claude mcp login plugin:chatcut:chatcut` in Claude Code). Follow the sign-in flow to connect your ChatCut account.

Install instructions per host: [chatcut.io/chatgpt](https://chatcut.io/chatgpt) for Codex, [chatcut.io/claude](https://chatcut.io/claude) for Claude Code (agent-executable copy in [./docs/claude-code-install.md](./docs/claude-code-install.md)).

## Example Prompts

After installing and authenticating the plugin, try prompts like:

- `Import this video into my ChatCut project.`
- `Add a simple motion graphic overlay.`
- `Generate a voiceover and background music.`
- `Transcribe this clip and add captions.`
- `Export the current project.`

## Repository

The public plugin repository is:

```text
https://github.com/ChatCut-Inc/agent-plugin.git
```

## Support

For product information, visit [chatcut.io](https://chatcut.io).

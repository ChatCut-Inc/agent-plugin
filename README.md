# ChatCut Agent Plugins

The ChatCut Agent Plugins connect Codex, Claude Code, Grok Bot, Cursor, and Kimi Work to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `codex/` - the Codex plugin package.
- `claude/` - the Claude Code plugin package.
- `grok/` - the Grok Bot and Cursor plugin package.
- `kimi/` - the Kimi Work plugin package, with mandatory basics, core craft skills, and in-app browser adapters; see [its package and migration guide](./kimi/README.md).
- `chatcut-desktop-codex-plugin/` - the store-facing, skill-only package that
  helps Codex install and connect the signed ChatCut Desktop app.
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `grok/.cursor-plugin/plugin.json` - Grok Bot and Cursor plugin metadata.
- `codex/.mcp.json` - Codex MCP server configuration.
- `codex/skills/` - host adapters plus direct symlinks to canonical craft skills in `apps/agent/.claude/skills/`.
- `claude/skills/` - Claude-specific adapters plus direct symlinks to the same canonical agent skills.
- `codex/assets/` - plugin icons and brand assets, shared with Claude through a symlink.

## Requirements

- A ChatCut account.
- Codex with plugin support, Claude Code 2.x (CLI or desktop app), Grok Bot, Cursor, or Kimi Work.
- Access to a ChatCut project you want to edit.

## Authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used (`codex mcp login chatcut`, or `claude mcp login plugin:chatcut:chatcut` in Claude Code). Grok Bot and Cursor users complete the authorization flow from the host's Plugins screen. Follow the sign-in flow to connect your ChatCut account.

Install instructions per host: [chatcut.io/chatgpt](https://chatcut.io/chatgpt) for Codex, [chatcut.io/claude](https://chatcut.io/claude) for Claude Code (agent-executable copy in [./docs/claude-code-install.md](./docs/claude-code-install.md)), and [./grok/README.md](./grok/README.md) for Grok Bot and Cursor.

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

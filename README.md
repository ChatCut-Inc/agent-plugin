# ChatCut Agent Plugin

The ChatCut Agent Plugin connects Codex and Claude Code to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `chatcut/` - the ChatCut plugin package (shared by Codex and Claude Code).
- `chatcut/.codex-plugin/plugin.json` - plugin metadata used by Codex.
- `chatcut/.claude-plugin/plugin.json` - plugin metadata used by Claude Code.
- `chatcut/.mcp.json` - MCP server configuration for ChatCut (dual-format: Codex reads `http_headers`/`oauth_resource`, Claude Code reads `type`/`headers`).
- `chatcut/skills/` - workflow skills for common ChatCut editing tasks.
- `chatcut/assets/` - plugin icons and brand assets.

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

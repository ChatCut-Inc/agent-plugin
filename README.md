# ChatCut Agent Plugin

The ChatCut Agent Plugin connects Codex, Claude Code, and GitHub Copilot CLI to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `codex/` - the Codex plugin package.
- `claude/` - the Claude Code plugin package.
- `copilot/` - the GitHub Copilot CLI plugin package.
- `chatcut-desktop-codex-plugin/` - the store-facing, skill-only package that
  helps Codex install and connect the signed ChatCut Desktop app.
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `copilot/plugin.json` - GitHub Copilot CLI plugin metadata.
- `codex/.mcp.json` - Codex MCP server configuration.
- `copilot/.mcp.json` - GitHub Copilot CLI MCP server configuration.
- `codex/skills/` - host adapters plus direct symlinks to canonical craft skills in `apps/agent/.claude/skills/`.
- `claude/skills/` - Claude-specific adapters plus direct symlinks to the same canonical agent skills.
- `copilot/skills/` - Copilot-specific adapters plus the same canonical craft skills.
- Each host package includes its required icons, helper scripts, and media-tool
  bundle.
- `.github/plugin/marketplace.json` - GitHub Copilot CLI marketplace catalog.

## Requirements

- A ChatCut account.
- Codex with plugin support, Claude Code 2.x (CLI or desktop app), or GitHub Copilot CLI with plugin support.
- Access to a ChatCut project you want to edit.
- Node.js 18 or newer for local-file imports from GitHub Copilot CLI. The
  package bundles FFmpeg for Apple Silicon macOS and x64 Windows; other
  platforms need `ffmpeg` and `ffprobe` on `PATH`.

## Authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used:

- Codex: `codex mcp login chatcut`
- Claude Code: `claude mcp login plugin:chatcut:chatcut`
- GitHub Copilot CLI: open `/mcp`, select `chatcut`, and choose **Authenticate**

Follow the browser sign-in flow to connect your ChatCut account.

Install instructions per host: [chatcut.io/chatgpt](https://chatcut.io/chatgpt) for Codex, [chatcut.io/claude](https://chatcut.io/claude) for Claude Code (agent-executable copy in [./docs/claude-code-install.md](./docs/claude-code-install.md)), and [./docs/copilot-cli-install.md](./docs/copilot-cli-install.md) for GitHub Copilot CLI.

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

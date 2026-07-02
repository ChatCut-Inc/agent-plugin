# ChatCut Agent Plugin

The ChatCut Agent Plugin connects Codex to ChatCut so you can edit ChatCut video projects with AI assistance.

Use it to import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## What Is Included

- `chatcut/` - the ChatCut Codex plugin package.
- `chatcut/.codex-plugin/plugin.json` - plugin metadata used by Codex.
- `chatcut/.mcp.json` - MCP server configuration for ChatCut.
- `chatcut/skills/` - workflow skills for common ChatCut editing tasks.
- `chatcut/assets/` - plugin icons and brand assets.

## Requirements

- A ChatCut account.
- Codex with plugin support.
- Access to a ChatCut project you want to edit.

## Authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Codex handles authentication when the plugin is installed or first used. Follow the sign-in flow shown by Codex to connect your ChatCut account.

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

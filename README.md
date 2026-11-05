# ChatCut Agent Plugins
**ChatCut is an AI video editor for agents: an MCP server and plugin that lets Codex, ChatGPT, Claude Code, Cursor, Grok Bot, Gemini CLI, Kimi Work, WorkBuddy, Doubao Work and Qwen Work edit your own footage, add captions and subtitles, remove silences and filler words, create motion graphics, generate video, voiceovers and music, and export an editable timeline.**\
[Website](https://chatcut.io) · [Setup guide](https://chatcut.io/desktop) · [ChatGPT and Codex](https://chatcut.io/chatgpt-plugin) · [Claude Code](https://chatcut.io/claude-code-plugin) · [Pricing](https://chatcut.io/pricing)

AI video editing for your agent. The ChatCut Agent Plugins connect Codex, Claude Code, Grok Bot, Cursor, Kimi Work, WorkBuddy, Doubao Work and Qwen Work to ChatCut, so you can ask your agent to edit a video, add captions, clean up a talking-head recording, or recreate a viral video with your own footage, and get an editable timeline back.

Under the hood the plugins import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor.

## Quick install

**ChatCut Desktop (recommended).** Paste this into Codex, the ChatGPT desktop app, Claude Code or another local agent. The agent installs ChatCut Desktop, opens sign-in, and connects itself to Desktop's local `chatcut_desktop` MCP server:

```text
Read ChatCut.io/desktop to install ChatCut
```

Or run the official installer yourself:

```sh
# macOS 13 or newer (Apple Silicon or Intel)
curl -fsSL https://chatcut.io/install.sh | sh
```

```powershell
# Windows 10 or newer (x64)
irm https://chatcut.io/install.ps1 | iex
```

In the ChatGPT or Codex desktop app you can also open **Plugins** in the sidebar, search for **ChatCut**, and select **Install**.

Doubao Work (豆包工作) connects to ChatCut Desktop through a local connector: see [doubao/README.md](./doubao/README.md).

**Hosted Web plugin.** Use this for existing ChatCut Web projects or Web-only use.

Claude Code (`claude mcp login` needs Claude Code 2.1.210 or newer; [full guide](https://chatcut.io/web-plugin/claude)):

```sh
claude plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git#main
claude plugin install chatcut@chatcut-inc
claude mcp login plugin:chatcut:chatcut
```

Codex CLI (in the Codex desktop app, use its bundled Codex CLI; [full guide](https://chatcut.io/web-plugin/chatgpt)):

```sh
codex plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git --ref main
codex plugin marketplace list   # note the marketplace name
codex plugin add chatcut@<marketplace>
codex mcp login chatcut
```

Gemini CLI:

```sh
gemini extensions install https://github.com/ChatCut-Inc/agent-plugin
```

Grok Bot and Cursor: see [grok/README.md](./grok/README.md). Kimi Work: see [kimi/README.md](./kimi/README.md). WorkBuddy: see [workbuddy/README.md](./workbuddy/README.md). Qwen Work (千问办公): see [qwen/README.md](./qwen/README.md).

Other MCP clients that support remote servers with OAuth can connect to `https://api.chatcut.io/api/external-mcp/mcp` and sign in with a ChatCut account.

## Install ChatCut Desktop (recommended)

Ask your agent to read the complete [ChatCut Desktop setup guide](https://chatcut.io/desktop) using `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows), then install ChatCut and connect the current agent. The official macOS and Windows installers do not need Node.js or npm. Desktop owns its local tools and Skills. Run setup on a supported macOS or Windows computer with a graphical desktop. Linux and remote agents without access to that computer cannot install Desktop there; continue in a local agent on the supported computer.

To recreate a reference video with your person or product while retaining its motion and timing, use Desktop’s bundled `video-gen` Skill and `submit_video_remake`. See the [video recreation guide](https://chatcut.io/viralvideocloner). Quotes use current account access and require approval before spending credits.

The hosted packages below remain available for existing Web projects and explicit Web-only use. Web projects and original media remain separate and are not automatically migrated. Connecting Desktop to the same agent may disable or replace its conflicting hosted connection; do not promise that both connections stay active.

## What Is Included

- `codex/` - the Codex plugin package.
- `claude/` - the Claude Code plugin package.
- `grok/` - the Grok Bot and Cursor plugin package.
- `kimi/` - the Kimi Work plugin package, with mandatory basics, core craft skills, and in-app browser adapters; see [its package and migration guide](./kimi/README.md).
- `workbuddy/` - the WorkBuddy expert package for the hosted Web plugin; see [its README](./workbuddy/README.md).
- `doubao/` - the Doubao Work (豆包工作) Skill package for ChatCut Desktop; see [its README](./doubao/README.md).
- `qwen/` - the Qwen Work (千问办公) expert kit for the hosted Web plugin; see [its README](./qwen/README.md).
- `chatcut-desktop-codex-plugin/` - the store-facing, skill-only package that
  helps Codex install and connect the signed ChatCut Desktop app.
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `grok/.cursor-plugin/plugin.json` - Grok Bot and Cursor plugin metadata.
- `gemini-extension.json` - Gemini CLI extension manifest (hosted MCP only; install with `gemini extensions install https://github.com/ChatCut-Inc/agent-plugin`).
- `codex/.mcp.json` - Codex MCP server configuration.
- `codex/skills/` - host adapters plus direct symlinks to canonical craft skills in `apps/agent/.claude/skills/`.
- `claude/skills/` - Claude-specific adapters plus direct symlinks to the same canonical agent skills.
- `codex/assets/` - plugin icons and brand assets, shared with Claude through a symlink.

## Requirements

- A ChatCut account.
- Codex with plugin support, Claude Code 2.x (CLI or desktop app), Grok Bot, Cursor, Kimi Work, WorkBuddy, Doubao Work or Qwen Work.
- Access to a ChatCut project you want to edit.

## Optional hosted Web plugin authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used (`codex mcp login chatcut`, or `claude mcp login plugin:chatcut:chatcut` in Claude Code). Grok Bot and Cursor users complete the authorization flow from the host's Plugins screen. Follow the sign-in flow to connect your ChatCut account.

Install instructions per host: [Codex Web guide](https://chatcut.io/web-plugin/chatgpt) for Codex, [Claude Code Web guide](https://chatcut.io/web-plugin/claude) for Claude Code (agent-executable copy in [./docs/claude-code-web-install.md](./docs/claude-code-web-install.md)), and [./grok/README.md](./grok/README.md) for Grok Bot and Cursor.

## Example Prompts

After installing and authenticating the plugin, ask in your own words, for example:

- `Cut this talking-head video tighter and add captions.`
- `Add subtitles to my video and export a vertical version.`
- `Add a simple motion graphic overlay.`
- `Generate a voiceover and background music.`
- `帮我把这段口播剪干净，加上字幕。`

## Repository

The public plugin repository is:

```text
https://github.com/ChatCut-Inc/agent-plugin.git
```

## Support

For product information, visit [chatcut.io](https://chatcut.io).

## License

Apache-2.0; see [LICENSE](./LICENSE).

# ChatCut Agent Plugins
**ChatCut is an AI video editor for agents: an MCP server and plugin that lets Codex, ChatGPT, Claude Code, Cursor, Grok Bot, Gemini CLI, Google Antigravity, Kimi Work, WorkBuddy, Doubao Work and Qwen Work edit your own footage, add captions and subtitles, remove silences and filler words, create motion graphics, generate video, voiceovers and music, and export an editable timeline.**\
[Website](https://chatcut.io) · [Setup guide](https://chatcut.io/desktop) · [ChatGPT and Codex](https://chatcut.io/chatgpt-plugin) · [Claude Code](https://chatcut.io/claude-code-plugin) · [Pricing](https://chatcut.io/pricing)

[![ChatCut MCP server on Glama](https://glama.ai/mcp/connectors/io.chatcut/chatcut/badges/score.svg)](https://glama.ai/mcp/connectors/io.chatcut/chatcut)

## Ask your agent

AI video editing for your agent: ask in your own words, and ChatCut makes the edit and hands back an editable timeline. Each example pairs a request you can paste into your agent with the kind of result it produces.

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/cleanup.gif" width="100%" alt="A talking-head clip: the filler words so, um, like and uh are marked on the timeline and cut out, then captions appear">
      <br><b>Clean up a talking head</b>
      <br><code>Clean up this take: cut the ums, long pauses and retakes.</code>
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/captions.gif" width="100%" alt="A woman talking to camera while the captions switch between several animated styles that highlight each word">
      <br><b>Add animated captions</b>
      <br><code>Add captions that highlight each word as it's spoken.</code>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/motion-graphics.gif" width="100%" alt="Before and after: the plain talking-head clip on the left, and on the right the same clip with a Motion Graphics title and an animated bar chart">
      <br><b>Add motion graphics</b>
      <br><code>Package this explainer with motion graphics: a title card and an animated chart.</code>
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/shorts.gif" width="100%" alt="A two-person podcast episode is split into several vertical 9:16 clips">
      <br><b>Turn a long video into shorts</b>
      <br><code>Find the best moments in this episode and cut them into 9:16 shorts.</code>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/media/translation.gif" width="100%" alt="The same speaker in six tiles labeled English, Chinese, Spanish, French, German and Japanese, each dubbed into that language">
      <br><b>Translate and dub a video</b>
      <br><code>Translate this video into Chinese, Spanish, French, German and Japanese.</code>
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/viral-remake.gif" width="100%" alt="An original UGC ad of a creator holding a yellow tumbler, next to four remakes with different creators and settings">
      <br><b>Remake a viral ad</b> <i>(Desktop)</i>
      <br><code>Remake this UGC ad with these four creators: same product, same pitch.</code>
    </td>
  </tr>
</table>

Not set up yet? Start any request with `Read ChatCut.io/desktop to install ChatCut, then`, and your agent installs ChatCut first.

## Install

**ChatCut Desktop (recommended).** In Codex, the ChatGPT desktop app, Claude Code or another local agent, paste the prompt below. The agent installs ChatCut Desktop, opens sign-in, and connects itself to Desktop's local `chatcut_desktop` MCP server. Hosts marked *(Web)* connect to the hosted Web plugin instead.

| Agent | Paste this into your agent, or do this | Guide |
| --- | --- | --- |
| Codex | `Read ChatCut.io/desktop to install ChatCut` | [chatcut.io/chatgpt-plugin](https://chatcut.io/chatgpt-plugin) |
| ChatGPT | `Read ChatCut.io/desktop to install ChatCut` in the desktop app, or open **Plugins** in the sidebar, search for **ChatCut** and select **Install** | [chatcut.io/chatgpt-plugin](https://chatcut.io/chatgpt-plugin) |
| Claude Code | `Read ChatCut.io/desktop to install ChatCut` | [chatcut.io/claude-code-plugin](https://chatcut.io/claude-code-plugin) |
| Cursor *(Web)* | Add **ChatCut** from Cursor's plugin marketplace and sign in | [cursor/README.md](./cursor/README.md) |
| Grok Bot *(Web)* | `Read ChatCut.io/grok to connect the ChatCut app` | [chatcut.io/grok-plugin](https://chatcut.io/grok-plugin) |
| Gemini CLI *(Web)* | `gemini extensions install https://github.com/ChatCut-Inc/agent-plugin` | [Hosted Web plugin](#hosted-web-plugin) |
| Google Antigravity | `Read ChatCut.io/antigravity to install ChatCut` | [chatcut.io/antigravity-plugin](https://chatcut.io/antigravity-plugin) |
| Kimi Work *(Web)* | Import the package with Kimi Work's plugin installer, then select **Login** on the ChatCut connector card | [kimi/README.md](./kimi/README.md) |
| WorkBuddy | `Read ChatCut.io/desktop to install ChatCut`, or add the ChatCut expert from WorkBuddy's experts page *(Web)* | [chatcut.io/workbuddy](https://chatcut.io/workbuddy) · [workbuddy/README.md](./workbuddy/README.md) |
| Doubao Work (豆包工作) | Add **ChatCut** in Doubao Work and ask for an edit. It connects to ChatCut Desktop through a local connector and installs Desktop if needed | [doubao/README.md](./doubao/README.md) |
| Qwen Work (千问办公) *(Web)* | Turn on **ChatCut** under **Extensions → Connectors** (扩展 → 连接器) and sign in | [qwen/README.md](./qwen/README.md) |

### Install ChatCut Desktop yourself

Run the official installer:

```sh
# macOS 13 or newer (Apple Silicon or Intel)
curl -fsSL https://chatcut.io/install.sh | sh
```

```powershell
# Windows 10 or newer (x64)
irm https://chatcut.io/install.ps1 | iex
```

Google Antigravity can also install the Desktop package directly. Then ask “Install ChatCut on this computer”. It installs and connects ChatCut Desktop only; see [antigravity-desktop/README.md](./antigravity-desktop/README.md).

```sh
agy plugin install https://github.com/ChatCut-Inc/agent-plugin/tree/main/antigravity-desktop
```

### Hosted Web plugin

Use this for existing ChatCut Web projects or Web-only use.

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

Grok Bot: see [grok/README.md](./grok/README.md). Antigravity Web: see [antigravity/README.md](./antigravity/README.md).

Other MCP clients that support remote servers with OAuth can connect to `https://api.chatcut.io/api/external-mcp/mcp` and sign in with a ChatCut account.

## What you can make

ChatCut edits your own footage and generates new media, and the result is an editable timeline. Under the hood the plugins import media, change a project timeline, create motion graphics, generate assets, transcribe audio, add captions, export videos, and verify that edits are visible in the editor. Items marked *(Desktop)* need ChatCut Desktop. Generation uses ChatCut credits, and the agent asks before spending them.

**Editing**

- Talking-head cleanup: remove silences, filler words, repeated takes and stumbles, and tighten the pacing.
- Text-based editing: edit the video by editing its transcript.
- Highlight clips and short cuts from long interviews, podcasts and lectures.
- Multicam sync: line up camera angles and separate audio recordings, then cut to whoever is speaking.
- Beat-synced cuts and automatic scene-cut detection *(Desktop)*.
- B-roll, background music, markers and multiple timeline versions, including vertical 9:16 cuts for TikTok, Instagram Reels and YouTube Shorts.
- Scene-by-scene video analysis, and checks that each edit is visible in the editor.

**Captions and subtitles**

- Word-timed transcripts and subtitles, including Chinese.
- Animated caption styles, and custom kinetic typography *(Desktop)*.
- Subtitle translation, and SRT or TXT subtitle files.

**Voice, music and sound**

- Text-to-speech voiceovers, and voice clones with the speaker's consent.
- Music generation, instrumental or with vocals.
- Sound effects.
- Speech cleanup: remove background noise, hum and room echo.
- Short crossfades that smooth the audio at every cut.
- Audio effects such as EQ, filters, delay and reverb *(Desktop)*.

**Generation**

- AI video from text, images or reference frames, with models such as Seedance and Kling.
- AI images, thumbnails and covers, with models such as GPT Image and Nano Banana.
- Talking-photo presenter videos (digital human / AI avatar).
- Lip sync for existing footage.
- Video translation and dubbing into other languages, with or without lip sync.
- Viral video remakes that keep a reference video's motion and timing with your own person or product *(Desktop)*.
- Batches of up to 50 image, video, voice, music and sound jobs in one step *(Desktop)*.

**Motion graphics and design**

- Motion graphics: title cards, lower thirds, animated overlays and full-frame animations.
- Motion graphic templates: apply published ones, or save your own for reuse in other projects.
- Design styles that keep a brand's colors, fonts and logos consistent across captions and graphics.
- Google Fonts and bundled Chinese fonts.

**Effects and look**

- Transitions, visual effects and custom shaders.
- Color grading, LUTs, masks and background removal *(Desktop)*.
- Beauty and body retouch *(Desktop)*.

**Media in**

- Stock video, photos, music and sound effects from Pexels, Pixabay, Unsplash and Freesound.
- Product details, brand assets and screenshots collected from a web page.
- Videos imported from a link *(Desktop)*.
- Screen recordings with click and cursor data for demo videos *(Desktop)*.
- Dropbox for importing media and X for posting finished videos *(Desktop)*. Google Drive, YouTube, TikTok and Instagram connectors open as each platform approves them.

**Saved across projects**

- Characters: people you feature again, with photos, a description and a voice, for consistent generated shots and presenter videos *(Desktop)*.
- Products: photos, selling points, price and specs for product ads, so scripts stick to what you saved *(Desktop)*.
- Memory of your preferences, and Workflow Skills that save a working editing process for reuse.

**Writing and planning** *(Desktop)*

- Screenplays and scripts with scene outlines, production breakdowns and shot lists.
- Scripts export to Final Draft (FDX), Fountain, PDF or Word, and shot lists to CSV or HTML.

**Export and handoff**

- MP4 video, MP3, WAV, FLAC or AAC audio, and PNG stills.
- Premiere Pro and DaVinci Resolve XML.
- 剪映专业版 (Jianying Pro) and CapCut drafts, transparent ProRes 4444 motion graphics, 4K and HDR video, and Markdown, PDF or Word documents *(Desktop)*.

**Video types:** talking-head videos, podcasts and interviews, tutorials and lectures, product demos and app promos, UGC-style product ads, short-form videos, viral video remakes, presenter and avatar videos, screen-recorded demos *(Desktop)*, multicam shoots, music videos cut to the beat *(Desktop)* and translated videos.

## Install ChatCut Desktop (recommended)

Ask your agent to read the complete [ChatCut Desktop setup guide](https://chatcut.io/desktop) using `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows), then install ChatCut and connect the current agent. The official macOS and Windows installers do not need Node.js or npm. Desktop owns its local tools and Skills. Run setup on a supported macOS or Windows computer with a graphical desktop. Linux and remote agents without access to that computer cannot install Desktop there; continue in a local agent on the supported computer.

To recreate a reference video with your person or product while retaining its motion and timing, use Desktop’s bundled `video-gen` Skill and `submit_video_remake`. See the [video recreation guide](https://chatcut.io/viralvideocloner). Quotes use current account access and require approval before spending credits.

The hosted packages below remain available for existing Web projects and explicit Web-only use. Web projects and original media remain separate and are not automatically migrated. Connecting Desktop to the same agent may disable or replace its conflicting hosted connection; do not promise that both connections stay active.

## What Is Included

- `codex/` - the Codex plugin package.
- `claude/` - the Claude Code plugin package.
- `grok/` - the Grok Bot plugin package (hidden from Cursor).
- `cursor/` - the Cursor plugin package (hidden from Grok Bot); its skills and assets symlink to `grok/`.
- `antigravity-desktop/` - the Google Antigravity Desktop-only package: one Skill that installs ChatCut Desktop and connects `chatcut_desktop`, with no MCP server of its own; see [its README](./antigravity-desktop/README.md).
- `antigravity/` - the Google Antigravity hosted Web plugin package.
- `antigravity/plugin.json` - Antigravity plugin metadata.
- `antigravity/mcp_config.json` - Antigravity MCP server configuration.
- `kimi/` - the Kimi Work plugin package, with mandatory basics, core craft skills, and in-app browser adapters; see [its package and migration guide](./kimi/README.md).
- `workbuddy/` - the WorkBuddy expert package for the hosted Web plugin; see [its README](./workbuddy/README.md).
- `doubao/` - the Doubao Work (豆包工作) Skill package for ChatCut Desktop; see [its README](./doubao/README.md).
- `qwen/` - the Qwen Work (千问办公) expert kit for the hosted Web plugin; see [its README](./qwen/README.md).
- `chatcut-desktop-codex-plugin/` - the store-facing, skill-only package that
  helps Codex install and connect the signed ChatCut Desktop app.
- `codex-store/` - builds the OpenAI plugin directory ZIP from `codex/`; see
  [its README](./codex-store/README.md).
- `codex/.codex-plugin/plugin.json` - Codex plugin metadata.
- `claude/.claude-plugin/plugin.json` - Claude Code plugin metadata.
- `grok/.cursor-plugin/plugin.json` and `cursor/.cursor-plugin/plugin.json` - Grok Bot and Cursor plugin metadata, both listed in `.cursor-plugin/marketplace.json`.
- `gemini-extension.json` - Gemini CLI extension manifest (hosted MCP only; install with `gemini extensions install https://github.com/ChatCut-Inc/agent-plugin`).
- `codex/.mcp.json` - Codex MCP server configuration.
- `codex/skills/` - host adapters and canonical shared craft skills for this repository.
- Other packages use relative symlinks for identical skills, references, helper scripts, licenses and assets; host-specific files stay separate. All targets are inside this repository, not another checkout.
- `codex/assets/` - canonical plugin icons and brand assets.

Clone the complete repository with symlink support. When distributing a standalone package, dereference its symlinks so the bundle contains its shared resources (`codex-store/build.mjs` does this for the OpenAI directory ZIP). Live installation of each host's package still needs host-specific verification.

## Requirements

- A ChatCut account.
- Codex with plugin support, Claude Code 2.x (CLI or desktop app), Grok Bot, Cursor, Google Antigravity (App, CLI, or IDE), Kimi Work, WorkBuddy, Doubao Work or Qwen Work.
- Access to a ChatCut project you want to edit.

## Optional hosted Web plugin authentication

The plugin connects to ChatCut through the hosted ChatCut MCP endpoint:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

The host handles authentication when the plugin is installed or first used (`codex mcp login chatcut`, or `claude mcp login plugin:chatcut:chatcut` in Claude Code). Grok Bot and Cursor users complete the authorization flow from the host's Plugins screen. Antigravity users select **Customizations → Authenticate** next to the ChatCut MCP server. Follow the sign-in flow to connect your ChatCut account.

Install instructions per host: [Codex Web guide](https://chatcut.io/web-plugin/chatgpt) for Codex, [Claude Code Web guide](https://chatcut.io/web-plugin/claude) for Claude Code (agent-executable copy in [./docs/claude-code-web-install.md](./docs/claude-code-web-install.md)), [./grok/README.md](./grok/README.md) for Grok Bot, [./cursor/README.md](./cursor/README.md) for Cursor, and [./antigravity/README.md](./antigravity/README.md) for Antigravity.

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

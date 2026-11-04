# ChatCut for Antigravity

ChatCut lets Antigravity agents install ChatCut Desktop, recreate reference videos with the user's own footage, and edit videos in an existing ChatCut Web project. Desktop is recommended for new installations and source-video remakes; use the hosted Web plugin for existing Web projects or an explicit Web choice. Respect a user-selected Skill/workflow and its declared route.

Agents can import media, edit timelines, transcribe speech, add captions and motion graphics, generate media, and export finished work. Available tools and generation models depend on the connected ChatCut account and its current access.

Edits remain editable in the ChatCut timeline. The plugin does not replace a project with a locally flattened video unless the user explicitly requests a rendered deliverable.

## Requirements

- Antigravity App, CLI, or IDE with plugin support.
- A ChatCut account.
- Network access to `https://api.chatcut.io` and `https://app.chatcut.io`.
- For the hosted Web import helpers, Node.js 18+. The upload-helper route also
  requires separately available `ffmpeg` and `ffprobe` on the computer running
  it. Ordinary MCP editing does not require these local tools.
- Paid ChatCut generation uses ChatCut credits and may require a paid plan.
  Installing the plugin does not include generation credits.

## Desktop recommended: install and connect

Read the complete official guide with `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows). Use the intended macOS or Windows computer with a graphical desktop; Linux/headless agents need a supported local computer. Desktop installation has no Node.js/npm prerequisite. Follow the guide, preserving OS trust checks, with this plugin's install source:

macOS:

```sh
curl -fsSL https://chatcut.io/install.sh | CHATCUT_INSTALL_SOURCE=antigravity_marketplace sh
```

Windows PowerShell:

```powershell
$env:CHATCUT_INSTALL_SOURCE='antigravity_marketplace'; irm https://chatcut.io/install.ps1 | iex
```

Let the user open Desktop and sign in; do not automate the Desktop UI. Desktop currently auto-registers `chatcut_desktop` only for Codex CLI, Claude Code and Hermes Agent. The following is **Antigravity-specific until Desktop registers Antigravity itself**:

1. After Desktop is installed and running, obtain the user's agreement to add its stdio server. Read and back up `~/.gemini/config/mcp_config.json`, then merge `chatcut_desktop`, preserving every unrelated server and top-level setting. If absent, create `{"mcpServers":{}}`; do not overwrite malformed JSON or an existing conflicting entry.
2. Check the launcher exists: macOS `~/Library/Application Support/ChatCut/chatcut-mcp`, Windows `%APPDATA%\ChatCut\chatcut-mcp.cmd`. Expand it to the actual absolute path. If missing, ask the user to open Desktop and sign in, then retry; never create or edit the launcher.
3. Merge `{"command":"<expanded absolute launcher path>","env":{"CHATCUT_MCP_CLIENT":"antigravity"}}` under `mcpServers.chatcut_desktop`.
4. Refresh via CLI `/mcp` reload or App Settings → Customizations → Installed MCP Servers → refresh. Verify with a real Desktop `get_active_project` or `list_projects` read. A null project is valid. Report actual installation, registration, discovery and read statuses separately; if tools do not load in this chat, provide a self-contained continuation prompt for a new conversation and verify there.

For a source-video remake, use Desktop's bundled `video-gen` Skill and inspect `submit_video_remake`; confirm duration/credits before generation. A remake-only request needs agreement before installing Desktop and disclosure that membership is needed. Ordinary editing of an existing Web project stays on that chosen route.

## Hosted Web plugin: install and connect

Use this route for existing Web projects or an explicit Web choice. The plugin provides the hosted server, with tool namespace `chatcut_chatcut` (plugin `chatcut` + server `chatcut`). Never manually register a duplicate hosted server or retarget it. Check status in App Settings → Customizations → Installed MCP Servers or CLI `/mcp`; list installed plugins with `agy plugin list`.


After Marketplace approval, open **Customizations → Marketplace → ChatCut → Add**, or run:

```bash
agy plugin install chatcut@antigravity-plugins-official
```

Before approval, obtain this repository from GitHub or use an existing local clone, then install the package:

```bash
agy plugin install <path-to-clone>/antigravity
```

To install from GitHub without cloning, point at this subdirectory:

```bash
agy plugin install https://github.com/ChatCut-Inc/agent-plugin/tree/main/antigravity
```

Use the subdirectory URL. The repository root URL installs the Gemini CLI
extension instead, which connects the MCP server without these skills.

To sign in:

1. Open **Agent settings** (**Cmd+,** on macOS / **Ctrl+,** elsewhere).
2. Open **Customizations** and select **Authenticate** next to the ChatCut MCP server.
3. Complete ChatCut sign-in in the browser.
4. Paste the authorization code back into Antigravity and select **Submit**.

In the CLI, use `/plugin` → Installed → chatcut → **Sign in**. Return to the same chat after authorization; rediscover tools and call `list_projects` with `{}` once. A successful empty list is valid; a login callback alone does not prove this chat has loaded usable tools. If still absent, refresh the existing server once and recheck without repeating OAuth merely for missing tools.

Tokens are refreshed automatically. The plugin connects to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Authentication uses OAuth. No API key or access token is stored in this repository.
To reconnect, select **Authenticate** next to the ChatCut MCP server in **Customizations**.

## Example requests

- “Install ChatCut on this computer.”
- “Recreate this reference video with my product.”
- “Continue editing my existing ChatCut project.”
- “Create a ChatCut project from this video and remove filler words and long pauses.”
- “Add bilingual captions and keep them clear of the speaker.”
- “Turn this interview into a 60-second vertical highlight.”
- “Add editable motion graphics for the three main points.”
- “Export the approved timeline as an MP4.”

## Media and data handling

- The plugin can read and update ChatCut projects, assets, timelines, captions, generations, and exports available to the ChatCut account authorized by the user.
- Files are transferred only when the user asks to import them or the requested workflow requires the supplied media.
- The bundled import helper uploads selected media directly to storage using a ChatCut-issued upload session. Media bytes do not pass through the ChatCut application backend.
- Generated media and edits are stored in the user's ChatCut project. Desktop media registration is local; hosted Web imports use the transfer paths above.
- The package contains JavaScript and Markdown support files but no native executables or bundled `ffmpeg`/`ffprobe` binaries.
- Motion Graphic reference and Design Style thumbnails may be resolved from the pinned jsDelivr manifest in `assets/widget-media/manifest.json`, downloaded temporarily, and shown as ordinary chat image bubbles when the host can display images in chat, followed by concise ordinary text choices with stable ids mapped internally. Otherwise, or if a thumbnail is unavailable, the agent describes the option in text without exposing its source URL.
- Antigravity voice selection is text-only; users audition samples in the ChatCut editor or voice library.
- Web project review uses the clean `editorUrl` returned by the plugin. Antigravity's browser agent may open it when the user asks; no internal tab, boot-token handoff, or host theme is promised. Desktop delivery happens in the Desktop window.
- Review ChatCut's [Privacy Policy](https://chatcut.io/privacy) and [Terms of Service](https://chatcut.io/terms) before use.

## Safety and user control

- Voice cloning requires explicit confirmation that the user has the right to use the referenced voice.
- Paid generation actions should not run until required choices and consent are established.
- The user can review editable work in the ChatCut editor before requesting export.
- Disconnect or remove ChatCut from the host's Customizations to stop future plugin access. Account and data-deletion requests are handled according to the ChatCut Privacy Policy.

## Plugin structure

```text
plugin.json                  Antigravity plugin metadata
mcp_config.json              Hosted ChatCut MCP connection
skills/                      ChatCut workflow skills
assets/                      Plugin logo and widget media manifest
LICENSE                      Apache License 2.0
```

## Support

- Product and documentation: [chatcut.io](https://chatcut.io)
- Privacy and data deletion: `team@chatcut.io`
- Plugin support: `dev@chatcut.io`

## License

This plugin package is licensed under the Apache License 2.0 (`Apache-2.0`). See [LICENSE](LICENSE).

# ChatCut for Antigravity

ChatCut lets Antigravity agents turn natural-language requests into editable video
projects through a hosted Model Context Protocol (MCP) server and bundled workflow skills. Agents can create
projects, import media, edit timelines, transcribe speech, add captions and motion
graphics, generate media, and export finished work. Available tools and generation
models depend on the connected ChatCut account and its current access.

Edits remain editable in the ChatCut timeline. The plugin does not replace a project with a locally flattened video unless the user explicitly requests a rendered deliverable.

## Requirements

- Antigravity App, CLI, or IDE with plugin support.
- A ChatCut account.
- Network access to `https://api.chatcut.io` and `https://app.chatcut.io`.
- Node.js 18+ for the bundled import helpers. The upload-helper route also
  requires separately available `ffmpeg` and `ffprobe` on the computer running
  it. Ordinary MCP editing does not require these local tools.
- Paid ChatCut generation uses ChatCut credits and may require a paid plan.
  Installing the plugin does not include generation credits.

## Install and connect

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

Tokens are refreshed automatically. The plugin connects to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Authentication uses OAuth. No API key or access token is stored in this repository.
To reconnect, select **Authenticate** next to the ChatCut MCP server in **Customizations**.

## Example requests

- “Create a ChatCut project from this video and remove filler words and long pauses.”
- “Add bilingual captions and keep them clear of the speaker.”
- “Turn this interview into a 60-second vertical highlight.”
- “Add editable motion graphics for the three main points.”
- “Export the approved timeline as an MP4.”

## Media and data handling

- The plugin can read and update ChatCut projects, assets, timelines, captions, generations, and exports available to the ChatCut account authorized by the user.
- Files are transferred only when the user asks to import them or the requested workflow requires the supplied media.
- The bundled import helper uploads selected media directly to storage using a ChatCut-issued upload session. Media bytes do not pass through the ChatCut application backend.
- Generated media and edits are stored in the user's ChatCut project.
- The package contains JavaScript and Markdown support files but no native executables or bundled `ffmpeg`/`ffprobe` binaries.
- Motion Graphic reference and Design Style thumbnails may be resolved from the pinned jsDelivr manifest in `assets/widget-media/manifest.json`, downloaded temporarily, and shown as ordinary chat image bubbles when the host can display images in chat, followed by concise ordinary text choices with stable ids mapped internally. Otherwise, or if a thumbnail is unavailable, the agent describes the option in text without exposing its source URL.
- Antigravity voice selection is text-only; users audition samples in the ChatCut editor or voice library.
- Project review uses the clean ChatCut editor link returned by the plugin. The plugin does not assume that an embedded preview or popup will open.
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

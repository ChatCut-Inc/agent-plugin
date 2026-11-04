# ChatCut for Grok Bot

ChatCut lets Grok Bot agents turn natural-language requests into editable video
projects through a hosted Model Context Protocol (MCP) server. Agents can create
projects, import media, edit timelines, transcribe speech, add captions and motion
graphics, generate media, and export finished work. Available tools and generation
models depend on the connected ChatCut account and its current access.

This is the Grok Bot listing. Cursor uses the separate `cursor/` listing in the
same repository, with the same skills.

Edits remain editable in the ChatCut timeline. The plugin does not replace a project with a locally flattened video unless the user explicitly requests a rendered deliverable.

## Requirements

- A Grok Bot account with plugin access.
- A ChatCut account.
- Network access to `https://api.chatcut.io` and `https://app.chatcut.io`.
- Node.js 18+ for the bundled import helpers. The upload-helper route also
  requires separately available `ffmpeg` and `ffprobe` on the computer running
  it. Ordinary MCP editing does not require these local tools.
- Paid ChatCut generation uses ChatCut credits and may require a paid plan.
  Installing the plugin does not include generation credits.

## Install and connect

After marketplace approval:

1. Open **Connect apps** in Grok Bot. On a computer it is in the sidebar; in the
   phone app, tap your avatar at the top left, then **Connect apps**.
2. Find **ChatCut** and select **Add**. If it is not listed, it is not yet
   available through that marketplace.
3. Select **Authorize** or **Authenticate** and complete ChatCut sign-in in the browser.
4. If the host shows **Waiting for authorization**, select **Reopen** on the
   in-chat card, or **Reconnect** on the app, and finish the browser flow.
5. Confirm ChatCut appears under **Installed** and its tools are connected.

The plugin connects to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Authentication uses OAuth. No API key or access token is stored in this repository.
Follow the official [Grok Bot connection guide](https://cursor.com/help/grok-bot/connect-apps)
for reconnecting an existing installation.

## Example requests

- “Create a ChatCut project from this video and remove filler words and long pauses.”
- “Add bilingual captions and keep them clear of the speaker.”
- “Turn this interview into a 60-second vertical highlight.”
- “Add editable motion graphics for the three main points.”
- “Export the approved timeline as an MP4.”

## Media and data handling

- The plugin can read and update ChatCut projects, assets, timelines, captions, generations, and exports available to the ChatCut account authorized by the user.
- Files are transferred only when the user asks to import them or the requested workflow requires the supplied media.
- Media that stays on the user's phone, or that the bot's computer cannot read, is uploaded through a ChatCut browser upload link created for the current project; it works in a phone browser.
- The bundled import helper uploads selected media directly to storage using a ChatCut-issued upload session. Media bytes do not pass through the ChatCut application backend.
- Generated media and edits are stored in the user's ChatCut project.
- The package contains JavaScript and Markdown support files but no native executables or bundled `ffmpeg`/`ffprobe` binaries.
- Motion Graphic reference and Design Style thumbnails may be resolved from the pinned jsDelivr manifest in `assets/widget-media/manifest.json`, downloaded temporarily, and shown as ordinary chat image bubbles followed by Grok Bot native option cards or text choices. If a thumbnail is unavailable, the agent still presents the choice without the image.
- Grok Bot voice selection is text-only; users audition samples in the ChatCut editor or voice library.
- Project review uses the clean ChatCut editor link returned by the plugin. The plugin does not assume that an embedded preview or popup will open.
- Review ChatCut's [Privacy Policy](https://chatcut.io/privacy) and [Terms of Service](https://chatcut.io/terms) before use.

## Safety and user control

- Voice cloning requires explicit confirmation that the user has the right to use the referenced voice.
- Paid generation actions should not run until required choices and consent are established.
- The user can review editable work in the ChatCut editor before requesting export.
- Disconnect or remove ChatCut from Grok Bot's Connect apps to stop future plugin access. Account and data-deletion requests are handled according to the ChatCut Privacy Policy.

## Plugin structure

```text
.cursor-plugin/plugin.json   Cursor-format manifest consumed by Grok Bot
mcp.json                     Hosted ChatCut MCP connection
skills/                      ChatCut workflow skills, mirrored in ../cursor/skills
assets/                      Plugin logo and widget media manifest
LICENSE                      Apache License 2.0
```

## Support

- Product and documentation: [chatcut.io](https://chatcut.io)
- Privacy and data deletion: `team@chatcut.io`
- Plugin support: `dev@chatcut.io`

## License

This plugin package is licensed under the Apache License 2.0 (`Apache-2.0`). See [LICENSE](LICENSE).

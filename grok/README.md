# ChatCut for Grok Bot and Cursor

ChatCut is an editable AI video editor connected to Grok Bot and Cursor through a hosted Model Context Protocol (MCP) server. The plugin can create and open ChatCut projects, import media, edit timelines, transcribe and clean speech-led videos, add captions and motion graphics, generate media, manage voice workflows, verify results, and export finished work.

Edits remain editable in the ChatCut timeline. The plugin does not replace a project with a locally flattened video unless the user explicitly requests a rendered deliverable.

## Requirements

- A Grok Bot or Cursor account with plugin access.
- A ChatCut account.
- Network access to `https://api.chatcut.io` and `https://app.chatcut.io`.
- Node.js 18 or newer only when importing a conversation attachment or other file readable by the agent. No Node installation is required for ordinary project editing.

## Install and connect

1. Open **Plugins** in Grok Bot or Cursor.
2. Find **ChatCut** and select **Add**.
3. Select **Authorize** or **Authenticate** and complete ChatCut sign-in in the browser.
4. If the host shows **Waiting for authorization**, select **Reopen** and finish the browser flow.
5. Confirm ChatCut appears under installed plugins, then start a fresh conversation.

The plugin connects to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Authentication uses OAuth. No API key or access token is stored in this repository.

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
- Motion Graphic reference and Design Style thumbnails may be resolved from the pinned jsDelivr manifest in `assets/widget-media/manifest.json`, downloaded temporarily, and shown as ordinary chat image bubbles followed by Grok Bot native option cards or text choices. If a thumbnail is unavailable, the agent still presents the choice without the image.
- Grok Bot voice selection is text-only; users audition samples in the ChatCut editor or voice library.
- Project review uses the clean ChatCut editor link returned by the plugin. The plugin does not assume that an embedded preview or popup will open.
- Review ChatCut's [Privacy Policy](https://chatcut.io/privacy) and [Terms of Service](https://chatcut.io/terms) before use.

## Safety and user control

- Voice cloning requires explicit confirmation that the user has the right to use the referenced voice.
- Paid generation actions should not run until required choices and consent are established.
- The user can review editable work in the ChatCut editor before requesting export.
- Disconnect or remove ChatCut from the host's Plugins settings to stop future plugin access. Account and data-deletion requests are handled according to the ChatCut Privacy Policy.

## Plugin structure

```text
.cursor-plugin/plugin.json   Cursor and Grok Bot plugin manifest
mcp.json                     Hosted ChatCut MCP connection
skills/                      ChatCut workflow skills
assets/                      Plugin logo and widget media manifest
LICENSE                      GNU General Public License v3.0
```

## Development and marketplace submission

The plugin should be committed to a public Git repository before submission. Test the repository locally with Cursor's local plugin workflow, verify OAuth sign-in and at least one read-only ChatCut tool call, then submit the repository URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

Do not commit OAuth tokens, user media, generated project data, or local configuration files.

## Support

- Product and documentation: [chatcut.io](https://chatcut.io)
- Privacy and data deletion: `team@chatcut.io`
- Plugin support: `dev@chatcut.io`

## License

This plugin package is licensed under the GNU General Public License v3.0 only (`GPL-3.0-only`). See [LICENSE](LICENSE).

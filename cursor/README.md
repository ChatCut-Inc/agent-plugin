# ChatCut for Cursor

ChatCut lets Cursor agents turn natural-language requests into editable video
projects through a hosted Model Context Protocol (MCP) server. Agents can create
projects, import media, edit timelines, transcribe speech, add captions and motion
graphics, generate media, and export finished work. Available tools and generation
models depend on the connected ChatCut account and its current access.

This is the Cursor listing of the ChatCut plugin. Grok Bot uses the separate
`grok/` listing in the same repository. The two listings share the same skills and
hosted MCP server; each one declares its own host in the `x-chatcut-mcp-client`
header and is hidden from the other host with `minClientVersions`.

## Requirements

- Cursor with plugin support.
- A ChatCut account.
- Network access to `https://api.chatcut.io` and `https://app.chatcut.io`.
- Node.js 18+ for the bundled import helpers. The upload-helper route also
  requires separately available `ffmpeg` and `ffprobe` on the computer running
  it. Ordinary MCP editing does not require these local tools.
- Paid ChatCut generation uses ChatCut credits and may require a paid plan.
  Installing the plugin does not include generation credits.

## Install and connect

After marketplace approval, add **ChatCut** from Cursor's plugin marketplace and
complete ChatCut sign-in in the browser when Cursor asks for authorization.

The plugin connects to:

```text
https://api.chatcut.io/api/external-mcp/mcp
```

Authentication uses OAuth. No API key or access token is stored in this repository.

## Media and data handling

- The plugin can read and update ChatCut projects, assets, timelines, captions, generations, and exports available to the ChatCut account authorized by the user.
- Files are transferred only when the user asks to import them or the requested workflow requires the supplied media.
- The bundled import helper uploads selected media directly to storage using a ChatCut-issued upload session. Media bytes do not pass through the ChatCut application backend.
- Generated media and edits are stored in the user's ChatCut project.
- The package contains JavaScript and Markdown support files but no native executables or bundled `ffmpeg`/`ffprobe` binaries.
- Review ChatCut's [Privacy Policy](https://chatcut.io/privacy) and [Terms of Service](https://chatcut.io/terms) before use.

## Plugin structure

```text
.cursor-plugin/plugin.json   Cursor plugin manifest
mcp.json                     Hosted ChatCut MCP connection
skills/                      Symlink to ../grok/skills
assets/                      Symlink to ../grok/assets
LICENSE                      Apache License 2.0
```

## Support

- Product and documentation: [chatcut.io](https://chatcut.io)
- Privacy and data deletion: `team@chatcut.io`
- Plugin support: `dev@chatcut.io`

## License

This plugin package is licensed under the Apache License 2.0 (`Apache-2.0`). See [LICENSE](LICENSE).

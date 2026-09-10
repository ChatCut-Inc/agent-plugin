# ChatCut Desktop Codex plugin

This directory is the standalone source for the store-facing, skill-only
`chatcut-desktop-codex-plugin`. It displays as **ChatCut** and teaches Codex how
to download, install, open, connect, or repair the signed production ChatCut
Desktop app using the host's native tools.

The plugin deliberately contains:

- one connection skill: `skills/connect-chatcut-desktop`;
- the Codex plugin manifest in `.codex-plugin/plugin.json`;
- the public ChatCut logo in `assets/logo.png`.

It deliberately contains no installer scripts, MCP manifest, or ChatCut editing
skills. The skill points Codex at ChatCut's official downloads and lets Codex
use normal platform facilities. The installed Desktop app owns the local
`chatcut_desktop` MCP server and synchronizes its current editing skills into
Codex.

On macOS the connection skill validates the app at each installation boundary:
the read-only mounted source, a new non-merging staging copy, and the final
destination. This keeps local copy or replacement failures from being
misreported as a broken official signature.

## Repository isolation

This folder has no `package.json`, is not registered as a workspace package,
and is not imported by any ChatCut application or build.

## Build the upload ZIP

Run from the repository root:

```sh
cd plugins/chatcut-desktop-codex-plugin
zip -X -r chatcut-desktop-codex-plugin.zip .codex-plugin assets skills \
  -x '*/.DS_Store' '.DS_Store'
```

Upload the resulting archive through the existing ChatCut plugin's **Skills
only** update flow. Do not create a second plugin identity.

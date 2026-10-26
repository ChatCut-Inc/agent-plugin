# ChatCut Desktop Codex plugin

This directory is the standalone source for the Desktop setup-only
`chatcut-desktop-codex-plugin`. It displays as **ChatCut** and teaches Codex how
to download, install, open, connect, or repair the signed production ChatCut
Desktop app using the host's native tools.

The plugin deliberately contains:

- a connection skill: `skills/connect-chatcut-desktop`;
- a creation starting point: `skills/start-chatcut-desktop`, also declared as
  the optional OpenAI onboarding Skill;
- the Codex plugin manifest in `.codex-plugin/plugin.json`;
- the public ChatCut logo in `assets/logo.png`.

It deliberately contains no installer scripts, MCP manifest, or ChatCut editing
playbooks. The connection Skill points Codex at ChatCut's official downloads
and lets Codex use normal platform facilities. The installed Desktop app owns the local
`chatcut_desktop` MCP server and synchronizes its current editing skills into
Codex.

After connection, the starting Skill uses the live Desktop capabilities and
catalog to help the user choose a scenario. It preserves a specific request
and existing project/assets, continues in the same conversation when tools are
available, and prepares one continuation when the host needs a new chat.
The optional setup button depends on the host version; the packaged Skill and
default prompts also work as explicit entry points.

See [Codex installation and first creation](../docs/codex-install.md) for
source-aware installation, updates, Web/Desktop boundaries and acceptance.

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
cd chatcut-desktop-codex-plugin
zip -X -r chatcut-desktop-codex-plugin.zip .codex-plugin assets skills \
  -x '*/.DS_Store' '.DS_Store'
```

Before a public update, download the current published release and compare its
identity and contents with this directory. A similarly named cached package
is not proof that it is the same release. Upload through the matching existing
plugin's **Skills only** update flow after that check. Package changes still
need the platform's checks/review and publication; merging this repo does not
update a directory installation automatically. Do not create another public
plugin identity as a workaround.

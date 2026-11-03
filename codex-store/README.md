# ChatCut in the OpenAI plugin directory

This folder turns the Hosted Codex package in `codex/` into the ZIP uploaded to
the existing **ChatCut** entry in the OpenAI plugin directory (shared by Codex
and ChatGPT; dashboard identity `chatcut-desktop`, ID in `listing.json`).

It deliberately holds no copy of the skills or listing text. Starter prompts,
descriptions, and listing links live in `codex/.codex-plugin/plugin.json`, so
git and directory installs show the same listing. `listing.json` holds only what
must differ in the directory build:

- `pluginName`: the dashboard identity. Do not change it to `chatcut`; ChatCut
  Desktop removes `chatcut@*` plugins when it connects to Codex.
- `installSource`: the backend `install_source` value for directory installs,
  registered in the ChatCut repo's `docs/development/analytics/install-source.md`.
- `markChannelInMcpUrl`: puts `chatcutInstallSource` and `chatcutMcpSurface`
  on the MCP URL. Public submission rejects MCP server headers, so the URL is
  the only channel marker that survives review. Codex keys stored sign-ins by
  server URL, so turning this on asks existing directory users to sign in once.
- `screenshots`: optional `./assets/...` PNG paths, at most 4096 px per side
  and 5 MiB each.

App IDs are not set here: plugin ZIPs with `apps` / `.app.json` cannot
currently be submitted, and an MCP app cannot be added to an existing
skills-only entry.

## Build

```sh
node codex-store/build.mjs
```

The script stages `dist/codex-store/chatcut-desktop/`, validates it against the
directory limits (listing lengths, HTTPS listing URLs, three starter prompts,
square PNG icons, no MCP headers, no apps or hooks), and writes
`dist/codex-store/chatcut-desktop-<version>.zip`. Use `--no-zip` to stage only
and `--out <dir>` to stage elsewhere. It exits non-zero on any problem.

Bump `codex/.codex-plugin/plugin.json` before each upload: every upload needs a
new version, and only one review can be active per plugin.

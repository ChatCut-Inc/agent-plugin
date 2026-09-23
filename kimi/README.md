# ChatCut for Kimi Work

Kimi Work agents use natural-language requests to build **editable ChatCut video projects**. This package keeps Kimi's hosted OAuth connection and live in-app editor while adding the full editing craft catalog.

## Install and connect

Import the packaged directory/ZIP through Kimi Work's supported plugin installation flow, then use **Login** on the ChatCut connector card. Start a fresh conversation after upgrading so Kimi discovers the new skills. Do not install a second `chatcut` MCP server or copy another host's configuration.

- Entry point: `kimi.plugin.json`; all skills are under `skills/`.
- Compatibility metadata: `.mcp.json`, `.app.json`, root icon and brand assets from the Kimi-provided 0.1.4 package.
- Hosted endpoint / OAuth resource: `https://api.chatcut.io/api/external-mcp/mcp`.
- Attribution headers: `x-chatcut-mcp-client: kimi_work`, `x-chatcut-mcp-surface: embedded-preview`.
- This Kimi-only package intentionally has no `.codex-plugin` or `.cursor-plugin` manifest.

The source package is version **0.1.6**. It follows the independent-directory delivery used by `plugins/grok` (PR #4099), but draws craft from the current repository rather than copying Grok's older MG instructions. Source baseline: `600fa53770`.

## Mandatory basics

Keep `chatcut-plugin-basics-kimi-work` as the Kimi-specific entry point. Both its discovery `description` and the manifest's `skillInstructions` require loading the complete skill **before the first ChatCut MCP call**, including project discovery. This is an instruction-level requirement, not a claim that Kimi's runtime enforces a pre-call hook. That host behavior still needs an installed-client check.

After creating or targeting a project, use `chatcut-editor-handoff` to open the exact returned handoff URL in the in-app browser before further edits. The browser URL keeps login/layout parameters; user-visible links use the clean editor URL.

## Audit of the supplied 0.1.4 package

| Original component                                  | Decision in this package                                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kimi.plugin.json`, `.mcp.json`, `.app.json`, icons | Keep Kimi transport, OAuth, app identity, and branding; update package version, capability description, mandatory basics instruction, and source-code license metadata. |
| All eight supplied Kimi skills                      | Keep their names and contents from the Kimi-provided 0.1.4 package, including its connection, editor, import, editing, caption, export, and verification behavior.      |
| Skills absent from the supplied package             | Add distinct ChatCut capabilities without replacing the Kimi-authored workflows: MG, multicam, generation, voice/music, product help, and error diagnosis.              |
| `.codex-plugin/plugin.json`                         | Omit from the Kimi distribution; it is another host's discovery entry.                                                                                                  |
| Old README installation commands                    | Replace private repository paths and the outdated three-skill copy recipe with this self-contained package.                                                             |

## Included skills (19)

- Preserved Kimi skills: `chatcut-plugin-basics-kimi-work`, `chatcut-connect`, `chatcut-editor-handoff`, `chatcut-media-guide`, `chatcut-editing-guide`, `chatcut-captions-guide`, `chatcut-export-guide`, `chatcut-verification-guide`.
- Added capabilities not covered by that set: `create-motion-graphics`, `multicam-sync`, `digital-human`, `music`, `voice`, `video-gen`, `video-translation`, `shader-gen`, `product-help`, `known-errors`.

References, MG font/composition guidance, and the multicam transcript-offset helper are included. Skill references resolve inside this package, not in a `.claude` workspace. Added skills defer media import to Kimi's original `chatcut-media-guide`; MGs use direct inline authoring; host interaction follows the mechanics already supplied by Kimi Work.

`product-help` is the current Docs-first version: it searches and opens the latest official ChatCut Docs, Releases, and Changelog instead of embedding changeable product facts.

## Validate and package (monorepo maintainers)

From the monorepo root:

```sh
node scripts/check-kimi-plugin.mjs
```

Create a new archive outside the source tree, with the manifest at the ZIP root:

```sh
cd plugins/kimi
zip -r /path/to/chatcut-kimi-work-0.1.6.zip .
```

Use a new output filename or a fresh directory: updating an old ZIP in place can retain removed skills. No other host package, repository files, or absolute symlinks are needed. The existing plugin snapshot workflow publishes `kimi/` alongside the other hosts.

Keep this directory a reviewable, expanded release snapshot like `grok/`. On updates, preserve the Kimi-supplied skills, refresh only the additional capabilities from their canonical sources, and keep `product-help` aligned with the current Docs-first source. Bump the Kimi package version when changing its distributed content.

## Acceptance and safety boundaries

Local checks validate package structure, JSON configuration agreement, skill references, and helper syntax. They do not prove installation, skill auto-loading, OAuth, browser rendering, or media playback in Kimi Work.

For installed-client acceptance: list projects without opening one; create/select a project and confirm one-tab handoff with the media layout; import approved media through the Kimi-provided flow; make a simple edit and caption change; create an editable MG after visual style alignment; verify the project; export only on request. Check that basics is read before the first tool. No paid generation is needed just to check package installation.

Imported files go to ChatCut cloud storage only with the user's authorization. A denied transfer must not be bypassed. Host OAuth tokens never go into shell/configuration; boot-token links stay in browser control. Chargeable generation and voice cloning follow their explicit confirmation/consent requirements.

Plugin source is licensed under GPL-3.0-only (see `LICENSE`, matching the other official plugin packages). Use of the hosted service is subject to ChatCut's service terms. Support: [chatcut.io](https://chatcut.io).

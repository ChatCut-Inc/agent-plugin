---
name: connect-chatcut-desktop
description: Install, open, connect, or repair ChatCut Desktop when the chatcut_desktop MCP tools are missing or unavailable. Do not use from a managed agent already running inside ChatCut Desktop, or when chatcut_desktop tools are already available.
---

# Connect ChatCut Desktop

Use the signed production Desktop app as the only source of the local MCP server
and editing skills. This plugin contains instructions only, not an installer or
MCP configuration.

If `chatcut_desktop` tools are already available, call `get_active_project` and
continue with the user's editing request. Do not reinstall the app or change MCP
configuration. If the current host is ChatCut Desktop's managed Codex agent,
stop; its project-pinned MCP and built-in skills are already authoritative.

## Download

Use only the matching official URL:

- macOS Apple Silicon: `https://api.chatcut.io/desktop/download/macos`
- macOS Intel: `https://api.chatcut.io/desktop/download/macos-x64`
- Windows x64: `https://api.chatcut.io/desktop/download/windows`

ChatCut Desktop supports macOS 13 or newer on Apple Silicon or Intel and Windows
on x64. Linux is unsupported. Do not substitute a search result, third-party
mirror, hosted ChatCut MCP, or historical `chatcut@chatcut-inc` plugin.

## Install or repair

Try to complete the ordinary platform installation for the user with the host's
narrow command approval:

1. Detect the operating system and architecture and choose the URL above.
2. Download the official artifact to a temporary directory. If ChatCut is
   already installed but will not open, inspect it before replacing it.
3. On macOS, follow the verified, non-merging installation procedure below. On
   Windows, open the downloaded installer and let the visible installer finish.
4. Open ChatCut Desktop. It registers `chatcut_desktop` and synchronizes its
   editing skills into Codex automatically.

Installing outside the project sandbox or opening an installer may require host
approval. Request only the scoped operation needed for that step; never ask the
user to enable persistent Full access.

### Verified macOS installation

Treat the mounted app, the copied staging app, and the installed app as three
different artifacts. Checking each boundary prevents a failed or merging copy
from being misreported as a bad official signature.

1. Download the matching DMG into a newly created temporary directory. Verify
   it with `hdiutil verify`, then attach it read-only and non-browsing at a
   unique temporary mount point. Do not reuse an existing `/Volumes/ChatCut*`
   mount or infer which numbered mount belongs to this download.
2. Before changing an installed app, validate the mounted
   `<mount>/ChatCut.app` itself:

   ```sh
   /usr/bin/codesign --verify --deep --strict --verbose=4 "<mount>/ChatCut.app"
   /usr/sbin/spctl --assess --type execute --verbose=4 "<mount>/ChatCut.app"
   /usr/bin/codesign -d --verbose=4 "<mount>/ChatCut.app"
   ```

   A valid production app reports bundle identifier `io.chatcut.desktop` and
   Team ID `7WK2VURFPK`. Its authority is
   `Developer ID Application: ChatCut Inc. (7WK2VURFPK)`. Its Gatekeeper source
   is `Notarized Developer ID`.

   Preserve the commands' real exit codes and relevant stderr; do not infer
   failure from a missing or translated summary line.

3. Choose `/Applications/ChatCut.app` when the host can obtain narrowly scoped
   approval, otherwise use `$HOME/Applications/ChatCut.app`. Inspect any
   existing app first. Never copy on top of an existing bundle: `cp -R` or
   `ditto` into an existing destination can merge old and new bundle contents
   and make the result fail signature validation.
4. Use `/usr/bin/ditto` to copy the mounted app to a new, absent staging path on
   the same destination volume, such as `.ChatCut.install-<unique>.app`. Run the
   same `codesign` and `spctl` checks against that staging path. If this check
   fails while the mounted source passed, discard only the staging copy and
   retry the copy once; do not re-download or blame the official signature.
5. Quit ChatCut if it is running. Move an existing destination aside as a
   uniquely named backup, rename the verified staging app to the final
   `ChatCut.app` path, and validate the final path again. If promotion or final
   validation fails, restore the backup. Remove or trash the backup only after
   the final app validates and opens successfully.
6. Detach the exact temporary mount and remove only the temporary files created
   for this attempt. Cleanup failure must not replace the installation result.

For macOS launch or code-signing failures, identify which of the three paths
failed. `codesign` failure means the bytes or bundle structure at that exact
path are invalid; `spctl` failure with a successful `codesign` check is a
Gatekeeper, notarization, policy, quarantine, or network diagnosis and must not
be summarized as an invalid code signature. Inspect permissions and quarantine
state separately. Clear stale quarantine only after the official mounted app
passes both signature and Gatekeeper validation.

Never modify or ad-hoc sign the app, disable Gatekeeper, or bypass an invalid
signature. On Windows, do not bypass an invalid or unknown Authenticode
publisher warning.

Retry one fresh official download only when the downloaded DMG is incomplete or
corrupt, is for the wrong architecture, or the mounted source app itself fails
validation. A staging or destination failure calls for repairing that local
copy step, not downloading the same verified bytes again. Do not loop.

When stopping, report evidence rather than a synthesized diagnosis: name the
failing path (`mounted source`, `staging copy`, or `installed destination`), the
command that failed, its relevant output, and whether the mounted source passed.
Do not say “macOS reported an invalid code signature” unless `codesign` failed
on the mounted source app after the one permitted clean re-download.

## User handoff

If the host cannot download, mount, extract, copy, approve, repair, or run the
installer, stop trying. Tell the user what blocked automation and give them the
exact matching official URL above so they can install and open ChatCut with the
visible operating-system flow.

After ChatCut opens, ask the user to sign in there if needed. Do not handle their
credentials or add `chatcut_desktop` to `config.toml` manually. Because Codex
loads MCP tools and skills when a task starts, tell the user to start a new task
after Desktop finishes connecting.

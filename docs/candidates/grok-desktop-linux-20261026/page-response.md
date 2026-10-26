ChatCut plugin for Grok install guide

This plain text version is returned because this request does not look like a browser page navigation.
Browser page: http://127.0.0.1:4327/grok?target=desktop&c=fa231cb4-ec11-451a-b3b6-e835d6c6c153

Full installation guide:

Selected route: ChatCut Desktop. Follow only the Desktop section below; a Hosted Web connection does not complete this setup.

# Install and use the ChatCut plugin in Grok Bot

Use this message in Grok Bot:

> /goal Read chatcut.io/grok to install and use the ChatCut plugin

Keep `/goal` and the rest of the message unchanged when the page provides a
route-specific or preview URL. The URL determines the installation route.

This preview contains the same installation instructions that will serve `/grok`.
It does not establish marketplace approval or a completed first-install test.
Follow the selected route below; preserve existing connections, profiles and
projects. When setup is ready, use the user's video brief or ask what they want
to make. Do not create an empty project just to declare installation successful.

## Select the route from the requested URL

- **Default: Web.** With no `target` selection or explicit Desktop request in context, use the hosted ChatCut
  connection. It avoids installing a desktop application and is the ordinary
  starting point for using the plugin from Grok Bot.
- **Desktop.** When the page URL has `target=desktop`, install/connect
  ChatCut Desktop on the computer that runs Grok's Command tools. The pinned
  Linux route below covers Debian-compatible x86_64 with glibc 2.38+.
- `target=web` explicitly selects Web. The URL selection takes priority over old connections or preferences. Without a target, respect an explicit Desktop request; otherwise use the Web default.
- The page must include the effective selection in its returned agent text.
  A browser-only selected tab does not determine the route. Never use the `c`
  parameter as a Web/Desktop switch; it retains the website's existing meaning.
- Do not silently switch routes after an error. Report the actual route and
  its missing prerequisite. A Web success does not prove Desktop setup or vice versa.

## Web route

Use Grok Bot's actual app and MCP controls. If the user is in grok.com rather
than Grok Bot, explain that its custom Connector flow is a different host path.
Do not install Desktop for a Web request.

1. Inspect existing ChatCut HTTP connections and native Skills. Reuse a working
   matching connection and call it reuse; do not replace a signed-in account.
2. In Connect apps, look for the verified ChatCut plugin. If available, use its
   normal Add and Authenticate flow. If it is absent, inspect whether this host
   exposes a custom Remote HTTPS MCP connection. Use that supported control
   with `https://api.chatcut.io/api/external-mcp/mcp`; do not invent an arbitrary
   repository-install command. If neither route exists, report the host limitation.
3. Complete OAuth through the host and ChatCut's normal sign-in. Bring the
   actual authorization page to the user for any required login/consent. Do
   not ask for passwords or one-time codes in chat, copy cookies, or use another
   application's login. An anonymous HTTP 401 is not authorization success.
4. Inspect the actual connected tool namespace and perform one harmless
   authenticated `list_projects` call using its schema. An empty list is valid.
5. Find and natively load the installed `chatcut-plugin-basics` Skill and the
   Skill needed for the user's next task. If the package is unavailable and the
   connection exposes only tools, say so. The source package is
   [grok/](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/grok/README.md); its
   [basics](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/grok/skills/chatcut-plugin-basics/SKILL.md) and workflow
   files may be read as references, but file reads do not count as installed
   native Skills or marketplace installation. Preserve this gap instead of
   announcing the full plugin installed.

Web creation, editable timelines, export and reopen have passed with an existing
manual connection. The fresh `/goal` guide → new OAuth authorization → native
packaged Skill path still needs its own acceptance. Do not repeat a full video
workflow merely to test installation; use the minimal authenticated read above.

## Desktop route: Linux requirements

- Grok Bot with a Linux x86_64 Command runtime and a visible desktop. A macOS
  Grok front end does not mean its Command executes on macOS.
- A glibc Linux environment. This pinned dependency route supports Debian 13
  and requires glibc 2.38 or newer; it does not establish support for every Linux
  distribution. Node.js 18+, npm, curl, Python 3 and dpkg-deb are needed.
- A ChatCut account. Sign-in happens in the selected app window. Ask the user to
  complete login, OTP and any required consent there; do not request secrets in
  chat, copy another profile's login, or extract tokens.

Check the actual OS/arch/glibc, available display and free space before installing.
Allow at least 4 GB for the app, extraction and profile. If this is not a supported
Linux runtime, explain that this candidate does not apply; do not silently install
on the user's Mac or switch to the hosted web plugin.

Download and read the [Desktop artifact manifest](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/docs/candidates/grok-desktop-linux-20261026/manifest.json), which pins the app, dependency, bridge and Skill. Do not execute anything with a failed size or SHA256 check.

## 1. Create an isolated installation

Resolve the normal Linux data and config bases: use absolute `XDG_DATA_HOME` and
`XDG_CONFIG_HOME` when present, otherwise `$HOME/.local/share` and `$HOME/.config`.
Use `<data base>/ChatCut/desktop` for installation and `<config base>/ChatCut` for
the app profile. Reuse an existing matching installation/profile rather than
replacing it. Do not read or copy another profile's credentials. If an existing
installation uses a different version or cannot be identified, preserve it and
explain the mismatch before proceeding. Never clear a profile to make it fresh.

Keep these task-specific values for subsequent commands:

```sh
# Resolve these two paths from the actual runtime before use.
CHATCUT_INSTALL_ROOT="<resolved data base>/ChatCut/desktop"
CHATCUT_PROFILE="<resolved config base>/ChatCut"
CHATCUT_SOCKET="$CHATCUT_PROFILE/mcp.sock"
```

Create `downloads`, `app`, `deps`, `npm-prefix`, `npm-cache` and `logs` under the installation root. Create the profile only if absent. Do not change HOME, global environment variables or system library
paths. Save the manifest and downloaded guide in the installation root so it can
be resumed with the same candidate later.

Download the exact ChatCut 0.7.21 AppImage from:

```text
https://d2k0dx41dpnoir.cloudfront.net/ChatCut-0.7.21-x64-candidate-40056548143-1.AppImage
```

Save it as `downloads/ChatCut-0.7.21.AppImage`. It must be **696162360 bytes** with
SHA256 `e9c04f60c10a023e2da4955b25d4e38bcbfd90654a3d1ca13fed65276ce41a05`.
Verify before making it executable. Extract it in the new `app` directory with
`--appimage-extract`; this supported AppImage route also works when FUSE is absent.
The resulting executable is `app/squashfs-root/AppRun`. Keep the extracted tree
in place; the generated MCP launcher points into this installation.

## 2. Resolve native dependencies without changing the system

Inspect dynamic dependencies of the app executable and the extracted
`flux_native.node` addon. Locate the latter inside this installation's
`resources/app.asar.unpacked` tree; do not use an addon from an old install.

For the known missing `libpci.so.3` on the supported Debian runtime, download:

```text
https://deb.debian.org/debian/pool/main/p/pciutils/libpci3_3.13.0-2_amd64.deb
```

It must be **75572 bytes** with SHA256
`f8f01883368fe86417b3845aa08ea3508ca59f5e1bb0983673629e227f5ac868`.
Verify the package metadata (`libpci3`, `1:3.13.0-2`, `amd64`) and extract it with
`dpkg-deb -x` into `deps/libpci3`. This does not install a system package or run
maintainer scripts. The library directory is:

```sh
CHATCUT_LIB_DIR="$CHATCUT_INSTALL_ROOT/deps/libpci3/usr/lib/x86_64-linux-gnu"
```

Repeat dynamic-link checks with only this task's `LD_LIBRARY_PATH`. Require no
unresolved dependency in the app executable, addon or private libpci library.
Other required GTK/NSS/GBM/ALSA/X11 and glibc libraries come from the runtime;
record their availability instead of claiming this guide installed them. If a
required dependency remains missing or incompatible, report its exact name and
stage. Do not use `--no-sandbox`, sudo, global library replacement or force
installation to hide the failure.

## 3. Start the new profile and complete sign-in

Before starting, check whether the selected profile already has a GUI instance.
Reuse it if so; do not start a duplicate. Do not stop another profile's GUI.
Use the current Bot's visible display and normal sandbox. Unset
`ELECTRON_RUN_AS_NODE` only for this GUI launch, retaining the runtime's display
and session environment. Launch in the background with new stdout/stderr log
files under `logs`, recording its actual PID:

```sh
env -u ELECTRON_RUN_AS_NODE   CHATCUT_DESKTOP_USER_DATA_DIR="$CHATCUT_PROFILE"   CHATCUT_MCP_SOCKET="$CHATCUT_SOCKET"   CHATCUT_DESKTOP_DISABLE_MCP_AUTO_REGISTER=1   LD_LIBRARY_PATH="$CHATCUT_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"   "$CHATCUT_INSTALL_ROOT/app/squashfs-root/AppRun"
```

Use the host's normal persistent/background process mechanism so the application
is not terminated when the shell command finishes. `DISABLE_MCP_AUTO_REGISTER`
keeps this isolated install from modifying other host clients automatically.

Inspect the real window on this Bot's computer. If it shows Welcome or sign-in,
bring that window to the user and pause for their normal login. Do not add the
Command connection while signed out: some host versions cache the smaller
pre-login tool catalog. After login, confirm the visible signed-in Home, the GUI
process for this profile and an actual listening MCP socket. A socket file alone
or a project list from a headless process does not establish GUI readiness.

The app generates `$CHATCUT_PROFILE/chatcut-mcp`. Check that it exists and is
executable, but **do not read, print or upload its contents**; it contains a
profile-scoped capability. Do not manually construct a replacement launcher.

## 4. Install the pinned private npm bridge and connect once

Download [chatcut-desktop-mcp-0.1.2-linux-qa.0.tgz](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/docs/candidates/grok-desktop-linux-20261026/chatcut-desktop-mcp-0.1.2-linux-qa.0.tgz)
into `downloads` and verify **3288 bytes**, SHA256
`9fc81a56a59a10bcda8c84260c49bf58cb1aa58ef54343649d58f4af4a58b061`.
This is the tested local Linux bridge candidate. It is private and not on npm;
do not run an `npx` command for this unpublished version or use the public 0.1.1
package, which does not support Linux.

```sh
npm install --offline --ignore-scripts --no-audit --no-fund   --prefix "$CHATCUT_INSTALL_ROOT/npm-prefix"   --cache "$CHATCUT_INSTALL_ROOT/npm-cache"   "$CHATCUT_INSTALL_ROOT/downloads/chatcut-desktop-mcp-0.1.2-linux-qa.0.tgz"
```

Use Grok's normal native custom MCP operation for a **Command / stdio** connector.
Discover its current schema. The connection name is `ChatCut Desktop`. If that exact name exists, inspect
its command/profile and reuse only if they match; do not overwrite an unrelated
connection. Use:

- command: the absolute Node executable returned by the actual runtime
  (`/usr/bin/node` on the verified Debian environment);
- args: one argument,
  `<resolved install root>/npm-prefix/node_modules/chatcut-desktop-mcp/bin/chatcut-desktop-mcp.js`;
- env: `CHATCUT_DESKTOP_MCP_LAUNCHER` set to
  `<resolved profile>/chatcut-mcp`, and
  `LD_LIBRARY_PATH` set to this install's verified private library directory.

Do this only after the signed-in GUI is ready. Inspect the first actual tool
catalog in the resulting namespace, including `list_projects`, `target_project`,
`read_project`, `push_asset` and `edit_item`. Record the observed catalog; previous
0.7.21 acceptance saw 61 tools, but do not replace a current observation with that
number. If editing tools are missing, report the host's current connection state
and catalog. A restart/re-add is an extra repair, not first-connection success.

Call `list_projects` once through **this connector**, using its live schema. An
empty list is a valid result for a fresh local profile; a signed-in account may
also list existing remote projects. Do not copy or edit any project to prove
installation. Never substitute a hosted HTTP connection or direct shell JSON-RPC
for the real host call.

## 5. Save and load the Desktop Skill natively

Download [SKILL.md](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/docs/candidates/grok-desktop-linux-20261026/SKILL.md) and
[native-update-skill-input.json](https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/478be0948e90ac711c8d60de92c1aaeb3cb86d51/docs/candidates/grok-desktop-linux-20261026/native-update-skill-input.json) from the artifact links pinned by this page. Verify their file hashes against the manifest and the
JSON `body` SHA256:
`94d5e2b064fe55775ac1577ae99deac8a61602b65ebcc1231004f99d85c9ac71`.
The body revision is `grok-desktop-qa-20261026-v2`.

Use Grok's native Skill management. In the verified host the write operation is
`cursor.UpdateSkill` with `action`, `name`, `description`, `body` and optional `id`;
inspect the current schema before calling it. The supplied JSON contains the
exact name/description/body, not an instruction to write arbitrary local files.

The private Skill name is `chatcut-desktop`. If absent, create it through the
native write operation. If it already exists, load and compare its body: reuse
an exact v2 match. If it differs, preserve it and explain the conflict rather
than overwriting the user's Skill or making a duplicate. Earlier QA Skills have
different names and must not be reused as proof of this installation.

Finally invoke the native `Skill` loader by name, compare the returned full body
to v2 and confirm it is available to this Bot. Reading a Markdown file or app
resources does not count as native Skill installation. If this host has no
native save/load operation, stop with that exact capability gap.

## 6. Prepare the task and explain recovery

Tell the user that the ChatCut Desktop connection is ready on the
actual runtime and that its private Desktop Skill loaded. Ask for their video
brief or source media, unless it was already supplied. This request alone does
not authorize paid generation, transcription or an unrelated sample export.
Do not create another Bot or an empty ChatCut project just for setup.

When the user later opens a known project, use this connection's normal
`target_project` with `openWindow=true`, then read it before editing. Reuse a
uniquely matched project and its original identities.

If a project reports `already has a live owner`, do not assume a stale lock.
Check this profile's GUI and listening socket first. In an authorized recovery,
start the same installed app/profile normally if its GUI is absent, wait for
signed-in readiness, then target the original project through the same MCP
connection and let ChatCut hand ownership to its window. Read back the original
project and items. Record this as a recovery intervention. If one normal attempt
fails, report the exact stage/error and preserve the project. Do not delete owner
files, manually take ownership, kill other processes, re-add the connection or
create a replacement project. A missing tool catalog is a separate host issue.

## Verify the selected route and return

Tell the user which route is ready, where it runs, whether sign-in succeeded and
which native Skill actually loaded. For Desktop, verify GUI/profile/socket
readiness and one real MCP list_projects response. For Web, verify the OAuth
connection and one real authenticated read. An empty list can be successful.
Keep technical evidence, artifact hashes and any corrections in a separate
installation receipt; never include credentials. A re-add, extra startup or
corrective prompt is a repair, not an uninterrupted first attempt. Do not call
both routes installed because one succeeded.

Do not publish this candidate to npm, add an official website entry, create a PR,
or change existing installations as part of following this guide.

Official host references: [Command connections](https://docs.x.ai/grok-bot/team-bots)
and [private Skills](https://docs.x.ai/grok-bot/skills-routines-and-automations).
The candidate's exact API behavior is supported by its recorded native host
save/load and Command connection tests; the combined one-message path is being
verified separately.

## Current evidence and remaining limits

The Linux app, private npm candidate, login-first connection and native Desktop
Skill v1 have each been verified. The v2 Skill adds normal GUI/project recovery;
its combined `/goal` installation is under test. The Desktop source uses a local
npm tarball until release, and native private Skill save/load until a verified
packaged installation exists. These are explicit supported candidate steps,
not a claim of marketplace automatic delivery.

A shared Linux computer with pre-existing OS libraries and a fresh profile is
not a blank-machine test. Fresh Web authorization and packaged Skill discovery,
all-process cold start and repeated stability remain separate acceptance items.

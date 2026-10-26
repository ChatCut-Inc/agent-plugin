---
name: chatcut-desktop
description: Use for reviewing or editing local ChatCut Desktop projects through a Grok Command MCP connection. Covers Desktop project targeting, local media import, editable timelines and Flux verification.
---

# ChatCut Desktop through Grok

Candidate revision: grok-desktop-qa-20261026-v2 (local draft; native validation pending).

Use the existing ChatCut Desktop Command MCP connection on the computer where
Grok runs the command. A Mac Grok client does not imply its Command executes on
that Mac. Inspect the actual runtime before choosing a Desktop installer.
Desktop and the hosted ChatCut web plugin have different media and render paths.

## Connect and target

For setup requests, confirm the GUI for the intended Desktop profile is running
and visibly signed in before first adding the Command connector. On Linux,
check that its expected MCP socket is listening; a socket file or successful
list_projects alone does not prove GUI readiness. If no same-profile GUI is
running, normal startup is part of an authorized setup or recovery request.
Use the verified app and profile, retain required task-scoped dependencies, and
wait for the signed-in Home and socket. If login is needed, let the user complete
it in the app. Use the app-generated launcher for that Desktop profile.
Do not read its contents: it contains a profile-scoped capability. The public
chatcut-desktop-mcp 0.1.1 npm bridge does not support Linux; direct launchers and
local candidate bridges are distinct routes. Installing a bridge does not
install Desktop, its native dependencies, or this Skill.

Discover the actual connection namespace and live tool schema. If several
Desktop connections exist, use the one requested for the task; do not silently
switch to hosted HTTP or another profile. Missing editing tools are a connection
readiness problem: report the observed tool list and error rather than hiding a
restart/re-add as an uninterrupted setup success.

Use list_projects to find the requested project and target_project with
openWindow when opening it. Read the project before changing it. Reuse an
existing uniquely matched project; do not create a replacement to hide a failed
operation. If a name has multiple matches, resolve the intended project first.

## Recover a project owner conflict

An "already has a live owner" error does not establish a stale lock. In the
observed Linux case the GUI was absent, its socket refused connections, and a
live headless MCP process still owned the project. Other causes remain possible.
Check the intended profile, GUI process and socket listener before choosing a
recovery. Read only necessary owner PID/mode fields; do not read capability or
credential values. An empty active project can be normal in headless mode.

For an authorized recovery, reuse the existing connection and original project
ID. Start the verified GUI normally only if that profile has no running GUI;
confirm the same profile is signed in and its socket is listening. Then use the
live target_project schema with openWindow=true for the original project and
let the product perform its normal owner handoff. Read back the original
project, timeline, assets and linked items through that same MCP connection.
Record startup and targeting as interventions, separately from the failed run.
Do not silently perform these actions during a strictly read-only diagnostic.

If the profile or owner cannot be established, or one normal startup and target
attempt still fails, stop with the exact stage and error. Preserve the project
and connection. Do not delete owner files, take over ownership manually, kill
an unverified process, recreate the project, or re-add the connector as an owner
fix. Missing tool names are a separate host catalog issue; report them without
claiming that project recovery repaired tool discovery.

## Import and edit

Use Desktop push_asset for a local media path reachable by the Command runtime.
Read its current schema and check existing assets before retrying an import.
Hosted import_media/upload-helper instructions do not apply to this surface.
Use real edit_item/edit_track/manage_timelines tools and preserve editable items.
Treat timeline frame ranges as [start,end); derive frames from the actual fps.
For a trim, preserve linked audio and inspect the tool's includeLinked behavior.
Keep the same project, timeline, asset and item identities when continuing work.
Do not replace an editable timeline with an externally flattened video.

## Verify and return

Respect read-only requests: use read_project, inspect_item or preview_timeline
without editing or importing. For an approved edit, read back the affected
items, duration, dimensions and links. Use preview_timeline viewer frames for
Flux image checks, including the first and final in-range frame where useful.
An image is visual evidence, not proof of audio playback or file export.

When export is requested, use Desktop's normal export tool and track_progress;
check the actual file. Linux software H.264 export and the native SDK's format
capabilities are different layers. Do not substitute shell transcoding or cloud
rendering for a failed product export without the user's chosen fallback.

Report the real connector, target project and result. Separate native Skill
loading from manual document reads, existing-session reuse from fresh
installation, and a single successful run from repeated stability. Paid media
generation, transcription and export are outside a read-only review request.

---
name: chatcut-plugin-basics-copilot
description: "Hosted ChatCut plugin sessions only (the plugin-contributed `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. MANDATORY GitHub Copilot CLI prerequisite for any conversation that may use the ChatCut MCP server: invoke this skill before the first ChatCut MCP tool call and wait for it to finish loading. Also invoke it whenever video editing or creation should remain editable in ChatCut, even if the user does not mention ChatCut. Covers local or attached media editing, captions, subtitles, transcription, trimming, talking-head cleanup, highlights, B-roll, overlays, generation, export, project or editor opening, importing, targeting, verification, watching, and identifying the active ChatCut project or editor URL. Also invoke it when ChatCut tools appear missing, unavailable, or not connected."
---

# ChatCut Plugin Basics (GitHub Copilot CLI)

## Purpose

Host scope: this skill is written for GitHub Copilot CLI. In Claude Code, use
`chatcut-plugin-basics-claude`; in Codex, use `chatcut-plugin-basics`.

Surface scope: this skill covers the hosted ChatCut plugin (`chatcut` MCP server) only. When the conversation uses ChatCut Desktop (`chatcut_desktop*` servers), follow the desktop server's own instructions and skip this skill unless the user explicitly chooses the plugin/web surface — desktop media is registered locally (no uploads) and delivery happens in the ChatCut Desktop window, not a browser.

Use this as the base operating context whenever GitHub Copilot CLI works with a ChatCut project through the ChatCut plugin.

This skill provides the common ChatCut project model, editing operating context, project onboarding flow, editor handoff rules, and connector boundaries. It does not provide detailed tool parameters, full task playbooks, or generation prompt recipes; load the matching ChatCut skill and use tool schemas for task-specific workflows.

### Pending installation handoff (only when present)

Before the first Hosted ChatCut operation in a new session, check the optional local receipt using an existing Node.js 18+ runtime and the `acquisition-receipt.mjs` file adjacent to this loaded SKILL.md. Resolve the loaded skill's absolute directory first; do not execute the placeholder below literally:

```text
node <absolute-loaded-skill-directory>/acquisition-receipt.mjs pending <environment> copilot
```

Use the active Hosted MCP endpoint's environment: `api.chatcut.io` → `production`, `api.chatcut.dev` → `beta`, a known local development endpoint → `local`. Do not guess the environment from the current working directory. No usable runtime, unknown endpoint, an unresolved loaded-skill directory, or an empty object means silently skip attribution and continue normal work; do not mention this optional measurement to the user or install software just for analytics. The helper reads only `~/.chatcut/acquisition/<environment>/copilot.json`, validates its format and seven-day pending window, and returns no auth credentials.

When it returns `installationReceipt`, first call the existing **Hosted** `list_projects` with exactly that value. This read does not choose or retarget a project. After a successful result containing `installationReceiptStatus: "linked"`, run:

```text
node <absolute-loaded-skill-directory>/acquisition-receipt.mjs acknowledge <environment> copilot <exact-linked-code>
```

`pending`, an absent status, authentication failure, or a failed call is not delivery confirmation: leave the receipt untouched and continue the ordinary auth/editing workflow; retry at most once after authentication, otherwise on the next session. Never invent a code, mark `hostedLinked` yourself, pass this to Desktop tools, or treat a copied instruction/install command as a completed plugin installation. Already available/authenticated Hosted tools need no reinstall or new session.

### MCP surface

The plugin serves ChatCut tools through the configured `chatcut` MCP server.
Resolve tools from the current Copilot tool list by server and ChatCut tool name
(`list_projects`, `read_project`, `edit_item`, and so on). Tool names may be
deferred or host-prefixed, so use Copilot's tool discovery when necessary and
treat the active MCP manifest as the runtime contract.

Do not bootstrap, install, or register other local MCP surfaces from this skill. Local app integrations are responsible for their own discovery and registration.

Verify the configured server with `copilot mcp get chatcut`. GitHub Copilot CLI
does not expose a non-interactive `mcp login` command. If OAuth is needed, open
the interactive `/mcp` dashboard, select the plugin-contributed `chatcut`
server, and choose **Authenticate**.

### When no ChatCut tools are present

If the `chatcut` server is configured but no ChatCut tools exist in the
session, the usual causes are missing OAuth or a session that started before
the plugin was installed. The server answers unauthenticated discovery with
401, so the client can end up with an empty tool list. This is not a broken
install, and reinstalling the plugin does not fix it.

Do not tell the user only that ChatCut is unavailable or ask them to reconnect
without a concrete action. Tell them to enter `/mcp`, select `chatcut`, choose
**Authenticate**, and complete the browser flow. Do not remove or overwrite the
plugin-contributed server as an authentication workaround.

Sign-in is per ChatCut environment, so being signed in to one environment does
not sign the user in to another. Copilot CLI captures plugin skills and MCP
tools when a session starts; after installation or authentication, use `/new`
or `/restart` and check again.

In no-source validation, do not inspect ChatCut source code to learn parameters or hidden behavior. Use the MCP schema, HTTP tool manifest, these skills, and project/editor state.

## Role

When working in ChatCut projects, act as a professional video editing assistant. The user thinks in clips, cuts, stories, and visible outcomes, not data structures. Use video-editing judgment to clarify needs, recommend a concrete strategy, and execute the requested edit.

Align on needs and concrete strategy before creative or strategic work that shapes the output: video use case, content form, output format, source-material strategy, creative direction, or editing approach. Mechanical operations such as renames, small property changes, obvious undo, and user-specified item edits can execute directly.

## Your Environment

ChatCut is a browser-based multi-track non-linear video editor. A project holds one or more timelines, each with its own canvas (fps, width, height), video tracks, audio tracks, timeline items, and a shared asset library.

The MCP surface derives `userId` from connector auth. Project tools can list/create/target accessible projects; project-scoped tools should use the project id from those tool results or from the editor URL.

Tool calls write through ChatCut Zero/DB/S3 paths, so editor changes should be real and visible. Do not write directly to the database. Do not infer hidden IDs; read them from the matching project, timeline, item, or asset tool result. A project-specific connect failure is an access/session problem, not a request to try repo debugging. Confirm the editor is signed in as the same account used by the connector, verify the project id exactly, and confirm the user has access to that project.

The preview surface is the live ChatCut editor. The user can have the project open while GitHub Copilot CLI works through the plugin. Project changes should become visible in the editor; the visible editor is part of the user experience, not just a proof surface.

GitHub Copilot CLI works from project data, tool results, transcripts, assets, and composed timeline proof. Do not assume the browser view, project state, or timeline layout is still the same after time has passed; the user may have edited the project manually.

Visual understanding has two distinct surfaces:

- To inspect raw imported or attached source media, use GitHub Copilot CLI-native visual/file capabilities on the source bytes when available. Do not create a temporary timeline just to inspect source assets.
- To inspect media as it currently appears on the ChatCut timeline or editor, use `preview_timeline` with `views:["viewer"]` and bounded frames. This includes placed clips, trims, crops, captions, overlays, effects, and final framing.

Export is a connector boundary in GitHub Copilot CLI sessions: load `export`, call `submit_export`, then use `track_export` when needed so GitHub Copilot CLI returns the finished render `downloadUrl`.

## Data Model

### Project

A project is the top-level container. It owns a shared asset library and one or more timelines. Each timeline defines its own canvas and contains tracks, items, and timeline-local structure.

Unless the user says otherwise, edits should target the intended active or targeted project and timeline. If the target is ambiguous, establish the project before doing nontrivial work.

### Assets

Assets are source media in the project library. One asset can be referenced by many timeline items.

Agent-facing asset types include video, audio, image, gif, motion-graphic, and svg. Content-level properties such as source media, filename, remote readiness, and Motion Graphic code/properties belong to the asset.

If the user asks to use, edit, place, replace, caption, trim, inspect, or otherwise work with an asset but does not attach or explicitly provide the source in GitHub Copilot CLI, do not immediately treat it as missing. Users can upload media directly in the ChatCut editor, so first inspect the targeted project's asset library with `browse_assets` and match by filename, type, visible content, transcript state, or other available metadata. Ask the user to upload or provide the asset only when it is not present, not ready, inaccessible, or ambiguous after checking project assets.

### Tracks

Tracks are lanes on the timeline.

Video tracks stack. Higher video tracks render above lower tracks; an item on an upper track covers lower video during its duration, and lower video shows through where the upper track is empty. If audio continues while no video item is visible, the rendered canvas can show black.

Audio tracks mix in parallel. Audio tracks do not cover each other; multiple audio tracks playing at the same moment are audible together.

Items on the same track must not overlap. Locked tracks should not be edited until the user unlocks them.

Sequential clips belong on the same track in increasing time order. Layered visuals such as overlays, B-roll, and Motion Graphics belong on higher video tracks above the content they cover.

### Items

Items are timeline instances of assets. Each item references an asset and owns placement and timing.

Change an item to change when or where something appears: timeline start, duration, track, position, size, opacity, fades, source offset, or playback speed. Change an asset to change reusable source content, Motion Graphic code, or Motion Graphic property defaults.

Timeline placement and duration are frame-native. User-facing summaries may use seconds, but timeline edits should preserve exact frame state from project data when available.

Motion Graphics follow the same split: visual code and editable properties belong to the asset; timing, position, size, and per-instance property overrides belong to the item.

### Editing operations - defaults and ripple

Timeline edits leave gaps by default.

Deleting an item removes it without automatically moving later items unless ripple behavior is explicitly used. Shortening an item leaves a gap; later items must be moved intentionally if the gap should close. Adding into an occupied same-track range is rejected unless the edit makes room.

Ripple affects only the same track. After ripple or other structural edits, related tracks such as captions, Motion Graphics, B-roll, and music may no longer align with the edited speech or video and should be checked.

On overlap conflicts, first decide whether the content is sequential or layered. Sequential content belongs in time order on the same track. Layered content belongs on a higher video track.

## Alignment & Execution

### How to Align Before Acting

Understanding the user's intended outcome is the foundation of creative editing. Clarify before committing to creative or strategic choices.

Alignment calibrates to how much the user has already given:

- "Make a 1-minute YouTube cut of this interview" gives platform and length, but may still need confirmation on what to keep.
- "Cut this podcast into highlights" is vague; align on target platform, length, and what counts as a highlight.
- "Make a promo for our app" with a product URL but no brand assets may need alignment on logo/assets, platform, aspect ratio, duration, production approach, and tone.
- "Add English subtitles" is clear and narrow; execute.
- "Make it shorter" or "keep going" after prior alignment usually does not need a new alignment round.
- "Make a promo video for my product" without product type is ambiguous; clarify product type, target platform, and use case before choosing a scenario.

### When to align

Align when the request involves a new project, vague creative intent, paid or time-consuming generation with missing creative details, multi-shot or multi-asset consistency, or a major fork such as voiceover versus music-only, cinematic versus casual, what to keep, or which features to highlight.

For dependent major steps, confirm the foundation before building downstream work when practical. Motion Graphics, music, and captions depend on the speech/structure edit; image and video generation depend on the approved script or direction.

### When to skip

Proceed without a new alignment round when the user already gave a clear brief with target, style, and constraints; the task is mechanical and reversible; the user said to continue; the user gave a follow-up correction; or the user explicitly asked to run end-to-end.

### How to align well

Ask only for load-bearing information. Do not run a fixed checklist. Do not ask for information GitHub Copilot CLI can determine from project state, assets, transcript, or visual proof. The user should answer only preferences, requirements, or missing materials that are actually theirs to decide.

When structured input would reduce friction, load `widget-forms` and use
Copilot's `ask_user` form tool instead of sending a long multi-question
paragraph. Do not call ChatCut's `ask_followup_questions` solely to render a
form because Copilot CLI does not render that MCP App response. Do not include
media upload as a form question; ask for missing source media separately
through `asset-import`. Do not emit raw internal ChatCut chat tags.

Establish a sample before batching related creative outputs when style consistency matters.

## Verify Before Modifying

Before changing timeline items, tracks, or assets, refresh only the relevant discovery stage when it may be stale or unknown. The user may have changed the project manually in the browser since the last turn.

Do not rely on stale item ids, track layout, asset readiness, transcript state, or previous timeline placement when making project-scoped edits.

`read_project` returns only the project map and timeline directory; omitted details are unknown, not empty. Use `preview_timeline` for timeline tracks, paginated items, gaps, markers, composed frames, and bounded speech. Request only the needed `views`, and narrow timeline reads with `tracks`, `itemIds`, `fromFrame`, or `toFrame`. Use `inspect_item` for complete detail about exactly one placed item, `browse_assets` for the source library, `inspect_asset` for source-asset detail, and `manage_media_pool` for folders. Follow `nextOffset` when the needed timeline entry is not on the current page. Do not call several discovery stages in parallel or reconstruct the full topology by default.

## Do Only What Was Asked

Execute the user's request, then stop. Do not silently add unrequested music, captions, transitions, B-roll, color grading, or other enhancements. Suggest additions when useful, but do not perform them without user intent.

At editing checkpoints, prioritize the live ChatCut project as the review surface. Do not turn a checkpoint into an export just because the timeline changed. Export only after the user asks for export/render/download/final delivery, after all planned editing stages are approved and the current step is final delivery, or when the user requested a standalone deliverable and no further review checkpoint is pending.

Do not infer export intent from broad editing requests such as "edit this video", "cut this down", "clean this up", "make a version", or similar phrasing. By default, a ChatCut editing request delivers an editable timeline for review, not a downloadable MP4. GitHub Copilot CLI verification is not user approval; after verification, keep the live project available and let the user decide whether to continue editing or export.

When reporting a reviewable edit, pair the concise result summary with a natural next step based on the visible surface. If the editor is open or available, it is appropriate to mention that the user can click Play in the editor to watch the result; phrase it conversationally and contextually, not as a fixed approval script.

For a ChatCut review checkpoint, "project", "version", "cut", "montage", or "put it in ChatCut" means an editable ChatCut timeline unless the user explicitly asks for a standalone finished file. Do not satisfy a ChatCut editing request by locally rendering one flattened MP4 and placing only that finished MP4 on the timeline. For multi-source work such as B-roll, highlight reels, or travel montages, build from original sources in ChatCut timeline items with trims, source offsets, ordering, layers, captions, audio, and effects. Use judgment on sequencing and scope; do not make local source screening a mandatory step before import when obvious or likely-needed originals can be uploaded while inspection continues. A flattened clip may be an extra reference only after the editable timeline exists, not the primary deliverable.

## How You Think About Editing

Start from the project context: what assets exist, where they are on the timeline, what is said, and what the viewer sees and hears. Go deeper only when needed.

Editing has a natural order: get the structure right first, then refine timing, then add finishing touches. Doing this out of order creates rework because captions, Motion Graphics, B-roll, and music depend on the final structure.

Think in terms of what the viewer sees and hears, not just individual tracks.

Before reporting done, verify the actual result. For timeline edits, check that the intended items changed and that no unintended gaps, overlaps, or misplaced layers remain. After significant structural edits, check dependent elements such as captions, Motion Graphics, B-roll, and music. For generated or visual work, inspect an actual composed result before claiming it looks correct.

## Design Style Consistency

A Design Style is the project's visual identity: colors, fonts, style guidance, and real logos or reference images. It mainly shapes Motion Graphics and can also influence other on-screen text such as captions.

When work spans several related visual outputs, align on or follow one coherent design style before batch production so the project reads as one family. Do not lock in a design style from an unconfirmed guess.

Skip design-style work for one-off quick fixes unless the user asks for it. A single lower-third or small overlay is not automatically a project-wide design-style decision.

## Project Onboarding And Editor Handoff

### Establish the target project

Before nontrivial ChatCut work, ensure GitHub Copilot CLI is operating on the intended project.

"Switch project" means create or target a different ChatCut project, not a new timeline, unless the user explicitly says timeline or version.

First action for a new ChatCut task: use `list_projects`, `create_project`, `target_project`, or `get_editor_url` through the ChatCut MCP tools. Do not start by debugging the repo, starting local dev services, or opening external browsers.

1. If the user asks for a new project, call `create_project` and surface the live project card/link immediately so the user can open it and watch progress.
2. If the user asks to use ChatCut for attached media, imported files, filler removal, captions, export, or motion graphics and no project is targeted, create or target the project before long analysis, generation, transcription waiting, or clarification that is not required to choose the project.
3. For a generic new job ("my videos", attached files, imported files, "use ChatCut for this") create a fresh project shell unless the user names an existing project, the prompt clearly says to continue/switch to an existing project, or an existing editor URL/context clearly identifies the active project. Do not pick a plausible-looking existing project from `list_projects` just because its name matches the task category.
4. If the user refers to an existing project and no project is targeted, call `list_projects`, choose the intended accessible project, then call `target_project`.
5. If the user asks to duplicate/copy a whole project (safety copy before risky edits, a language or variant version), call `duplicate_project`. It defaults to the currently targeted project. To edit the copy afterwards, pass the returned `newProjectId` as `projectId` explicitly on subsequent tool calls — an explicit per-call `projectId` always wins over session targeting. Pass `activate: false` to keep the source targeted. Owner-only; markers and chat history are not copied. For a variant of one cut inside the same project, use `manage_timelines` `action: "duplicate"` instead.
6. If the user asks to delete a project, call `delete_project` with an explicit full projectId — it never defaults to the targeted project. This is the dashboard's soft delete: data is retained and `restore_project` undoes it; `list_projects` with `includeDeleted: true` shows restorable projects.

### Use the current editor project

If a ChatCut project is already available from an editor URL, read the `projectId` from the `/editor/<projectId>` URL and pass it directly to project-scoped tools.

If `chatcut` asks for authentication, use `/mcp`, select `chatcut`, choose
**Authenticate**, then start a fresh session before retrying. For a
project-access error, verify the exact `projectId` from the editor URL and that
the editor and connector use the same ChatCut account.

### Open the visible editor

Opening or surfacing the editor early is part of the user experience: the user can watch the NLE, media pool, transcription, generation, and timeline placement while work continues. Prefer showing a visible ChatCut surface over leaving it closed.

`list_projects` is discovery, so it should not pick or retarget to one listed project unless the user chose it or the active context clearly identifies it. Once a specific project is created, targeted, or chosen for visible work, surface the live project/editor URL returned by the tool. When browser handoff info is present, open it with browser-control tools; otherwise present a direct editor link.

When a ChatCut result includes `browserHandoff.url`, use that exact URL only
with an already-available, connected browser-control capability. Preserve every
query parameter, especially `editor-boot-token`. Do not install, pair, or
reconfigure a browser integration merely to open ChatCut.

If no browser-control capability is available, present the clean `editorUrl` as
a named Markdown link. Prefer `editorUrl` over a tokenized handoff URL in
user-visible text; do not expose an `editor-boot-token` when a clean URL is
available. Do not guess a replacement ChatCut URL or call deprecated app-bridge
routes.

ChatCut can take a while to load, especially for a new or media-heavy project.
Once a browser tool confirms that it opened or focused the URL, continue with
the connector workflow instead of polling the page unless visible verification
is required by the task.

When sending or opening an editor URL, localize the path based on the user's
language: Chinese users use `/zh/`, Spanish users use `/es/`, and other users
use the default English path. Preserve the returned domain, remaining path,
query string, and hash.

### Keep the visible editor aligned

The visible editor is a live workbench, not a one-time proof. Before long-running visible work such as import, transcription waiting, generation, timeline assembly, export preparation, or final visual verification, it should still match the latest project id. If the visible surface is unavailable or on a different project, open or surface the current editor URL once before falling back to the card/link.

### Billing and pricing exception

If a ChatCut tool returns a pricing or billing URL, present it as an external browser link via `open <url>` / system browser. Do not treat billing as an editor handoff.

## GitHub Copilot CLI Connector Boundaries

ChatCut plugin access is based on connector authentication and the user's accessible projects. Project-scoped operations should use project ids from tool results, editor URLs, or current project state. Do not guess hidden ids.

GitHub Copilot CLI cannot ask the editor UI to pick, relink, upload, export, or capture local files for it; there is no editor-action bridge. Local files, attached files, browser-held files, and public URLs must enter the project through the appropriate media import or asset acquisition path before timeline use:

- The `asset-import` skill for files GitHub Copilot CLI can read locally.
- `import_media` for client-held bytes.
- For public URLs, download the selected media locally first, then use `import_media` for that file.

If a local-file upload/import request is denied by GitHub Copilot CLI host
policy or auto-review because it would transfer private file contents to
ChatCut's external API, stop the ChatCut workflow immediately. Do not fall back
to local editing, local-only registration, local rendering, source inspection,
or extra workaround steps. Tell the user GitHub Copilot CLI was denied
permission to upload the file, and instruct them to upload the media in the
ChatCut editor or rerun GitHub Copilot CLI with permission for that upload.

For raw source-frame inspection, use the local source file directly with GitHub Copilot CLI-native tools such as `ffmpeg` when the file is available. If GitHub Copilot CLI has the original path, including an import-helper `sourcePath`, do not call remote ChatCut tools just to inspect source frames. If GitHub Copilot CLI does not have the original file because the asset was uploaded in the editor or only exists in project storage/cache, use `inspect_asset` with the project asset id. Hosted frame tools return each Lambda-rendered frame as a separate temporary image resource link. If GitHub Copilot CLI cannot inspect a signed URL directly, use curl with the full shell-quoted URI to download each image into a mktemp folder, then inspect the local files individually or stitch the temporary copies into a contact sheet. Use `preview_timeline` with `views:["viewer"]` for composed timeline proof, and never claim visual verification without inspecting the pixels.

In ChatCut plugin workflows, local `ffmpeg`/`ffprobe` is for read-only source inspection and non-editorial diagnostics only: probing metadata, checking streams, or extracting still frames from locally readable source files. Do not use local `ffmpeg` to create a pre-edited, pre-composited, caption-burned, mixed-down, or otherwise flattened video as the main artifact for a ChatCut editing task. Upload/processing time, many source clips, or a desire to make review faster is not a reason to flatten locally. User-visible edits must remain editable ChatCut project state: source assets plus timeline items, trims, captions, audio items, overlays, effects, and ChatCut export when a rendered file is needed.

GitHub Copilot CLI cannot ask the browser/editor tab to pick, relink, upload, export, or capture local files as a substitute for connector import/export flows.

ChatCut native internal chat components do not render directly in GitHub Copilot CLI. Convert those moments into ordinary GitHub Copilot CLI chat or the available structured follow-up/form capability.

If an edit changes spoken words, pauses, retakes, or transcript selection, use the Script-based speech editing workflow from `talking-head-guide` rather than physical timeline deletion as the main edit method.

When captions are enabled, complete one coherent stage of timeline or transcript work before refreshing them: after batched `apply_script`, `clean_script`, or `manage_transcript` with `action:"fix"` calls, run `edit_captions` with `action:"refresh"` once before caption-specific edits or claiming caption correctness. Do not refresh between individual mutations or when captions are disabled; honor a tool-returned caption-refresh notice at the next completed work boundary.

For Motion Graphics, load `create-motion-graphics` and follow the current ChatCut tool schema. Do not stage Motion Graphic JSX in the repository, local HTTP servers, temporary files, or guessed backend workspaces.

Use the relevant ChatCut task skill for media import, transcription, talking-head editing, Motion Graphics, generation, voice, music, verification, export, product help, and error recovery. Shared craft comes from the canonical agent tree; host-specific behavior stays in this plugin's adapters.

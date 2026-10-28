---
name: export
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks.
---

# Export

Export only when the user asks for a render, download, or final standalone deliverable. A review checkpoint normally stays as an editable ChatCut timeline. To check your own work, use `preview_timeline` for the picture and a `format:"audio"` export to hear sound; never make a full-resolution export for a self-check (see `verification`).

Use `submit_export` with the current tool schema. Confirm the target timeline, range, resolution, codec, and format from project state and user intent; do not guess a non-active timeline. Give each export a short, distinctive `name`. Record every returned `renderId` and `expectedFilename`.

Video and audio render locally by default: omit `renderMode`, and the connected ChatCut editor tab renders the timeline on the user's device. Open the project through the browser handoff in the plugin basics skill, activate the requested timeline, and keep that tab open until delivery finishes. If no capable editor is connected, resolve the reported browser or timeline issue and retry locally; there is no automatic cloud retry. Media the editor can already read needs no upload for a local export. If the user explicitly chooses cloud, use that choice directly without requiring browser or Desktop setup first.

Use `track_export` for browser and cloud export status; do not use generation/transcription `track_progress`. Pass the returned `renderId` for an accepted job. A `wait` call is a single status read; honor its check-back interval. If submission timed out or its acknowledgement is uncertain, follow Local Export Recovery before resubmitting so the same export does not start twice.

## Local Export Recovery

For video/audio recovery, consume `details.exportRequest` and `details.recovery` from the tool error when present. Keep the exact project, timeline, full or partial range, format, codec, resolution, output frame rate, and existing request/render identifiers. Do not substitute the visible project or another timeline. `details.exportRequest.range` describes the entire timeline, source-timeline frames, or seconds; it is metadata, not a `submit_export` argument. Frame bounds use the timeline rate, not output `fps`. If an older server returns only an error and hint, preserve those details and read the intended scope from the original request.

Follow the reported recovery action: `restore_local`, `wait_for_capacity`, `check_existing_export`, or `resolve_export_error`. When `details.recovery.track` is present, call `details.recovery.track.tool` with `details.recovery.track.arguments`; do not replace them with an unrelated latest export or the new request's key. A legacy `details.requestId` is a correlation ID, not a `renderId` or protocol-v2 `idempotencyKey`. A busy browser needs time to finish its accepted work. An uncertain acknowledgement needs the original export's outcome known before another local, Desktop, or cloud submission. Missing or unreadable media needs its reported source issue resolved; do not upload files or switch renderers without addressing that issue. These cases do not justify an automatic cloud retry.

When browser-local export is unavailable, explain the specific blocker briefly. If this host exposes ChatCut Desktop tools or the user has a suitable computer, offer the existing Desktop path as a local alternative. Cloud remains available when no usable local path exists or the user chooses it, provided the original request permits cloud rendering. Call `details.recovery.cloudFallback.tool` with `details.recovery.cloudFallback.arguments` when supplied; do not pass the descriptive `exportRequest` object as tool arguments. No extra cloud confirmation is required. Honor explicit local-only, no-upload, and other original constraints; do not require Desktop installation, a failed Desktop attempt, or another fee/plan confirmation. If recovery instead reports `cloudLimitation`, explain it rather than inventing a fallback or changing the requested range, format, or quality. For an older server without recovery metadata, use the current tool schema and preserved request with `renderMode:"cloud"` only after establishing the same local-unavailability and authorization conditions. Never select cloud merely to obtain a download URL.

For a Desktop handoff, honor `details.recovery.desktopLimitation`. Desktop video supports H.264 MP4, not VP8/WebM: keep VP8 in a supported Browser/cloud path rather than silently changing its format. `details.recovery.desktopExportSettings`, when present, contains only compatible format/codec/profile settings, not a complete callable request. For H.264 use `videoProfile:"sdr_h264"` so an old Desktop HDR preference cannot change the actual codec. For audio use `format:"audio",codec:"mp3"` without video fps, resolution or profile. Older servers without these fields require the same compatibility checks against the actual Desktop schema.

Use `details.recovery.desktopUrl` when returned for a compatible Desktop handoff; otherwise use Desktop's existing project library only after checking that it can produce the requested output. `details.recovery.editorUrl` opens the browser project. Hosted `submit_export(renderMode:"local")` renders in a browser; it does not become a Desktop tool. Open the source project in Desktop with an account that can access it and wait for the required media to be readable. An existing local project with the same ID may contain older or different edits: check the intended content and never overwrite that copy automatically.

If actual Desktop tools are available, call `target_project` with the preserved `projectId` and `openWindow:true`, then `read_project` to confirm the local content and target timeline. Name the same `projectId` on every Desktop read/export/track call; targeting does not replace that per-call scope. Call Desktop `export` with the intended `timelineId`, compatible output settings and an appropriate path on that computer. Preserve the video resolution and desired output fps explicitly when its schema accepts them. Desktop fps accepts 24, 25, 30, 50 and 60; omission inherits Desktop's current export preference, not necessarily the source rate. Never pass an unsupported fps such as 29.97 or silently round it to 30: retain Browser/cloud or verify a matching manual Desktop output.

For a partial range, read the actual local project `frameRate` before converting the source-frame or seconds boundaries. Desktop frame bounds use that local rate, independently of output fps; Web summaries' inclusive end needs +1 before mapping to `endFrameExclusive`. A full export omits both bounds. Check the intended content, dimensions and range before exporting; an old local copy must not become a different export just because its range was clamped.

Use Desktop `track_progress` with `target:"export"` and `exportTaskIds` set to the returned task ID. A queued `outputPath` is not a completed file. Wait for a successful terminal result and verify the file on that computer. If this host cannot call Desktop tools, provide the project-opening action and a concise export summary for the user to complete in Desktop's existing UI or Agent; do not promise remote control or file access on another device.

## Delivery

A completed browser export (`source:"browser"`) has no `downloadUrl`: the rendering tab hands the file to that browser's downloads. Completion does not prove the file was saved, so deliver it only after finding it.

1. Look in the user's downloads folder (usually `~/Downloads`) for `expectedFilename`, allowing a browser suffix such as ` (1)` before the extension. Without `expectedFilename`, look for the completed `track_export` entry's `name` (the submitted name plus `.mp4`, `.webm`, or `.mp3`) and take the newest match modified after you submitted. Search for that name only; do not list or read other files there. If you cannot read files on the user's computer, give the user the file name instead.
2. Found: give the user the path and concise render metadata. In Claude Code, also provide a local-file preview link; in Codex, show the local file through its normal file delivery. If the user asked for a specific folder, copy the file there.
3. Not found: follow the result's `deliveryGuidance` when present, asking the user for the one step that matches the browser that rendered it, then look again:
   - Chrome: allow "Download multiple files" from the prompt in the address bar (once; the site stays allowed), then click **Download again** in the editor's Export queue.
   - Claude desktop Browser pane or WorkBuddy: click **Save** in the save dialog; it defaults to Downloads.
   - Codex in-app browser: click **Download again** in the editor's Export queue.
   - Otherwise: ask where the browser saved the file.

If reading the downloads folder needs the user's approval (a macOS privacy prompt or a host permission prompt), tell them you are looking there for the exported file. If the status says the export was written to a file the user picked, that file is the delivery. Do not skip these steps to switch to cloud, and never use cloud just to get a link or to check your own work.

If the user cannot complete local delivery, follow Local Export Recovery above. Offer an available local alternative while keeping cloud directly available when the original request permits it; do not make every user try Desktop. A browser on a remote host downloads on that host, and a Desktop output path is on the Desktop computer. State the actual delivery location rather than claiming the user's device received the file.

A completed result with a `downloadUrl` (cloud video/audio, subtitles, XML): use the host's normal file/link delivery. If the user asked for a specific local path, download it there yourself. In Claude Code, download it to that path or a collision-safe local path and provide the path and a local-file preview link.

Queued or running exports are not delivered. Report any warnings and their effect on the output.

## Other Formats

Subtitle and NLE XML exports use the corresponding `submit_export` format and can complete synchronously with a URL/path; report warnings about unsupported or dropped elements. An archive runs through the editor's bundle pipeline and may return no `renderId`; then check its progress in the editor rather than promising `track_export` support. For transparent Motion Graphic delivery, use the dedicated MG export tool exposed by the current manifest and track the returned render ids.

## Cloud Rendering

Use `renderMode:"cloud"` when the user asks for it or no usable local path exists and the original request permits it, following Local Export Recovery above. Cloud remains a supported fallback; do not describe it as retiring or add new payment, quota, or access rules. If a cloud render is blocked by media that is not remotely readable, use `asset-import` when the user permits upload, or report the blocker; do not flatten or substitute the edit locally without user intent.

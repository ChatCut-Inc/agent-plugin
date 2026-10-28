---
name: chatcut-export-guide
description: Use when the user asks to render, export, download, share, or deliver a ChatCut project.
---

# ChatCut Export Guide

Export is a final-delivery action, not the default result of editing.

## Workflow

1. Verify the target project and confirm the timeline is in the expected state.
2. Ask for the missing delivery choice only when needed: video, audio, subtitles, or editable archive.
3. For video/audio, use `submit_export` with the full project and timeline IDs and the requested format, range, and quality. Browser-local rendering is the default: omit `renderMode` and keep a supported, signed-in ChatCut browser open. Media it can already read needs no extra upload. If the user explicitly chooses cloud, use that choice directly without requiring browser or Desktop setup first.
4. Use `track_export` for this browser/cloud job and record its `renderId` and `expectedFilename`. A completed browser export has no `downloadUrl`: the selected browser downloads it on that browser's device or writes to the chosen file. Relay its delivery guidance; claim file delivery only after the host locates the actual file. A completed cloud result with `downloadUrl` uses the host's normal file/link delivery.
5. Preserve warnings, the editable project, and the exact request when recovery is needed. Queued or running jobs are not delivered.

## Local Export Recovery

For video/audio recovery, consume `details.exportRequest` and `details.recovery` from the tool error when present. Keep the exact project, timeline, full or partial range, format, codec, resolution, output frame rate, and existing request/render identifiers. Do not substitute the visible project or another timeline. `details.exportRequest.range` describes the entire timeline, source-timeline frames, or seconds; it is metadata, not a `submit_export` argument. Frame bounds use the timeline rate, not output `fps`. If an older server returns only an error and hint, preserve those details and read the intended scope from the original request.

Follow the reported recovery action: `restore_local`, `wait_for_capacity`, `check_existing_export`, or `resolve_export_error`. When `details.recovery.track` is present, call `details.recovery.track.tool` with `details.recovery.track.arguments`; do not replace them with an unrelated latest export or the new request's key. A legacy `details.requestId` is a correlation ID, not a `renderId` or protocol-v2 `idempotencyKey`. A busy browser needs time to finish its accepted work. An uncertain acknowledgement needs the original export's outcome known before another local, Desktop, or cloud submission. Missing or unreadable media needs its reported source issue resolved; do not upload files or switch renderers without addressing that issue. These cases do not justify an automatic cloud retry.

When browser-local export is unavailable, explain the specific blocker briefly. If this host exposes ChatCut Desktop tools or the user has a suitable computer, offer the existing Desktop path as a local alternative. Cloud remains available when no usable local path exists or the user chooses it, provided the original request permits cloud rendering. Call `details.recovery.cloudFallback.tool` with `details.recovery.cloudFallback.arguments` when supplied; do not pass the descriptive `exportRequest` object as tool arguments. No extra cloud confirmation is required. Honor explicit local-only, no-upload, and other original constraints; do not require Desktop installation, a failed Desktop attempt, or another fee/plan confirmation. If recovery instead reports `cloudLimitation`, explain it rather than inventing a fallback or changing the requested range, format, or quality. For an older server without recovery metadata, use the current tool schema and preserved request with `renderMode:"cloud"` only after establishing the same local-unavailability and authorization conditions. Never select cloud merely to obtain a download URL.

For a Desktop handoff, use `details.recovery.desktopUrl` when returned; otherwise use Desktop's existing project library. `details.recovery.editorUrl` opens the browser project. Retain the same export scope. Hosted `submit_export(renderMode:"local")` renders in a browser; it does not become a Desktop tool. Open the source project in Desktop with an account that can access it and wait for the required media to be readable. An existing local project with the same ID may contain older or different edits: check the intended content and never overwrite that copy automatically.

If actual Desktop tools are available, use `target_project` for the preserved project, confirm its local content and timeline with `read_project`, and call Desktop `export` with that timeline and the preserved settings. Use Desktop `track_progress` with `target:"export"` and `exportTaskIds` set to the returned task ID. A queued `outputPath` is not a completed file. Wait for a successful terminal result and verify the file on that computer. Preserve partial ranges in the local timeline's frame-rate units rather than copying incompatible source frame numbers. If this host cannot call Desktop tools, provide the project-opening action and a concise export summary for the user to complete in Desktop's existing UI or Agent; do not promise remote control or file access on another device.

## Cloud Rendering

Cloud remains a supported fallback, with `renderMode:"cloud"`, when the user chooses it or no usable local path exists and the original request permits it. Follow Local Export Recovery. Do not require a Desktop attempt, describe cloud as retiring, or add new payment, quota, or access rules. Do not switch a local export to cloud merely to obtain a URL.

---
name: chatcut-export-guide
description: Use when the user asks to render, export, download, share, or deliver a ChatCut project.
---

# ChatCut Export Guide

Export is a final-delivery action, not the default result of editing.

## Workflow

1. Verify the target project and confirm the timeline is in the expected state.
2. Ask for the missing delivery choice only when needed: video, audio, subtitles, or editable archive.
3. For video/audio, use `submit_export` with the full project and timeline IDs and the requested format, range, and quality. Browser-local rendering is the default: omit `renderMode` and keep a supported, signed-in ChatCut browser open. Media it can already read needs no extra upload. If the user explicitly chooses cloud, follow Cloud Rendering without requiring browser or Desktop setup first.
4. Use `track_export` for this browser/cloud job and record its `renderId` and `expectedFilename`. A completed browser export has no `downloadUrl`: the selected browser downloads it on that browser's device or writes to the chosen file. Relay its delivery guidance; claim file delivery only after the host locates the actual file. A completed cloud result with `downloadUrl` uses the host's normal file/link delivery.
5. Preserve warnings, the editable project, and the exact request when recovery is needed. Queued or running jobs are not delivered.

## Local Export Recovery

For video/audio recovery, consume `details.exportRequest` and `details.recovery` from the tool error when present. Keep the exact project, timeline, full or partial range, format, codec, resolution, output frame rate, and existing request/render identifiers. Do not substitute the visible project or another timeline. `details.exportRequest.range` describes the entire timeline, source-timeline frames, or seconds; it is metadata, not a `submit_export` argument. Frame bounds use the timeline rate, not output `fps`. If an older server returns only an error and hint, preserve those details and read the intended scope from the original request.

Follow the reported recovery action: `restore_local`, `wait_for_capacity`, `check_existing_export`, or `resolve_export_error`. When `details.recovery.track` is present, call `details.recovery.track.tool` with `details.recovery.track.arguments`; do not replace them with an unrelated latest export or the new request's key. A legacy `details.requestId` is a correlation ID, not a `renderId` or protocol-v2 `idempotencyKey`. A busy browser needs time to finish its accepted work. An uncertain acknowledgement needs the original export's outcome known before another local, Desktop, or cloud submission. Missing or unreadable media needs its reported source issue resolved; do not upload files or switch renderers without addressing that issue. These cases do not justify an automatic cloud retry.

When browser-local export is unavailable, explain the specific blocker briefly. If this host exposes ChatCut Desktop tools or the user has a suitable computer, offer the existing Desktop path as a local alternative. Cloud remains available when no usable local path exists or the user chooses it, provided the original request permits cloud rendering. Call `details.recovery.cloudFallback.tool` with `details.recovery.cloudFallback.arguments` when supplied; do not pass the descriptive `exportRequest` object as tool arguments. Follow Cloud Rendering to disclose the actual quote; a free cloud quote needs no extra confirmation and a nonzero charge needs one explicit confirmation. Honor explicit local-only, no-upload, and other original constraints; do not require Desktop installation or a failed Desktop attempt. If recovery instead reports `cloudLimitation`, explain it rather than inventing a fallback or changing the requested range, format, or quality. For an older server without recovery metadata, use the current tool schema and preserved request with `renderMode:"cloud"` only after establishing the same local-unavailability and authorization conditions. Never select cloud merely to obtain a download URL.

For a Desktop handoff, honor `details.recovery.desktopLimitation`. Desktop video supports H.264 MP4, not VP8/WebM: keep VP8 in a supported Browser/cloud path rather than silently changing its format. `details.recovery.desktopExportSettings`, when present, contains only compatible format/codec/profile settings, not a complete callable request. For H.264 use `videoProfile:"sdr_h264"` so an old Desktop HDR preference cannot change the actual codec. For audio use `format:"audio",codec:"mp3"` without video fps, resolution or profile. Older servers without these fields require the same compatibility checks against the actual Desktop schema.

Use `details.recovery.desktopUrl` when returned for a compatible Desktop handoff; otherwise use Desktop's existing project library only after checking that it can produce the requested output. `details.recovery.editorUrl` opens the browser project. Hosted `submit_export(renderMode:"local")` renders in a browser; it does not become a Desktop tool. Open the source project in Desktop with an account that can access it and wait for the required media to be readable. An existing local project with the same ID may contain older or different edits: check the intended content and never overwrite that copy automatically.

If actual Desktop tools are available, call `target_project` with the preserved `projectId` and `openWindow:true`, then `read_project` to confirm the local content and target timeline. Name the same `projectId` on every Desktop read/export/track call; targeting does not replace that per-call scope. Call Desktop `export` with the intended `timelineId`, compatible output settings and an appropriate path on that computer. Preserve the video resolution and desired output fps explicitly when its schema accepts them. Desktop fps accepts 24, 25, 30, 50 and 60; omission inherits Desktop's current export preference, not necessarily the source rate. Never pass an unsupported fps such as 29.97 or silently round it to 30: retain Browser/cloud or verify a matching manual Desktop output.

For a partial range, read the actual local project `frameRate` before converting the source-frame or seconds boundaries. Desktop frame bounds use that local rate, independently of output fps; Web summaries' inclusive end needs +1 before mapping to `endFrameExclusive`. A full export omits both bounds. Check the intended content, dimensions and range before exporting; an old local copy must not become a different export just because its range was clamped.

Use Desktop `track_progress` with `target:"export"` and `exportTaskIds` set to the returned task ID. A queued `outputPath` is not a completed file. Wait for a successful terminal result and verify the file on that computer. If this host cannot call Desktop tools, provide the project-opening action and a concise export summary for the user to complete in Desktop's existing UI or Agent; do not promise remote control or file access on another device.

## Cloud Rendering

Use `renderMode:"cloud"` when the user asks for it or no usable local path exists and the original request permits it, following Local Export Recovery above. Cloud remains a supported fallback. Do not require a Desktop attempt or invent account entitlements.

When `submit_export` returns `CLOUD_EXPORT_QUOTE_REQUIRED` with `details.quote`, it has not accepted a render. Tell the user the quoted duration, free allowance and `estimatedCredits` before starting. Retry the same export with `cloudQuoteId` set to that quote's `id`. A zero-credit quote starts directly without another confirmation. For a nonzero charge, obtain one explicit confirmation of that quoted amount, then set `confirmCloudCharge:true`; choosing cloud alone does not approve an unknown charge. Use the account policy returned by the server rather than assuming a free allowance or changing old benefits.

Keep the same project, timeline, range, format and output settings for that quote. If it expires or the service requires a new quote, preserve the request and omit the stale `cloudQuoteId` to request a fresh quote. A larger charge needs new consent. If submission was accepted or uncertain, check the original job before retrying; never obtain a new quote to duplicate an in-progress export.

If cloud rendering is blocked by media that is not remotely readable, use `asset-import` when the user permits upload, or report the blocker. Do not flatten or substitute the edit, upload sources, or switch a local export to cloud merely to obtain a download URL.

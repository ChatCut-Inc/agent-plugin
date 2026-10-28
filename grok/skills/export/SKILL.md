---
name: export
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks.
---

# Export

Export only when the user asks for a render, download, or final standalone deliverable. A review checkpoint normally stays as an editable ChatCut timeline.

Use `submit_export` with the current tool schema. Confirm the target timeline, range, resolution, codec, and format from project state and user intent; do not guess a non-active timeline. Record every returned `renderId`.

Video and audio default to `renderMode:"local"`: the connected ChatCut editor
tab renders the timeline. Open the returned editor URL, activate the requested
timeline, and keep that tab open through completion. If no capable editor is
connected, resolve that error before retrying. There is no automatic cloud retry.
Media already readable by that editor does not need another upload for this route.
If the user explicitly chooses cloud, use that choice directly without requiring
browser or Desktop setup first.

A server-side active-timeline result does not prove that an already-open browser
tab switched timelines. Confirm the intended timeline in that tab, or ask the
user to select it, and pass its explicit ID when submitting the export.

Use `track_export` for browser and cloud export status; do not use
generation/transcription `track_progress`. Pass the returned `renderId` for an
accepted job. A `wait` call is a single status read; honor its check-back guidance.
If submission timed out, follow Local Export Recovery before resubmitting to
avoid duplicate jobs.

## Local Export Recovery

For video/audio recovery, consume `details.exportRequest` and `details.recovery` from the tool error when present. Keep the exact project, timeline, full or partial range, format, codec, resolution, output frame rate, and existing request/render identifiers. Do not substitute the visible project or another timeline. `details.exportRequest.range` describes the entire timeline, source-timeline frames, or seconds; it is metadata, not a `submit_export` argument. Frame bounds use the timeline rate, not output `fps`. If an older server returns only an error and hint, preserve those details and read the intended scope from the original request.

Follow the reported recovery action: `restore_local`, `wait_for_capacity`, `check_existing_export`, or `resolve_export_error`. When `details.recovery.track` is present, call `details.recovery.track.tool` with `details.recovery.track.arguments`; do not replace them with an unrelated latest export or the new request's key. A legacy `details.requestId` is a correlation ID, not a `renderId` or protocol-v2 `idempotencyKey`. A busy browser needs time to finish its accepted work. An uncertain acknowledgement needs the original export's outcome known before another local, Desktop, or cloud submission. Missing or unreadable media needs its reported source issue resolved; do not upload files or switch renderers without addressing that issue. These cases do not justify an automatic cloud retry.

When browser-local export is unavailable, explain the specific blocker briefly. If this host exposes ChatCut Desktop tools or the user has a suitable computer, offer the existing Desktop path as a local alternative. Cloud remains available when no usable local path exists or the user chooses it, provided the original request permits cloud rendering. Call `details.recovery.cloudFallback.tool` with `details.recovery.cloudFallback.arguments` when supplied; do not pass the descriptive `exportRequest` object as tool arguments. No extra cloud confirmation is required. Honor explicit local-only, no-upload, and other original constraints; do not require Desktop installation, a failed Desktop attempt, or another fee/plan confirmation. If recovery instead reports `cloudLimitation`, explain it rather than inventing a fallback or changing the requested range, format, or quality. For an older server without recovery metadata, use the current tool schema and preserved request with `renderMode:"cloud"` only after establishing the same local-unavailability and authorization conditions. Never select cloud merely to obtain a download URL.

For a Desktop handoff, use `details.recovery.desktopUrl` when returned; otherwise use Desktop's existing project library. `details.recovery.editorUrl` opens the browser project. Retain the same export scope. Hosted `submit_export(renderMode:"local")` renders in a browser; it does not become a Desktop tool. Open the source project in Desktop with an account that can access it and wait for the required media to be readable. An existing local project with the same ID may contain older or different edits: check the intended content and never overwrite that copy automatically.

If actual Desktop tools are available, use `target_project` for the preserved project, confirm its local content and timeline with `read_project`, and call Desktop `export` with that timeline and the preserved settings. Use Desktop `track_progress` with `target:"export"` and `exportTaskIds` set to the returned task ID. A queued `outputPath` is not a completed file. Wait for a successful terminal result and verify the file on that computer. Preserve partial ranges in the local timeline's frame-rate units rather than copying incompatible source frame numbers. If this host cannot call Desktop tools, provide the project-opening action and a concise export summary for the user to complete in Desktop's existing UI or Agent; do not promise remote control or file access on another device.

## Delivery

Deliver according to the completed result:

- `source:"browser"`: relay `statusMessage`, filename, and available metadata.
  The rendering tab downloads the file on its computer or writes to the chosen
  file. This result has no `downloadUrl` or verified filesystem path. A tab on
  Grok Bot's cloud computer downloads there, not to the user's laptop. Attach a
  file only after the host locates and reads it; otherwise link the editor and
  explain where to check its Export queue.
- A completed result with a `downloadUrl`: use the host's normal file/link
  delivery. Download it only through a permitted host route when a local artifact
  is needed. Do not invent a download URL for a browser export.

Queued or running exports are not delivered. Report any render warnings and
their effect on the output.

## Other Formats

For subtitle export, first use `manage_timelines` to confirm the agent's active
timeline. If it differs from the requested timeline, use its `action:"switch"`
with that target and read back the active state before submitting. The hosted
subtitle path tested on 2026-10-16 reads captions from the agent's active timeline
even when `submit_export.timelineId` names another timeline; switching only the
browser tab does not resolve this. This is a compatibility guard, not a backend
fix. Keep the explicit export timeline ID and check the actual subtitle file's
text and timing before delivery. If captions are readable but export still
reports none after alignment, report the failure instead of regenerating captions
or constructing a replacement SRT and calling it a successful tool export.

For NLE XML export, use the corresponding `submit_export` format and report
warnings about unsupported or dropped elements. `fcp_xml` is legacy `xmeml`, not
modern `.fcpxml`; do not promise a lossless project round trip or target-NLE
compatibility without testing it. For transparent Motion Graphic delivery, use
the dedicated MG export tool exposed by the current manifest and track the
returned render ids.

## Cloud Rendering

Cloud rendering remains a supported fallback with `renderMode:"cloud"` when the user chooses it or no usable local path exists and the original request permits it. Follow Local Export Recovery; do not describe cloud as retiring or add new payment, quota, or access rules.
If it is blocked by media that is not remotely readable, use `asset-import` when
the user permits upload or report the blocker. Do not switch to cloud rendering
or upload sources just to manufacture a shareable URL for a local export.

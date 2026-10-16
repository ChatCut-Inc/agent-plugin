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

A server-side active-timeline result does not prove that an already-open browser
tab switched timelines. Confirm the intended timeline in that tab, or ask the
user to select it, and pass its explicit ID when submitting the export.

Use `track_export` for browser and cloud export status; do not use
generation/transcription `track_progress`. Pass the returned `renderId`, or use
the latest-render option when available. A `wait` call is a single status read;
honor its check-back guidance. If submission timed out, inspect the latest export
before resubmitting to avoid duplicate jobs.

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

Cloud rendering is available when explicitly selected with `renderMode:"cloud"`.
If it is blocked by media that is not remotely readable, use `asset-import` when
the user permits upload or report the blocker. Do not switch to cloud rendering
or upload sources just to manufacture a shareable URL for a local export.

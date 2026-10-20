---
name: export
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks.
---

# Export

Export only when the user asks for a render, download, or final standalone deliverable. A review checkpoint normally stays as an editable ChatCut timeline. To check your own work, use `preview_timeline` for the picture and a `format:"audio"` export to hear sound; never make a full-resolution export for a self-check (see `verification`).

Use `submit_export` with the current tool schema. Confirm the target timeline, range, resolution, codec, and format from project state and user intent; do not guess a non-active timeline. Give each export a short, distinctive `name`. Record every returned `renderId` and `expectedFilename`.

Video and audio render locally by default: omit `renderMode`, and the connected ChatCut editor tab renders the timeline on the user's device. Open the project through the browser handoff in the plugin basics skill, activate the requested timeline, and keep that tab open until delivery finishes. If no capable editor is connected, resolve the reported browser or timeline issue and retry locally; there is no automatic cloud retry. Media the editor can already read needs no upload for a local export.

Use `track_export` for browser and cloud export status; do not use generation/transcription `track_progress`. Pass the returned `renderId`, or use the latest-render option for the latest project export. A `wait` call is a single status read; honor its check-back interval. If submission timed out or its acknowledgement is uncertain, check the latest export before resubmitting so the same export does not start twice.

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

If the user says they cannot complete the local step (opening the editor, or the download step above), or it still fails after they tried, explain the local blocker in one sentence and ask whether to export in the cloud; after they agree, export with `renderMode:"cloud"` and deliver its `downloadUrl`. Do not offer cloud before the user has had that chance. Only when cloud cannot do it either (for example 4K, media that exists only on the user's computer and cannot be uploaded, or a refused or failed cloud render), tell the user that ChatCut Desktop renders on their computer. Once open, Desktop connects itself to Codex, Claude Code, and WorkBuddy; in Codex, the ChatCut Desktop plugin's `connect-chatcut-desktop` skill covers installing it.

A completed result with a `downloadUrl` (cloud video/audio, subtitles, XML): use the host's normal file/link delivery. If the user asked for a specific local path, download it there yourself. In Claude Code, download it to that path or a collision-safe local path and provide the path and a local-file preview link.

Queued or running exports are not delivered. Report any warnings and their effect on the output.

## Other Formats

Subtitle and NLE XML exports use the corresponding `submit_export` format and can complete synchronously with a URL/path; report warnings about unsupported or dropped elements. An archive runs through the editor's bundle pipeline and may return no `renderId`; then check its progress in the editor rather than promising `track_export` support. For transparent Motion Graphic delivery, use the dedicated MG export tool exposed by the current manifest and track the returned render ids.

## Cloud Rendering

Use `renderMode:"cloud"` only when the user asks for it, or as the fallback above after the user agrees. If a cloud render is blocked by media that is not remotely readable, use `asset-import` when the user permits upload, or report the blocker; do not flatten or substitute the edit locally without user intent.

---
name: export
description: Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks.
---

# Export

Export only when the user asks for a render, download, or final standalone deliverable. A review checkpoint normally stays as an editable ChatCut timeline.

Use `submit_export` with the current tool schema. Confirm the target timeline, range, resolution, codec, and format from project state and user intent; do not guess a non-active timeline. Record every returned `renderId`.

Use `track_export` for status. It is the render-job tracker; do not use generation/transcription `track_progress` for exports. For the latest project export, use the tool's latest-render option when available rather than guessing an id.

When a render completes, return its `downloadUrl`. In Claude Code, download the completed file to a collision-safe local path and provide the path, local-file preview link, and concise render metadata. In Codex, surface the completed download URL through the host's normal file/link delivery. Do not claim delivery from a queued or running render.

For subtitle or NLE XML export, use the corresponding `submit_export` format and report warnings about unsupported or dropped elements. For transparent Motion Graphic delivery, use the dedicated MG export tool exposed by the current manifest and track the returned render ids.

If cloud rendering is blocked by media that is not remotely readable, use `asset-import` when the user permits upload. Otherwise report the blocker; do not flatten or substitute the edit locally without user intent.

---
name: "导出视频"
version: "2.0.4"
name_en: "export"
name_zh: "导出视频"
description: "按需导出成片、音频或字幕文件。"
description_en: "Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks."
description_zh: "按需导出成片、音频或字幕文件。"
user-invocable: "false"
displayName: "导出视频"
---

# Export

Export only when the user asks for a render, download, or final standalone deliverable. A review checkpoint normally stays as an editable ChatCut timeline.

Use `submit_export` with the current tool schema. Confirm the target timeline, range, resolution, codec, and format from project state and user intent; do not guess a non-active timeline. Record every returned `renderId`.

Use `track_export` for status. It is the render-job tracker; do not use generation/transcription `track_progress` for exports. For the latest project export, use the tool's latest-render option when available rather than guessing an id.

When a render completes, return its `downloadUrl` through 千问办公的文件或链接交付方式。仅在用户要求保存本地文件时下载到不覆盖现有文件的位置；不要把排队或运行中状态说成已经交付。

For subtitle or NLE XML export, use the corresponding `submit_export` format and report warnings about unsupported or dropped elements. For transparent Motion Graphic delivery, use the dedicated MG export tool exposed by the current manifest and track the returned render ids.

If cloud rendering is blocked by media that is not remotely readable, use `asset-import` when the user permits upload. Otherwise report the blocker; do not flatten or substitute the edit locally without user intent.

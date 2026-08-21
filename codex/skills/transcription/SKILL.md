---
name: transcription
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Use for ChatCut transcription, transcript readiness, captions, subtitles, transcript repair, filler removal, and speech-led editing setup.
---

# Transcription

1. Use `browse_assets` to identify the video/audio asset and its transcription state.
2. For newly imported local media, complete the `asset-import` workflow first.
3. Check `track_progress` with target `transcription`. It returns current status; follow the returned check-back guidance and do not busy-loop.
4. Use `find_transcript` for timestamped text lookup.
5. Use the current caption tools to enable, inspect, translate, or style captions only after transcription is ready.

Do not call a transcription stuck from one pending status. Treat an explicit failed terminal state immediately; otherwise allow at least `max(5 minutes, min(60 minutes, 2 x asset duration))`, or at least 10 minutes across multiple checks when duration is unknown.

`no_audio` / no-speech is a successful terminal analysis result: the media is usable, but there is no transcript to read or caption. Do not report it as a transcription failure or retry it unless the user says the media contains speech that should have been detected.

When a run is genuinely failed or stuck, call `manage_transcript` with `action:"retry_transcription"` and the asset id, then check transcription progress again. Repair source words with the transcript-fix action instead of rewriting visible captions when the source transcript itself is wrong.

For semantic speech edits, load `talking-head-guide` and use the Script workflow. Use mechanical cleanup only for fixed fillers and pauses; do not replace transcript-aware editing with destructive physical timeline cuts.

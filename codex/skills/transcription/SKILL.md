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

Use `trigger_transcript` when the user explicitly wants transcription started or restarted. It is idempotent: only `idle` and `error` start work; ready, no-audio, and in-progress assets are left unchanged. If prepared transcription audio exists it is reused; otherwise the open Web/Desktop editor is asked to prepare and upload audio through its native pipeline. Then inspect readiness with `track_progress`.

For an `idle` or explicitly failed (`error`) run, call `trigger_transcript` with the asset id, then check transcription progress again. If an in-progress run has genuinely exceeded the stuck threshold, use `manage_transcript` action `retry_transcription` because `trigger_transcript` intentionally leaves in-progress work unchanged. The manage tool also remains available for low-level recovery where an external MCP host must supply prepared `audioBase64`. Repair source words with the transcript-fix action instead of rewriting visible captions when the source transcript itself is wrong.

For semantic speech edits, load `talking-head-guide` and use the Script workflow. Use mechanical cleanup only for fixed fillers and pauses; do not replace transcript-aware editing with destructive physical timeline cuts.

## Caption style choices

Apply Plain directly for a simple "add captions" request, and apply concrete
requested edits directly. When the user asks to see, compare, or choose caption
styles, load `widget-forms` before changing the project. Its caption-preview
reference covers ordinary presets, custom candidates and published Web MG
templates, with exact catalog revisions and language codes: `en`, `zh-Hans`,
`es`, `ja`, `zh-Hant`. Keep one Other entry for new style requirements; do not
add More or browse-catalog choices.

A sample style preview does not require transcription or generating content.
Codex uses `ask_followup_questions` caption cards; Claude keeps its
`show_widget` flow and states its inline-animation limitation. Preserve sample
versus project labels and wait for selection before applying. Re-read the
caption target and published revision before mutation; selection alone is not
application, and changed revisions require a fresh preview.

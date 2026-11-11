---
name: export
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Export or deliver a ChatCut project through the hosted connector, including video, audio, subtitles, XML, and render-status checks.
---

# Export

Export only when the user asks for a render, download, or final standalone
deliverable. A review checkpoint normally stays as an editable ChatCut timeline.

The ChatCut server owns the export flow. Follow the `submit_export` description
and the connector's MEDIA EXPORT instructions for the default render path, cloud
quotes, status checks and delivery, and follow the guidance and
`details.recovery` that each result returns. Call `submit_export` without
`renderMode` to take the server's default; pass it only when the user explicitly
chooses local or cloud. Name `projectId` and `timelineId` explicitly and do not
guess a non-active timeline.

Deliver only a completed export, as the actual file in this conversation, and
never invent a download URL. A browser download without host delivery lands on
Grok Bot's cloud computer, not on the user's device.

## Subtitles

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

## NLE XML and Motion Graphics

For NLE XML, report warnings about unsupported or dropped elements. `fcp_xml` is
legacy `xmeml`, not modern `.fcpxml`; do not promise a lossless project round
trip or target-NLE compatibility without testing it. For transparent Motion
Graphic delivery, use the dedicated MG export tool exposed by the current
manifest and track the returned render ids.

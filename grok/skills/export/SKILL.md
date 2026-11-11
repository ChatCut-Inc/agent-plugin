---
name: export
description: Use when a Grok Bot user wants a finished file from a ChatCut project, such as exporting or rendering a video or audio, downloading or sending the result in chat, exporting subtitles (SRT) or NLE XML, or checking an export's progress. Covers cloud and browser-local export and how to deliver the file back into the chat. Hosted ChatCut plugin (`chatcut` MCP server) only; when the conversation drives ChatCut Desktop (`chatcut_desktop*`), follow Desktop's own instructions instead.
---

# Export

Export only when the user asks for a finished file. A review checkpoint stays as an editable ChatCut timeline; check your work with `preview_timeline` instead of exporting.

Video and audio can render in the cloud or locally in a ChatCut browser. The `submit_export` description says which one is used when `renderMode` is omitted: omit it unless the user picks one, and pass `renderMode:"local"` for 4K. Name `projectId` and `timelineId` explicitly and do not guess a non-active timeline. Check every returned `renderId` with `track_export`, one status read per call, waiting `checkBackAfterSeconds` between reads.

## Cloud export

ChatCut renders on its servers (up to 1080p), so no browser has to stay open. The project's media must already be in ChatCut: files sent through the ChatCut upload page are; for files you imported with the upload helper, wait until `track_progress` with `target:"upload"` reports them uploaded.

1. The first call returns `CLOUD_EXPORT_QUOTE_REQUIRED` with `details.quote` and starts nothing. Tell the user its duration, free allowance and credits.
2. A free quote (`requiresConfirmation:false`) can be retried right away with `cloudQuoteId` set to the quote's `id`. A credit charge needs the user to confirm that exact amount first; then retry with `cloudQuoteId` and `confirmCloudCharge:true`. If the account cannot cover it, follow the billing recovery the error returns. Keep the same project, timeline, range and settings; an expired quote needs a fresh one, and a larger charge needs new consent.
3. When `track_export` reports it complete, fetch `downloadUrl` into your workspace with `curl -fL -o "<file name>" "<downloadUrl>"`, check the file is `outputSizeBytes` bytes, and send the file in this chat. If the download fails, call `track_export` once more and retry with its link; if you cannot attach the file, give the user `downloadUrl`.

## Local export

The timeline renders in a ChatCut editor tab in your browser on Grok Bot's cloud computer. That browser must be signed in to the user's ChatCut account and connected as the renderer.

1. Before exporting, open the project's `browserHandoff.url` once in your browser. It signs that browser in and makes it the connected ChatCut renderer. Never show that URL to the user. If it has expired, call `get_editor_url` for a fresh one. If there is no handoff URL and no browser is connected, ask the user to open the editor link and sign in.
2. Confirm the requested timeline in that tab; a server-side switch does not prove the open tab switched. Keep the tab open until the export completes.
3. With `delivery:"host"`, the browser uploads the finished file instead of downloading it. When `track_export` shows `delivery.status:"ready"`, fetch `delivery.downloadUrl` the same way, check the file is `delivery.sizeBytes` bytes, and send the file in this chat; `uploading` or `queued` is still in progress. If you cannot attach the file, give the user `delivery.downloadUrl` and say it works until `delivery.retainedUntil`.
4. Without host delivery, the browser downloads the file onto Grok Bot's cloud computer, not the user's device, and there is no link to send. If the user needs the file in this chat, offer a cloud export with its quote.

## If a call fails

Follow the error's `details.exportRequest` and `details.recovery`. Busy capacity waits for existing jobs; an uncertain acknowledgement needs the original export checked with `track_export` before any retry; missing media needs its source uploaded or restored. Never duplicate a job. If the browser cannot render locally, explain the blocker and offer cloud with its quote rather than switching on your own.

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

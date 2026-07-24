---
name: export
description: Use when a ChatCut video editing or creation workflow needs export, render, download, share, final delivery, subtitle-file export, or export fallback explanation from the plugin host agent.
---

# Export

Use ChatCut's durable export jobs for Codex-visible delivery. A ChatCut export request from Codex should call `submit_export`, then use `track_export` for status and final delivery when the result is not returned immediately. Do not use share-link tools for connector exports.

Default policy:

- Prefer `submit_export` when the user asks to export/share/finalize the ChatCut timeline.
- Do not wrap Codex-native `ffmpeg` work as a ChatCut tool. Use local `ffmpeg` for full video processing only when the user explicitly asks for a standalone local-file operation outside a ChatCut editing workflow. For ChatCut editing tasks, do not produce a pre-edited or flattened local render as the primary review/final deliverable; use ChatCut export.

## Claude Code delivery: local file + text handoff (verified 2026-07-15)

In Claude Code, the shared delivery lines below (inline video display and
waiting for browser download artifacts) do **not** apply. Follow this section
instead.

After `track_export` returns the finished render:

1. Download it with `curl -L` to the user's Downloads folder. Use the shared
   collision-safe naming rules: never overwrite an existing file, and add a
   numbered suffix such as `name (1).mp4` when needed. This `curl` is the only
   download path for a connector export, so do not look for or wait on
   `.crdownload` files.
2. Deliver it as concise text only. Start with `✅`, report the complete absolute
   local path, file size, resolution, and duration. Also present a named Markdown
   link such as `[Open local preview](<file-url>)`, using an absolute `file://`
   URL for the downloaded file. Generate the correctly escaped URL with Node's
   `pathToFileURL(absolutePath).href`; do not hand-build it from a path that may
   contain spaces or non-ASCII characters. This local-file link is a convenience
   because host policy may decline to activate it; always keep the complete
   absolute path visible as the fallback. Do not call `show_widget`, search for
   `visualize`, extract a poster frame, run `ffmpeg`, generate base64/data URIs,
   or add widget/action buttons.
3. Give the user two additional preview choices: use **查看 / View** in the
   editor's export queue at the top right, or say they can ask you to open the
   downloaded file in their local player if the local-file link is blocked.
   Only after explicit consent, run `open <absolute-path>` on macOS or
   `start "" <absolute-path>` on Windows; never open it proactively.
4. Browser-pane playback is a fallback only when the user explicitly asks for
   it. Before navigating to the render URL, warn that the render bucket is a
   new origin and the pane will show a one-click origin approval card; after
   approval, retry the same navigation once.

## Durable Export

Use `submit_export` for the execution path:

```json
{
  "format": "video",
  "codec": "h264",
  "resolution": "1080p",
  "fps": 30,
  "name": "final-cut"
}
```

Video codec options are `h264` (MP4, default) and `vp8` (WebM). Video frame-rate options match the editor UI: `24`, `25`, `30`, `50`, or `60`; omit `fps` to match the timeline. Audio export is MP3: pass `"format":"audio"` and omit `codec` / `fps` unless you explicitly pass `"codec":"mp3"`.

`submit_export` returns a durable `renderId`. Some export types, such as subtitle files, may complete immediately and return `downloadUrl`; video/audio usually require `track_export` to wait for completion.

After getting each `downloadUrl`:

- Resolve the user's Downloads folder: `~/Downloads` on macOS/Linux, or `%USERPROFILE%\Downloads` on Windows.
- Before triggering any agent/browser download, check the Downloads folder for fresh Chrome download artifacts from the last few minutes that match the expected export name, extension, or render/download URL basename. Include both completed files and in-progress `.crdownload` files.
- If a matching fresh `.crdownload` exists, do not trigger another download. Wait until Chrome removes the `.crdownload` suffix and the final file size stops changing, then use that completed file.
- If a matching fresh completed file already exists, use it directly instead of downloading again.
- If only older files exist, treat them as collisions, not as the current export.
- Do not overwrite an existing file; choose a safe numbered filename such as `name (1).mp4` when needed.
- Always download the finished export file into the Downloads folder, not a temp/workspace directory.
- Always show the downloaded video inline in chat. If there are multiple exported videos, download all of them and show every preview, not just the first.

If the project contains assets without cloud-readable bytes, upload/register cloud-readable replacements before rendering. If the user does not permit upload, explain that connector cloud export cannot proceed with those assets.

Report the returned `renderId` when present and tell the user the job is visible in the editor render-jobs panel.

Use `track_export` when the user asks about export/render status, or when the current turn genuinely needs to wait for a submitted video/audio render. Completed connector exports return `downloadUrl`; for every completed entry, download the file to Downloads using the collision-safe rules above and show it inline in chat:

```json
{
  "action": "status",
  "renderIds": "abc123"
}
```

For the latest project export, omit `renderIds` and pass `"latest": true`. `track_progress` is for generation/transcription/upload jobs, not render jobs.

For NLE XML, use `submit_export` with `format:"xml"`:

```json
{
  "format": "xml",
  "nleFormat": "fcp_xml_resolve",
  "timelineId": "abc123"
}
```

`nleFormat` values are `fcp_xml` for Premiere XML (default) and `fcp_xml_resolve` for DaVinci Resolve XML. Omit `timelineId` for the active timeline, or pass a timeline id/prefix for a non-active timeline. Read and report warnings: captions, solids, SVG, unsupported clip attributes, and unrendered motion graphics may be dropped by the XML format. Motion graphics are only represented in XML when a transparent-ProRes MG export flow supplies `motionGraphicRenderKeys`; otherwise the exporter reports them as dropped.

For media-pool source download, use `request_asset_download` on a file-backed source asset. It returns a guarded backend download URL/path for the original source media. Do not use `pull_asset` for user downloads; `pull_asset` is sandbox-only.

For subtitle files, use `submit_export` with `format:"subtitles"`:

```json
{
  "format": "subtitles",
  "subtitleFormat": "srt"
}
```

Formats are `srt` and `txt`. The export uses the captions item's actual timeline word timing, source scope, translation variants, display-text overrides, and pacing fields such as `wordsPerPage` / `maxCharactersPerLine`, and creates a durable downloadable export job. It is appropriate for downloadable subtitle files. It does not yet reuse the browser Remotion caption page planner, so visual line wrapping/page breaks are timing-correct but approximate rather than byte-identical to burned-in caption pagination. For non-active timelines, pass `timelineId` from `manage_timelines` or `read_project`.

For one motion graphic as transparent ProRes 4444, use `export_motion_graphic_prores`:

```json
{
  "itemId": "abc123",
  "filenameMode": "asset"
}
```

Prefer `itemId` when exporting a specific timeline instance, because the item carries live `propertyOverrides` such as edited text. Use `assetId` for a media-pool motion graphic; the backend will use the first timeline instance for that asset when present, matching the editor's media-pool export behavior. For several motion graphics, pass `itemIds` or `assetIds` in one call. Each motion graphic still becomes a separate durable render; use `track_export` with the returned `renderIds` to wait, then download through each returned render download path.

When preparing XML that should reference rendered motion graphics, pass `"filenameMode":"xml"` and the same `timelineId` to `export_motion_graphic_prores`, then keep the returned `motionGraphicRenderKey` / `motionGraphicRenderKeys`; after the render completes, pass those keys and the same `timelineId` in `submit_export.motionGraphicRenderKeys` with `format:"xml"`.

## Fallbacks

The editor-action local bridge export path has been removed; use cloud render for connector exports.

If cloud render is blocked by local-only assets:

1. If the user's intent allows upload, use `import_media` to upload/register cloud-readable replacements.
2. If upload is not allowed, report that connector cloud export cannot proceed until the originals are uploaded. Do not suggest an unavailable local-only CLI fallback.

Do not tell the user they need to understand HTML-in-Canvas, Remotion Lambda, or S3 unless debugging. Explain at product level:

- "云端兼容导出"
- "需要先上传本地素材"

## Result Trace

For `submit_export`, record:

- `renderId`
- timeline/range/resolution/codec/fps
- that the user can download from the editor render-jobs panel

Record uploaded asset IDs and any fallback tried when cloud export was blocked by local-only assets.

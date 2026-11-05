---
name: export
description: Export, render, download, or deliver a ChatCut timeline from WorkBuddy as video, audio, subtitles, Premiere Pro or DaVinci Resolve-compatible project files, or a motion-graphic render.
---

# Export from WorkBuddy

Export only when the user explicitly asks to export, render, download, share, or finalize. A normal edit ends with the editable timeline ready for review.

## Durable export

Use `submit_export`. Common video defaults are H.264 MP4 at 1080p, with fps omitted to match the timeline unless the user specifies otherwise:

```json
{
  "format": "video",
  "codec": "h264",
  "resolution": "1080p",
  "name": "final-cut"
}
```

Video codecs are `h264` and `vp8`; supported fps values are `24`, `25`, `30`, `50`, and `60`. Audio export uses `format:"audio"`. Subtitle files use `format:"subtitles"` with `subtitleFormat:"srt"` or `"txt"`. Professional editing project interchange uses `format:"xml"`: `nleFormat:"fcp_xml"` for Premiere Pro-compatible XML, or `nleFormat:"fcp_xml_resolve"` for DaVinci Resolve-compatible XML.

`submit_export` returns a durable render ID or an immediate download URL. For asynchronous work, call `track_export` until the requested render completes. Then provide the returned download URL and concise render metadata. Do not report completion while the render is pending or failed.

## WorkBuddy local preview delivery

For a completed video or audio export, turn the cloud render into a directly playable WorkBuddy deliverable:

1. Use only the final download URL returned by `submit_export` or `track_export`. Treat signed URLs as sensitive and do not repeat them in user-facing prose or logs unnecessarily.
2. Choose a descriptive filename with the correct extension and download it into the current WorkBuddy task/workspace directory. Do not overwrite an unrelated existing file. Use `curl` with redirect following and failure handling, for example:

   ```bash
   curl --fail --location --silent --show-error --output "/absolute/workbuddy/task/final-video.mp4" "<downloadUrl>"
   ```

3. Verify that the command succeeded and the local file exists with a non-zero size before presenting it. A render is not locally delivered merely because `curl` was started.
4. Convert the absolute local path to a correctly escaped `file://` URI. Prefer Node's `pathToFileURL(absolutePath).href` semantics so spaces, Chinese characters, `#`, and other reserved characters are encoded correctly; do not concatenate an unescaped path blindly.
5. As the final tool call of the delivery turn, call WorkBuddy's `present_files` (the “发送文件” tool) with the local `file://` URI first, the task directory as `cwd`, and a short explanation. This lets WorkBuddy open the exported media in the system/default player.
6. In the final assistant message, keep the delivery summary concise and always include the complete absolute local file path so the user can locate it in Finder, Terminal, or a player. Also state the format, resolution, duration, and file size when known. Do not expose the `file://` URI in user-facing prose: it is an internal WorkBuddy preview argument used only for the `present_files` call. Do not shorten the path to only a filename or hide it behind vague text such as “saved locally.”

If the local download, URI presentation, or `present_files` call fails, preserve access by returning the original cloud download URL and explain the failed local step. Do not claim that the default player opened unless `present_files` succeeded. Do not navigate the in-app browser to the S3 URL or generate a poster frame merely to preview a completed media export.

For subtitles, XML, or another non-playable export, download when useful and pass the absolute local file path to `present_files`; the `file://` player path is specifically for playable video/audio media.

If cloud export is blocked by local-only/unavailable media, import cloud-readable originals when the user's intent allows upload. Otherwise explain the blocker; do not silently create a flattened local substitute.

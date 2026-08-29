---
name: asset-import
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Import local, attached, or downloaded media into a ChatCut project through the hosted external connector from Grok Build.
---

# Asset Import (Grok Build)

Grok Build has no in-app Browser pane. Do not use Claude Code's loopback + synthetic-drop import. Do not follow a Desktop `push_asset` workflow on the hosted `chatcut` server.

1. Check `browse_assets` first when the media may already be in the project; do not create duplicates.
2. Download a public URL to a local file when needed.
3. Call `import_media` with `{"action":"create_session"}`.
4. Run this skill's `scripts/upload-media.mjs` once with the returned token and endpoint and at most four local files. Split larger sets into batches of four and create one session per batch.

```bash
node <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /path/to/source-1.mp4 /path/to/source-2.wav
```

Resolve the helper relative to this skill; do not search the workspace. Use Node 18 or newer from `PATH`. Run the helper in the foreground and read its final JSON from stdout. Do not detach it.

The helper is mandatory for media preparation and upload. Do not replace it with handwritten `ffprobe`, `ffmpeg`, `curl`, metadata, transcode, or presigned-upload commands. Media bytes upload directly to storage and must not pass through the ChatCut backend.

This plugin does not vendor ffmpeg binaries. The helper uses `--ffmpeg`/`--ffprobe` if you pass them, then `FFMPEG_PATH` / `FFPROBE_PATH`, then `ffmpeg` / `ffprobe` on PATH. If the helper reports a missing binary, install ffmpeg (`brew install ffmpeg` on macOS) after asking, or tell the user to upload in the ChatCut editor.

Use each returned `imports[].result.assetId` for timeline work. Wait for `track_progress` target `transcription` before transcript or caption work. Wait for target `upload` only before byte-dependent work such as cloud export, `pull_asset`, or remote frame inspection.

If the helper returns an error with `retry`, create a fresh import session when requested and rerun exactly the returned arguments. If host policy denies transfer of the user's file, stop; tell the user the upload was denied and ask them to use the ChatCut editor upload UI or grant the required permission.

For multi-source edits, build reviewable work from original source assets in the ChatCut timeline. Do not locally concatenate or flatten a review MP4.

MCP OAuth stays inside the MCP client. The helper uses only the short import token from `import_media`; never pass OAuth tokens to shell.

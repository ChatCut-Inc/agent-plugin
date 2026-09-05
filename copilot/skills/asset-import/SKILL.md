---
name: asset-import
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Import local, attached, or downloaded media into a ChatCut project through the hosted external connector.
---

# Asset Import

Use this host adapter for files GitHub Copilot CLI can read locally. The hosted external MCP does not expose the backend agent's `push_asset` tool, so do not follow a shared `push_asset` workflow in this plugin.

1. Check `browse_assets` first when the media may already be in the project; do not create duplicates.
2. Download a public URL to a local file when needed.
3. Call `import_media` with `{"action":"create_session"}`.
4. Run this skill's `scripts/upload-media.mjs` once with the returned token and endpoint and at most four local files. Split larger sets into batches of four and create one session per batch.

```bash
"<bundled-or-global-node>" <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /path/to/source-1.mp4 /path/to/source-2.wav
```

Resolve the helper relative to this skill; do not search the workspace. Use an
existing Node.js 18 or newer runtime from `PATH`; do not install Node.js solely
for this workflow. Run the helper in the foreground through Copilot's shell
tool and read its final JSON from stdout. Do not detach it or invent status
files.

The package bundles FFmpeg for Apple Silicon macOS and x64 Windows. Other
platforms require `ffmpeg` and `ffprobe` on `PATH`. If Node.js or the required
media binaries are unavailable, stop the helper path and ask the user to upload
the media through the ChatCut editor instead of claiming the import succeeded.

The helper is mandatory for media preparation and upload. Do not replace it with handwritten `ffprobe`, `ffmpeg`, `curl`, metadata, transcode, or presigned-upload commands. Media bytes upload directly to storage and must not pass through the ChatCut backend.

Use each returned `imports[].result.assetId` for timeline work. Wait for
`track_progress` target `transcription` before transcript or caption work. Wait
for target `upload` only before byte-dependent work such as cloud export,
`request_asset_download`, or remote frame inspection.

If the helper returns an error with `retry`, create a fresh import session when requested and rerun exactly the returned arguments. If host policy denies transfer of the user's file, stop instead of trying a local-editing or alternate-upload workaround; tell the user the upload was denied and ask them to use the ChatCut editor upload UI or grant the required permission.

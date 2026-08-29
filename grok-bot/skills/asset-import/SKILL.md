---
name: asset-import
description: Import media into a ChatCut project from Grok Bot. Sources are /workspace files, chat attachments, or media the user already uploaded in the ChatCut editor. Never read the user's laptop disk.
---

# Asset Import (Grok Bot)

Grok Bot cannot see the user's laptop. Do not call Desktop `push_asset`. Do not guess home-directory paths.

1. Check `browse_assets` first; do not create duplicates.
2. If the user already uploaded in the ChatCut editor, use that asset.
3. If the file is in `/workspace` or attached in chat, call `import_media` with `{"action":"create_session"}`, then run:

```bash
node <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /workspace/path/to/source.mp4
```

4. If no file is available, tell the user to upload in the ChatCut editor on the Agent Computer, then `browse_assets` again.

Use Node from PATH. The helper must run in the foreground. This plugin does not vendor ffmpeg; use PATH ffmpeg if the helper needs it.

Wait for `track_progress` target `transcription` before caption work. Wait for target `upload` only before export, `pull_asset`, or remote frame inspection.

If host policy denies the upload, stop and ask the user to upload in the ChatCut editor.

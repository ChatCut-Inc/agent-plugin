---
name: asset-import
description: Import local or downloaded media, or relink missing media to an existing ChatCut asset, through the hosted Claude plugin. Use the editor loopback bridge when the editor and files are on the same machine; use the upload helper for imports otherwise. Desktop MCP sessions use their own built-in import tools.
---

# Asset Import

Check `browse_assets` first when a file may already be imported.

## Same-machine editor import (preferred)

1. Open the target project using `browserHandoff.url` or `editorUrl`. Keep exactly one editor tab for this project open, on the same machine/network namespace as your shell. A remote sandbox's localhost is not the user's localhost.
2. Start the bundled server with Node from PATH, using the origin of the actual editor URL:

```bash
node <this-skill-dir>/scripts/serve-local-media.mjs --origin <editor-origin> /path/to/source.mp4
```

Keep this process alive using the host's background-process support while calling MCP. It prints one JSON line and automatically exits after 900 seconds. It serves only the listed files over tokenized loopback URLs.

3. Import multiple files in **one** `import_media` call: `{"action":"from_editor","files":[...]}`. Copy each file's `assetId`, `url`, `filename`, and `sizeBytes` from the printed `imports` array into `files`, omitting its per-file `action`. Each URL may come from a different running helper. Send 1–16 files per call; for larger sets, submit successive batches of 16. Up to eight files are processed concurrently; the editor streams each one straight into its local store, so a card with transfer progress appears as soon as the download starts. There is no loopback-specific file-size cap. The original top-level single-file arguments still work.
4. Inspect every entry in `results`: successful entries have `ok:true` and `status:"locally_imported"`; failed entries have an `error`. Results preserve input order and include `assetId` and `filename`, with top-level `succeeded`/`failed` counts. Retry only failed files with the same asset IDs. Success means the editor has persisted local bytes and registered the asset locally. Stop the helpers only after all files succeed. Keep the editor open for server sync, background upload and transcription.
5. Use the returned asset IDs for timeline work. Wait on `track_progress target:"transcription"` before transcript/caption work. Browser-renderable timelines defer original-file uploads; cloud-only or unsupported timelines upload automatically. Check `browse_assets` before waiting on `target:"upload"`; a deferred upload is not in progress. Use the editor's Upload action when cloud bytes are needed, preserving the same asset ID. If server sync is still catching up, retry the asset lookup.

On timeout, check `browse_assets` and retry with the **same assetId**; the import may still be running, and a retry resumes an interrupted download from where it stopped rather than starting over. Keep the same ID even if restarting the helper changes its URL. Do not blindly start a second import. Allow the editor's browser local-network permission if prompted. If the editor cannot reach the helper or the bridge is unavailable, use the fallback. A host-policy denial is not permission to try another transfer route.

For visual analysis, inspect readable original files locally rather than waiting for cloud upload. Import original source assets; do not flatten an edit into a local pre-render.

## Relink an existing asset

For missing local media, preserve the existing asset and its timeline references:

1. Get the existing `assetId` from `browse_assets` and locate its corresponding original source file.
2. Serve that file with the same loopback helper above.
3. Call `import_media` with the helper's `url`, `filename`, and `sizeBytes`, but set `action: "relink_from_editor"` and replace the generated `assetId` with the **existing assetId**.
   For multiple files, use the same `files` array form, with an existing asset ID in every entry.
4. Wait for `status: "locally_relinked"` before stopping the helper. Upload/transcription may still be pending; keep the editor open.

Relink always reads the supplied file, even if the editor has cached bytes. The media type must match. Use the corresponding original, not a different replacement clip: relink preserves existing edits and transcripts. If the target is missing from the editor, let project sync finish and retry. A failed relink must not fall back to creating a new asset.

## Upload-helper fallback

For a remote sandbox, unavailable editor, or blocked browser connection:

1. Call `import_media` with `{"action":"create_session"}`.
2. Run the bundled helper in the foreground, using the returned token and endpoint and at most four paths:

```bash
node <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /path/to/source.mp4
```

Resolve scripts relative to this skill. Do not install Node or replace the helper with handwritten upload/transcode commands. MCP OAuth stays inside the MCP client; only the short-lived import token goes to the helper. Larger batches need a fresh session per four files.

The helper registers placeholders early but prints its final JSON after uploads complete. Read `imports[].result.assetId`. On an error with `retry`, obtain a fresh session and rerun the returned arguments to resume the same asset.

If host policy denies transfer, stop and ask the user to upload through the editor or grant permission. Do not work around the denial. Public URLs can be downloaded locally and then imported through the appropriate route above.

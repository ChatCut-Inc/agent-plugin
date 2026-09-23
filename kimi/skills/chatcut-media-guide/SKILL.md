---
name: chatcut-media-guide
description: Use when the user needs to import local or downloaded media, or relink missing media to an existing ChatCut asset. Prefer the editor loopback bridge when the editor and files are on the same machine.
---

# ChatCut Media Guide

Check `browse_assets` first when a file may already be imported.

## Same-machine editor import

1. Confirm the user selected the file for import. Open the target project using `browserHandoff.url` or `editorUrl`, and keep exactly one editor tab for it open on the same machine/network namespace as the local shell. A remote sandbox's localhost is not the user's localhost.
2. Start the bundled loopback server with Node 18+ and the origin of the actual editor URL:

```bash
node <this-skill-dir>/scripts/serve-local-media.mjs --origin <editor-origin> /path/to/source.mp4
```

Keep it alive using the host's background-process support while calling MCP. It serves only the listed files over tokenized `127.0.0.1` URLs and exits after 900 seconds.

3. Import multiple files in **one** `import_media` call: `{"action":"from_editor","files":[...]}`. Copy each file's `assetId`, `url`, `filename`, and `sizeBytes` from the printed `imports` array into `files`, omitting its per-file `action`. URLs may come from different running helpers. Send 1–16 files per call; for larger sets, submit successive batches of 16. Up to eight files are processed concurrently; the editor streams each one straight into its local store, so a card with transfer progress appears as soon as the download starts. The original top-level single-file arguments still work.
4. Inspect every entry in `results`: successful entries have `ok:true` and `status:"locally_imported"`; failed entries have an `error`. Results preserve input order and include `assetId` and `filename`, with top-level `succeeded`/`failed` counts. Retry only failed files with the same asset IDs. Keep the helpers alive until all files succeed, and keep the editor open for server sync, background upload, and transcription.
5. Verify the asset with `browse_assets` before placing it on the timeline. Wait on `track_progress target:"transcription"` before transcript or caption work. Do not wait for upload unless the next operation explicitly requires cloud bytes.

On timeout, check `browse_assets` and retry with the same `assetId`. Keep that ID even if restarting the helper changes its URL. If the editor cannot reach the helper, browser local-network access is unavailable, or host policy denies the transfer, stop and ask the user to upload through the visible editor instead of trying another transfer route.

## Relink an existing asset

For missing local media, preserve the existing asset and all timeline references:

1. Get the existing `assetId` from `browse_assets` and locate the corresponding original source file.
2. Serve that file with `scripts/serve-local-media.mjs` as above.
3. Call `import_media` with the helper's `url`, `filename`, and `sizeBytes`, set `action: "relink_from_editor"`, and replace the generated ID with the **existing assetId**.
   For multiple files, use the same `files` array form, with an existing asset ID in every entry.
4. Wait for `status: "locally_relinked"` before stopping the helper. Keep the editor open while upload or transcription finishes.

Relink always reads the supplied file. The media type must match, and the file must be the corresponding original rather than a replacement edit. If project sync has not exposed the target to the editor, wait and retry. A failed relink must not fall back to creating a new asset.

## Fallback

If the host cannot run the helper or the editor cannot access its loopback URL, ask the user to upload the file in the visible target-project editor. Do not invent asset IDs or URLs, and do not upload files the user did not identify or approve. Public URLs must be downloaded to a readable local file before using the same-machine route.

---
name: asset-import
description: Import local or attached media files, readable user-provided paths, existing ChatCut assets, and public media URLs into a ChatCut project from WorkBuddy.
---

# Asset Import for WorkBuddy

## Choose the source path

1. First inspect the targeted project's asset library with `read_project` `view:"assets"`; reuse a matching existing asset when possible.
2. For a public media URL, use the current ChatCut download/import tool and verify the returned asset.
3. For a local attachment or path readable by WorkBuddy, use the package command `chatcut-upload-media` with an `import_media` session.
4. If WorkBuddy cannot read the file or run the local upload dependencies, fall back to manual upload in the already-open ChatCut editor, then re-read the project assets.

## Attachments in the initial prompt

When the user includes source media in the first prompt, treat that attachment as the intended source and retain its readable local path for the automated upload attempt.

If no project is targeted yet, create or target the intended project according to the expert's project-selection rules. Before checking local upload dependencies, ask WorkBuddy to surface the project using the exact returned `browserHandoff.url` when present, otherwise the returned `editorUrl`, preserving every query parameter. A `present_files.previewed` entry only confirms that WorkBuddy accepted the request, not that its browser UI appeared. In the next user-visible message, always include the clean returned `editorUrl` as a clickable “Open ChatCut editor” fallback and say to use it if the editor did not open automatically. Never expose the handoff URL or its launch/authentication parameters to the user.

Read `view:"assets"` before import and retain the existing asset ids. This baseline lets you identify files added manually without asking the user for an asset id.

Do not bulk-import a large folder without editorial need. When selection matters, inspect a bounded sample and choose the originals needed for the requested edit. Do not locally concatenate, pre-trim, burn captions, or flatten source files before importing them.

`chatcut-upload-media` is the only supported local upload command in this WorkBuddy expert. WorkBuddy adds the package `bin/` directory to `PATH`, so invoke the command by name from any working directory. Do not search the filesystem for `upload-media.mjs`, do not guess the plugin installation directory, and never use `direct-uploader`, `curl`, or a hand-written presigned-upload flow.

## Local file flow

`chatcut-upload-media` requires the package command itself, `node`, `ffmpeg`, and `ffprobe` on `PATH`. Check that all four commands are executable before creating a short-lived import session. For example, use `command -v` on macOS/Linux or `Get-Command` in PowerShell.

If the source path is unreadable or any of these commands is unavailable, do not install dependencies, ask the user to install FFmpeg, search for hidden package files, or improvise another upload protocol. Use the manual editor upload fallback below. The local command is a convenience path; missing host dependencies must not block the editing workflow.

1. Call `import_media` with `{"action":"create_session"}`.
2. Use the returned short-lived import `token` and `endpoint`. The token is only for this helper; never print it to the user or save it in the package.
3. Run the package command directly. On Windows PowerShell:

```powershell
chatcut-upload-media --token "<token>" --endpoint "<endpoint>" "C:\absolute\path\source-1.mp4" "C:\absolute\path\source-2.wav" --json-out "$env:TEMP\chatcut-imports.json"
```

On macOS or Linux:

```bash
chatcut-upload-media --token "<token>" --endpoint "<endpoint>" "/absolute/path/source-1.mp4" "/absolute/path/source-2.wav" --json-out "${TMPDIR:-/tmp}/chatcut-imports.json"
```

4. Read the JSON output and use each returned `assetId`. A registered placeholder may be available before all bytes finish uploading.
5. Use `track_progress` with `target:"transcription"` before transcript/caption work, and `target:"upload"` before byte-dependent frame decode or cloud export.
6. Verify with `read_project` `view:"assets"`.

The command invokes this package's official `skills/asset-import/scripts/upload-media.mjs` helper. If `chatcut-upload-media` is not found, do not search for the helper, ask the user to reinstall the package, or improvise a second upload protocol. Use the manual editor upload fallback.

If the user says the source must not be uploaded, stop before this flow and explain that the hosted WorkBuddy connector cannot perform a cloud-ready ChatCut edit with those bytes.

## Manual editor upload fallback

Use this fallback when WorkBuddy has the attachment or local path but cannot complete the automated local upload.

1. Ensure a concrete project is created or targeted and record the current asset ids with `read_project` `view:"assets"`.
2. Hand the editor to the user. Use the exact returned `browserHandoff.url` when present, otherwise `editorUrl`, and call WorkBuddy's `present_files`, preserving every query parameter. Treat this only as an attempt to open the editor. In the next user-visible message, always include the clean returned `editorUrl` as a clickable “Open ChatCut editor” fallback and say to use it if the editor did not open automatically. Never show the handoff URL or claim that the browser appeared based only on `present_files.previewed`.
3. Tell the user that WorkBuddy cannot transfer the local file automatically in the current environment. Ask them to drag the original file into the editor's media/assets panel or use its upload button. Mention the known local path when it helps them find the file.
4. Stop and wait for the user to confirm that the editor upload is complete. Do not use `present_files` on the local media as an upload attempt; that tool only opens or presents files.
5. After the user replies, read `view:"assets"` again and identify newly added assets by comparing against the baseline. Do not ask the user for an `assetId`. If no new asset is visible yet, say that plainly and let the user finish or retry the editor upload.
6. Once the asset appears, use `track_progress` for transcription or upload state as required, then continue the requested edit.

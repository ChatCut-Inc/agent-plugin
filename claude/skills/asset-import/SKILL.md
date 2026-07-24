---
name: asset-import
description: Use in Claude Code when acquiring or importing media into a ChatCut project, including local or attached videos, readable user-provided paths, files already uploaded in the editor, public media URLs, Browser-pane injection, transcription readiness, and upload fallback decisions.
---

# Asset Import (Claude Code)

## Select one import route first

- **Readable local file or chat attachment + Browser pane available (or can be opened):** use the Browser-pane local import below. This is the default Claude Code path. Do not call `import_media` or run `upload-media.mjs` first merely because the attachment has a readable local path.
- **Browser-pane fallback:** use the upload-helper route only when the Browser pane cannot be opened, the target editor page is unavailable, or the page-script/drop attempt actually fails. Do not choose the fallback preemptively.
- **Already uploaded in the ChatCut editor:** discover and use the existing asset through `browse_assets`; do not import a duplicate.
- **Public `http(s)` media URL:** use `push_asset` or `download_media`; do not route it through a local-file helper.

## Browser-pane local import (instant import; upload state is verified)

When the editor is already open (or should be opened) in the in-app Browser pane and the source files are local paths on the user's machine, this path lands assets in the project library the moment you drop them: instant preview, timeline placement, and automatic transcription (the extracted transcription audio uploads on its own). Use it for fast local editing.

MECHANISM: the Browser pane hands local files to the visible editor through a tokenized loopback URL and a synthetic OS-file drop. Current deployments may treat the pane as a normal web import, while older deployments could leave the original bytes local-only after transcription audio upload. Do not assume either behavior. After dropping, check `browse_assets`: if the asset reports uploading/cloud-backed, treat it as a normal web import and wait on `track_progress target:"upload"` before byte-dependent work; if it reports local-only/deferred original upload, follow the deferred-upload guidance below.

Consequence for sequencing: if the task will end in cloud export/share, `pull_asset`, or remote frame decode, use `browse_assets` to confirm whether the pane-dropped asset is cloud-backed. If it remains local-only when byte-dependent work is actually needed, import the same file through the `upload-media.mjs` helper flow below (it registers a cloud-backed asset). Do not choose the helper from the start solely because later work may need cloud bytes. Fall back to the helper flow entirely when there is no Browser pane, the editor tab is not open, or page scripting fails.

1. Ensure the editor tab is open in the Browser pane on the target project. Use the returned `browserHandoff.url` when present; it is the authenticated Claude Code in-app-browser URL. Preserve returned query parameters such as `dockviewLayout=media`, but do not add `theme=codex` or invent Codex-only workbench parameters for Claude Code URLs.
2. Start the tokenized loopback file server bundled with this skill (auto-shuts down after `--ttl` seconds; serves only the listed files, only to the editor origin):

```bash
node <this-skill-dir>/scripts/serve-local-media.mjs --origin <origin-from-browserHandoff-or-editorUrl> /path/to/a.mp4 /path/to/b.mov
```

It prints `{"files": {"a.mp4": "http://127.0.0.1:<port>/<token>/a.mp4", ...}}`.

3. In the Browser pane, run page JavaScript that fetches each URL and dispatches a synthetic OS-file drop (loopback fetches are allowed from the https editor page; the server answers CORS + Private Network Access preflights). Drop target decides placement — the ASSETS PANEL (`div.relative.flex.min-h-0.flex-1.flex-col.pb-1\.5.select-none`) imports to the library only; the viewer/canvas area also places the clip on the timeline at the playhead. Import to library only unless the user asked to place it:

```js
const MIME = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};
const resp = await fetch(fileUrl);
if (!resp.ok) throw new Error("loopback fetch failed: " + resp.status);
const ext = fileName.split(".").pop().toLowerCase();
const file = new File([await resp.blob()], fileName, {
  type: MIME[ext] || "application/octet-stream",
});
const dt = new DataTransfer();
dt.items.add(file);
const target = document.querySelector(
  "div.relative.flex.min-h-0.flex-1.flex-col.pb-1\\.5.select-none",
);
if (!target)
  throw new Error("assets panel dropzone not found — is the editor loaded?");
const opts = {
  bubbles: true,
  cancelable: true,
  composed: true,
  dataTransfer: dt,
};
target.dispatchEvent(new DragEvent("dragenter", opts));
target.dispatchEvent(new DragEvent("dragover", opts));
target.dispatchEvent(new DragEvent("drop", opts));
```

4. Verify with `browse_assets`: the asset should appear in the project with transcription starting. Wait for transcription via `track_progress` before transcript work, exactly as with other import paths. Check upload/local-only state separately before export, `pull_asset`, or remote frame decode.
5. PIPELINE LIFECYCLE: after the drop, the editor runs a background pipeline — hash, durable local persistence, transcription-audio upload + ASR, and, on web-classified deployments, original byte upload. When the pipeline is allowed to finish, the local blob is persisted and the asset survives tab reloads. The relink failure mode appears when the pipeline is INTERRUPTED before local persistence completes: navigating the tab away, closing it, or losing the session right after importing strands the asset as relink-on-reload. (Also seen: a full local disk makes the browser storage-quota write fail, stranding the same way.) Therefore:
   - AFTER DROPPING, LEAVE THE TAB ALONE until `browse_assets` shows the asset registered and transcription started (typically well under a minute); do not chain an immediate navigation after an import.
   - If you find an asset in the relink state (from an earlier interrupted run), recover by re-running the same drop with the same file — cheap and scriptable; do it proactively instead of asking the user to re-pick.
   - Before byte-dependent work (export, `pull_asset`, remote frame decode), check `browse_assets`. If upload is in progress, wait on `track_progress target:"upload"`; if the asset is still local-only/deferred, import the file via the `upload-media.mjs` helper when those cloud bytes are needed (it registers a cloud-backed asset; place that assetId on the timeline).
6. PROGRESS, VISUAL UNDERSTANDING, TRIAGE — the helper-flow rules below apply to this path verbatim, with one advantage: you SERVED these files, so you already hold every original local path.
   - Progress visibility: `browse_assets` shows per-asset state; `track_progress {action:"status"|"wait", target:"transcription", assetIds}` is the progress surface for transcript work, and `track_progress target:"upload"` is only for assets that are actually uploading. Tell the user exactly what you are waiting on instead of blocking silently.
   - Visual understanding: for content analysis, extract stills locally from the path you served (`ffmpeg -ss <t> -i <path> -frames:v 1`) and read the images natively — do NOT wait for upload or call remote `view_asset_frames` while the local path is readable (same rule as the helper flow's `sourcePath`).
   - Many files: don't blanket-import a big folder. Probe locally first (`ffprobe` + a sampled frame per file) to see what each clip is, pick the bounded subset the task needs (ask the user when the selection is editorial), then drop just those — same judgment as the helper flow's multi-source rule; selection must not become a mandatory gate when the needed originals are obvious.

Original filenames, including CJK names, are preserved verbatim. Do not build any other ad-hoc local server or bypass: this loopback helper + synthetic drop is the only sanctioned page-injection import path.

## Upload-helper fallback only

Use this section only after the Browser-pane route is unavailable or actually fails. The symlinked Codex helper is not an alternative default import route.

If the helper/upload command is denied by host policy or auto-review because it would transfer private local file contents to ChatCut's external API, stop immediately. Do not inspect, transcode, copy, edit, register local-only, render locally, or try any alternate local workflow. Tell the user that Claude Code was denied permission to upload the file, then ask them to either upload the media in the right panel ChatCut editor or rerun Claude Code with permission for this upload.

The helper is mandatory for import prep/upload. Do not run `ffprobe`, `ffmpeg`, `curl`, metadata inspection, extraction, transcode, or presigned-upload commands yourself as a replacement for the helper. Do not copy local media into the workspace to make `push_asset` accept it. The only local command you should run for import prep/upload is this skill's `scripts/upload-media.mjs`. Separate visual verification/source-frame inspection may use host-native local file tools such as `ffmpeg`; follow the `verification` skill for that. The helper's technical media preparation is not permission to make an editorial pre-render or flattened final video locally.

MCP OAuth stays inside the MCP client. The helper uses only the short 30-minute import token returned by `import_media`; never pass OAuth tokens to shell. Resolve `scripts/upload-media.mjs` relative to this skill file; do not search the workspace.

Run `upload-media.mjs` with `node` from PATH as defined by `chatcut-plugin-basics-claude`. Do not install Node.js. Use Claude Code's normal shell permission flow.

Required flow for one or many readable files:

1. Call `import_media` with `{"action":"create_session"}`.
2. Run the plugin-provided helper once with the returned `token`, `endpoint`, and at most four local file paths. Do not call `import_media` again for those files. For more files, split them into batches of four and create a fresh session per batch. The helper returns registered `assetId`s as soon as placeholders are created; upload and transcription work may continue after the IDs are known.

For multi-source edits, build reviewable work from original source assets in the ChatCut timeline. Do not locally concatenate, pre-trim, pre-compose, burn captions, mix down, or render a "review MP4" merely to reduce the number of files uploaded. Use judgment on sequencing: start import for obvious or likely-needed originals when that keeps work moving, and inspect local source frames in parallel when helpful. Do not make a separate local source-selection pass a mandatory gate before upload. If the user explicitly asks you to choose among many sources, or importing every file is clearly unreasonable, choose a bounded subset and import those originals through this flow.

```bash
node <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /path/to/source-1.mp4 /path/to/source-2.wav
```

Run the helper as a normal foreground command and read its final JSON from stdout. Detached/background mode is not supported. For non-SVG media imports, the helper registers an asset placeholder before preparing and uploading bytes. SVG imports keep the direct `prepare`/`complete` path. Video imports are always transcoded and normalized to 30fps before the final media upload.

Transcription audio is prepared, uploaded, and started before the large asset byte upload whenever readable audio exists. If audio/video assets were imported, call `track_progress` with `target:"transcription"` before transcript/caption work. For source-frame inspection, prefer the helper's returned `sourcePath` and inspect locally with host-native tools; do not wait for upload or call `view_asset_frames` when the original path is readable. Wait for `target:"upload"` only before byte-dependent work that truly requires ChatCut/cloud bytes, such as export/render, `pull_asset`, or remote `view_asset_frames` for an asset whose original file path is not available.

Use precise wording when reporting progress: if the placeholder is registered, say the `assetId` is already known or available. If you are still waiting, say exactly what you are waiting for, such as helper output/status confirmation, transcription readiness, or byte upload completion. Do not say you are waiting for upload to finish "to get the asset id" after registration has happened.

The published plugin bundles compressed FFmpeg binaries for Apple Silicon macOS and x64 Windows. The helper resolves explicit `--ffmpeg`/`--ffprobe` arguments first, then environment overrides, then the matching bundled binaries, and finally `ffmpeg`/`ffprobe` on PATH. If the helper still reports a missing or broken media binary, first attempt to fix it yourself using available shell/package-manager capabilities. Only ask the user to install or fix FFmpeg if self-repair is unavailable, blocked, or fails. Do not guess or rewrite helper metadata.

Record source URL/path and acquisition method in trace notes when validating plugin behavior.

---
name: asset-import
description: Use when acquiring or importing media into a ChatCut project asset library for video editing or creation, including local/attached videos, user-provided paths, public media URLs, web video/audio/image assets, upload fallback decisions, and deciding between import_media, download_media, or manual user action.
---

# Asset Import

For files readable by Codex shell, including `/Users/...`, `/tmp/...`, and chat attachments materialized as files: use the ChatCut media import helper plus `import_media`.

## Claude Code Browser-pane local import (instant import; original stays local by design)

Claude Code desktop only. When the editor is already open (or should be opened) in the in-app Browser pane and the source files are local paths on the user's machine, this path lands assets in the project library the moment you drop them: instant preview, timeline placement, and automatic transcription (the extracted transcription audio uploads on its own). Use it for fast local editing.

VERIFIED MECHANISM (2026-07-13, root-caused in deployed prod code): the Claude Code Browser pane runs with an Electron user agent (`…Electron/42.5.1…`), and the ChatCut editor's desktop detection treats any `\bElectron\/` user agent as the desktop client (`isDesktop` → true). Desktop mode DEFERS the original byte upload by design — the asset is marked `localOnly:{originalUpload:"deferred"}` and the original video/audio bytes stay on the user's machine (a real web browser, with no `Electron/` in its UA, uploads the original instead — that difference is why a pane import behaves differently from a browser drag). The transcription branch still uploads its small audio and runs ASR, so transcript/caption work is unaffected. But the deferred upload NEVER auto-resumes (pipeline resume explicitly skips deferred assets), so the original will not become cloud-backed on its own, and cloud export/render will report the asset as `local_only` (a non-error readiness state, but render is blocked until real bytes exist). Unlike the genuine ChatCut desktop app, the pane has no Electron file bridge to upload originals at export time, so there is no automatic recovery here.

DEPLOYMENT-DEPENDENT: a fix is queued (`fix/foreign-electron-ua-web-mode`) that reclassifies foreign Electron hosts as web, after which pane drops upload originals like a normal browser. Don't assume either behavior — after dropping, check `read_project view:"assets"`: if the asset reports local-only, follow the deferred-upload guidance here; if it shows uploading/cloud-backed, treat it as a normal web import and wait on `track_progress target:"upload"` before byte-dependent work.

Consequence for sequencing: if the task will end in cloud export/share, `pull_asset`, or remote frame decode, do NOT rely on a pane drop for those bytes — import those files through the `upload-media.mjs` helper flow below (it registers a cloud-backed asset), either from the start or when export time comes. Fall back to the helper flow entirely when there is no Browser pane, the editor tab is not open, or page scripting fails.

1. Ensure the editor tab is open in the Browser pane on the target project. Use the `browserHandoff.url` but REMOVE the `theme=codex` query parameter (keep `dockviewLayout` and `editor-boot-token`): `theme=codex` puts the editor in the Codex-webview mode that blocks file drops and hides manual import buttons, which does not apply to the Claude Code pane.
2. Start the tokenized loopback file server bundled with this skill (auto-shuts down after `--ttl` seconds; serves only the listed files, only to the editor origin):

```bash
node <this-skill-dir>/scripts/serve-local-media.mjs --origin https://app.chatcut.io /path/to/a.mp4 /path/to/b.mov
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

4. Verify with `read_project` `view:"assets"`: the asset appears as local-only on the user's device with transcription starting; timeline/transcript edits work immediately. Wait for transcription via `track_progress` before transcript work, exactly as with other import paths.
5. PIPELINE LIFECYCLE: after the drop, the editor runs a background pipeline — hash, durable local persistence, and transcription-audio upload + ASR. Because the pane is desktop-classified (see mechanism above), the ORIGINAL byte upload is deferred and does not run; the asset stays `local_only`. When the transcription pipeline is allowed to finish, the local blob is persisted and the asset survives tab reloads (bytes restore locally, pipeline self-resumes on next load). The relink failure mode appears when the pipeline is INTERRUPTED before local persistence completes: navigating the tab away, closing it, or losing the session right after importing strands the asset as relink-on-reload. (Also seen: a full local disk makes the browser storage-quota write fail, stranding the same way.) Therefore:
   - AFTER DROPPING, LEAVE THE TAB ALONE until `read_project` shows the asset registered and transcription started (typically well under a minute); do not chain an immediate navigation after an import.
   - If you find an asset in the relink state (from an earlier interrupted run), recover by re-running the same drop with the same file — cheap and scriptable; do it proactively instead of asking the user to re-pick.
   - Before byte-dependent work (export, `pull_asset`, remote frame decode), do NOT wait on `track_progress target:"upload"` for a pane-dropped original — it is deferred and will never complete on its own. When the task will end in export/cloud work, import those files via the `upload-media.mjs` helper (it registers a cloud-backed asset; place that assetId on the timeline) — either from the start, or run the helper for those files when export time comes.

6. PROGRESS, VISUAL UNDERSTANDING, TRIAGE — the helper-flow rules below apply to this path verbatim, with one advantage: you SERVED these files, so you already hold every original local path.
   - Progress visibility: `read_project view:"assets"` shows per-asset state; `track_progress {action:"status"|"wait", target:"transcription", assetIds}` is the progress surface. Editing/transcript work only ever waits for transcription. Do NOT wait on `target:"upload"` for a pane-dropped original — it is deferred (local_only) and will not complete; a pane import is done once transcription is ready. Tell the user what you are waiting on instead of blocking silently.
   - Visual understanding: for content analysis, extract stills locally from the path you served (`ffmpeg -ss <t> -i <path> -frames:v 1`) and read the images natively — do NOT wait for upload or call remote `view_asset_frames` while the local path is readable (same rule as the helper flow's `sourcePath`).
   - Many files: don't blanket-import a big folder. Probe locally first (`ffprobe` + a sampled frame per file) to see what each clip is, pick the bounded subset the task needs (ask the user when the selection is editorial), then drop just those — same judgment as the helper flow's multi-source rule; selection must not become a mandatory gate when the needed originals are obvious.

Original filenames, including CJK names, are preserved verbatim. Do not build any other ad-hoc local server or bypass: this loopback helper + synthetic drop is the only sanctioned page-injection import path.

If the helper/upload command is denied by host policy or auto-review because it would transfer private local file contents to ChatCut's external API, stop immediately. Do not inspect, transcode, copy, edit, register local-only, render locally, or try any alternate local workflow. Tell the user that Codex was denied permission to upload the file, then ask them to either upload the media in the right panel ChatCut editor or restart/run Codex with higher permission for this upload.

The helper is mandatory for import prep/upload. Do not run `ffprobe`, `ffmpeg`, `curl`, metadata inspection, extraction, transcode, or presigned-upload commands yourself as a replacement for the helper. Do not copy local media into the workspace to make `push_asset` accept it. The only local command you should run for import prep/upload is this skill's `scripts/upload-media.mjs`. Separate visual verification/source-frame inspection may use Codex-native local file tools such as `ffmpeg`; follow the `verification` skill for that. The helper's technical media preparation is not permission to make an editorial pre-render or flattened final video locally.

MCP OAuth stays inside the MCP client. The helper uses only the short 30-minute import token returned by `import_media`; never pass OAuth tokens to shell. The helper is at `scripts/upload-media.mjs` relative to this skill file (`skills/asset-import/SKILL.md`); resolve that path directly, do not search the workspace.

Before running the JavaScript helper, resolve the Codex bundled Node runtime with `load_workspace_dependencies` when that host tool is available, then run `upload-media.mjs` with the returned `node.exe`/`node` path. Do not install Node.js or assume global `node` exists. If `load_workspace_dependencies` is unavailable, first check whether bundled dependencies are already present; only then fall back to globally installed `node`.

Run the helper out of sandbox by default. It requires access to the user's local source media paths, the plugin's installed helper script, the Codex bundled Node runtime, and the network import endpoint, so request approval before executing instead of attempting a sandboxed run first. Do not retry the same helper command inside the sandbox after an approval/out-of-sandbox path is available.

Required flow for one or many readable files:

1. Call `import_media` with `{"action":"create_session"}`.
2. Run the plugin-provided helper once with the returned `token`, `endpoint`, and every local file path. Do not call `import_media` again for those files. The helper returns registered `assetId`s as soon as placeholders are created; upload and transcription work may continue after the IDs are known.

For multi-source edits, build reviewable work from original source assets in the ChatCut timeline. Do not locally concatenate, pre-trim, pre-compose, burn captions, mix down, or render a "review MP4" merely to reduce the number of files uploaded. Use judgment on sequencing: start import for obvious or likely-needed originals when that keeps work moving, and inspect local source frames in parallel when helpful. Do not make a separate local source-selection pass a mandatory gate before upload. If the user explicitly asks Codex to choose among many sources, or importing every file is clearly unreasonable, choose a bounded subset and import those originals through this flow.

```bash
"<bundled-or-global-node>" <this-skill-dir>/scripts/upload-media.mjs --token <token> --endpoint <endpoint> /path/to/source-1.mp4 /path/to/source-2.wav --json-out /tmp/chatcut-imports.json
```

```powershell
& "<bundled-node-path>\node.exe" "<this-skill-dir>\scripts\upload-media.mjs" --token <token> --endpoint <endpoint> C:\path\to\source-1.mp4 C:\path\to\source-2.wav --json-out $env:TEMP\chatcut-imports.json
```

For non-SVG media imports, the helper registers an asset placeholder first and writes `imports[].result.assetId` to `--json-out` before the final media bytes are necessarily uploaded. The helper runs foreground by default, so the command may still be transcoding or uploading after the JSON appears. If the helper command is still running but the `--json-out` file exists and contains an `assetId`, read that JSON immediately and continue timeline placement or other metadata-only edits; do not wait for the helper process to exit. SVG imports keep the legacy direct `prepare`/`complete` path and return after upload completion. Video imports are always transcoded and normalized to 30fps before the final media upload. Once that `assetId` is present in helper output/status, timeline placement and other metadata-only edits can proceed; do not wait for byte upload just to place or organize the asset.

Transcription audio is prepared, uploaded, and started before the large asset byte upload whenever readable audio exists. If audio/video assets were imported, call `track_progress` with `target:"transcription"` before transcript/caption work. For source-frame inspection, prefer the helper's returned `sourcePath` and inspect locally with Codex-native tools; do not wait for upload or call `view_asset_frames` when the original path is readable. Wait for `target:"upload"` only before byte-dependent work that truly requires ChatCut/cloud bytes, such as export/render, `pull_asset`, or remote `view_asset_frames` for an asset whose original file path is not available.

Use precise wording when reporting progress: if the placeholder is registered, say the `assetId` is already known or available. If you are still waiting, say exactly what you are waiting for, such as helper output/status confirmation, transcription readiness, or byte upload completion. Do not say you are waiting for upload to finish "to get the asset id" after registration has happened.

The published plugin bundles compressed FFmpeg binaries for Apple Silicon macOS and x64 Windows. The helper resolves explicit `--ffmpeg`/`--ffprobe` arguments first, then environment overrides, then the matching bundled binaries, and finally `ffmpeg`/`ffprobe` on `PATH`. If the helper still reports a missing or broken media binary, first attempt to fix it yourself using available shell/package-manager capabilities in the current environment. Only ask the user to install or fix ffmpeg if self-repair is unavailable, blocked, or fails. Do not guess or rewrite helper metadata.

For code assets such as hand-authored Motion Graphics, use the Codex-only `create-motion-graphics` skill. It uses `create_motion_graphic_from_code` for new inline-code MG assets, then `edit_item` when the asset should be placed on the timeline. Do not write generated code to repo files, local temp files, local HTTP servers, or guessed backend workspaces.

Record source URL/path and acquisition method in trace notes when validating plugin behavior.

## Local-Only Import (no S3 upload)

Use this path when the user wants asset bytes to stay on their machine — typical Codex case where the user only intends to export locally via the `export` skill and never needs the file in the cloud editor or a share link.

Pre-requisite: the `chatcut` CLI is installed on the user's machine (`npm install -g @chatcut/skill` or via the user's preferred package manager). The CLI persists `assetId → absolute path` to a shared local store that local export tools can read.

Flow per file:

1. Call `import_media` with `{"action":"create_session"}` once for the project.
2. For each readable local file, run:

```bash
chatcut register --token <token> --endpoint <endpoint> --path /path/to/source.mp4
```

3. The command prints the new `assetId` on stdout. Use that id with `edit_item` and other timeline tools, exactly as if the asset had been uploaded.

When NOT to use this path:

- The user wants the project to be sharable, opened on another machine, or rendered via cloud export. Cloud render rejects projects whose assets have no `remoteUrl` — the LLM will see a clear 400 telling it to use local export instead.
- The user explicitly asks to upload.

For the share-able / cloud-ready path, keep using `scripts/upload-media.sh` exactly as documented above. The two paths can coexist in the same project; only the bytes-only-local assets force the local-CLI export path.

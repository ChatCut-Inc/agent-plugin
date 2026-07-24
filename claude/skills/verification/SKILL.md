---
name: verification
description: Use when checking whether agent edits made through the ChatCut plugin are reflected in the ChatCut project and editor.
---

# Verification

Prefer two signals:

1. Staged `read_project` discovery for structure: timeline tracks, one track's items and placement, asset library, or targeted item/asset detail.
2. A visual capture path for rendered evidence at exact frames.

Use `view_timeline_frames` for composed timeline proof when the host exposes it.
This verifies the edited ChatCut timeline: trims, layers, captions, effects,
markers, placeholders, crops, transitions, and layout. Hosted connectors return
one temporary Lambda image resource link per requested frame. If Codex cannot
inspect the signed URLs directly, create a temporary folder with
`tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/chatcut-frames.XXXXXX")`, download each
full shell-quoted URI with
`curl --fail --location "$URI" --output "$tmp_dir/<frame-name>.jpg"`, and open
the local files with the native image-reading tool. Inspect them individually
or stitch only the temporary local copies into a contact sheet for comparison.
Successful rendering and timeline metadata are not visual proof until Codex
actually inspects the pixels.

For raw source-asset frame inspection, choose the cheapest path based on where
the bytes live:

- If Codex has the original local file path, such as the `sourcePath` returned
  by the import helper, inspect that file locally with Codex-native tools such
  as `ffmpeg`/`ffprobe` and your normal image-read flow. Do not call
  `view_asset_frames` for those assets just to get source frames; the remote
  tool would duplicate work and may wait on upload/editor routing unnecessarily.
- If Codex does not have the original file, for example the asset was uploaded
  in the ChatCut editor or exists only in project storage/cache, use
  `view_asset_frames` with the current project asset id. Hosted connectors render
  remote video timestamps on Lambda and return separate temporary image links;
  cloud still images return their existing resource link directly.
- `get_contact_sheet` is not available on the Codex surface.

Use local/remote source-frame artifacts only for source understanding, moment
selection, and rough trim decisions, not as edited output or timeline proof.

For local-only or upload-in-progress media, composed timeline proof may be
blocked until the asset has bytes available to the renderer. Source-frame
inspection is still possible locally when Codex has the original path, or via
`view_asset_frames` when an open editor tab can provide the asset bytes.

If both visual proof paths are blocked, ask the user to inspect the ChatCut
editor directly and note the blocker explicitly.

Useful checks:

- After import: `inspect_asset({ "assetId": "<prefix>" })`
- After move/trim: prefer `read_project({ "itemId": "<prefix>" })`; otherwise discover the track with `view:"timeline"`, then read that track with `view:"track"`.
- After visual overlay or MG on any timeline media: `view_timeline_frames({ "frames": [30, 45, 75] })`, then inspect each returned frame link.
- For user-requested source selection or visual moment picking from local files: extract stills locally with `ffmpeg` from the source file and inspect those images. Use that only to choose source files, moments, and rough trims; it may run in parallel with importing obvious or likely-needed originals and should not become an upload gate unless choosing the subset is actually the task or importing everything is unreasonable. Build the visible edit as ChatCut timeline items. Do not treat raw source inspection as timeline verification or as permission to produce the edited video locally.
- For source-frame inspection of editor-uploaded assets where no local original path is available: call `view_asset_frames({"assetId":"...","sourceTimesMs":[...]})` after `browse_assets` confirms the asset id/type. Prefer this over asking the user to reattach the file.
- For local-only visual verification: upload/register cloud-readable media before relying on connector visual proof.
- For no-source validation: confirm the tool manifest exposed the parameters you used, then record the visible proof in the trace log.

When talking about seconds, verify the fps from `read_project` or use adapter tools that resolve fps internally.

When reporting a timeline item location, use only the latest targeted item detail or `view:"track"` response for track alias, item id, start, duration, and asset id. Do not infer placement from the orientation summary, planned/default tracks, or tool-call intent.

Do not treat a command-line JSON response alone as sufficient when the user asks whether the editor reflects the result. Use the editor URL or visual proof when practical.

If verification fails, classify the gap before changing tools:

- tool description or schema was insufficient
- skill instructions were missing a step
- `read_project` did not expose enough state
- editor authorization did not complete
- media/transcription pipeline failed
- cloud render/editor observation was blocked

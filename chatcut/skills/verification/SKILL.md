---
name: verification
description: Use when checking whether Codex edits are reflected in the ChatCut project and editor.
---

# Verification

Prefer two signals:

1. `read_project` for structure: assets, tracks, items, frame placement, timeline duration.
2. A visual capture path for rendered evidence at exact frames.

Use `render_cloud_screenshot` for composed timeline proof when the host exposes
it. This verifies the edited ChatCut timeline: trims, layers, captions, effects,
markers, placeholders, crops, transitions, and layout.

Do not use ChatCut MCP tools for raw source-asset frame inspection in Codex.
`get_contact_sheet` and `view_asset_frames` are intentionally unavailable on the
Codex surface. If the original source file is readable in the Codex workspace or
chat attachment filesystem, inspect it locally with Codex-native tools such as
`ffmpeg`/`ffprobe` and your normal image-read flow, but use those artifacts only
for source understanding, not as edited output. If the source is only in
ChatCut project storage and not locally readable, ask the user to attach/provide
the source file or inspect it directly in the ChatCut editor.

For local-only or upload-in-progress media, connector visual proof is not
available until the asset is uploaded/registered with a cloud-readable URL.

If both visual proof paths are blocked, ask the user to inspect the ChatCut
editor directly and note the blocker explicitly.

Useful checks:

- After import: `read_project({ "view": "assets", "assetId": "<prefix>" })`
- After move/trim: `read_project({ "view": "timeline" })`
- After visual overlay or MG on any timeline media: `render_cloud_screenshot({ "frames": [30, 45, 75] })`, then inspect `visualSource`.
- For user-requested source selection or visual moment picking from local files: extract stills locally with `ffmpeg` from the source file and inspect those images. Use that only to choose source files, moments, and rough trims; it may run in parallel with importing obvious or likely-needed originals and should not become an upload gate unless choosing the subset is actually the task or importing everything is unreasonable. Build the visible edit as ChatCut timeline items. Do not treat raw source inspection as timeline verification or as permission to produce the edited video locally.
- For local-only visual verification: upload/register cloud-readable media before relying on connector visual proof.
- For no-source validation: confirm the tool manifest exposed the parameters you used, then record the visible proof in the trace log.

When talking about seconds, verify the fps from `read_project` or use adapter tools that resolve fps internally.

When reporting a timeline item location, use only the latest `read_project` structure for track alias, item id, start, duration, and asset id. Do not report planned/default tracks or tool-call intent as verified placement.

Do not treat a command-line JSON response alone as sufficient when the user asks whether the editor reflects the result. Use the editor URL or visual proof when practical.

If verification fails, classify the gap before changing tools:

- tool description or schema was insufficient
- skill instructions were missing a step
- `read_project` did not expose enough state
- editor authorization did not complete
- media/transcription pipeline failed
- cloud render/editor observation was blocked

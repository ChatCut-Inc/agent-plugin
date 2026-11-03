---
name: visual-analysis
description: Analyze videos and references scene by scene, verify composed ChatCut edits, compare source frames, locate visual changes, and build labeled comparisons using the hosted plugin's actual frame delivery.
---

# Visual Analysis

Use fresh pixels to decide visual questions: whether an edit appears, when an
animation changes, how a crop or overlay composes, or which source shot fits.
The Codex/Claude host filesystem and ChatCut's backend workspace are separate.

## Whole-video or granular scene analysis

For a video/reference breakdown, read
[Scene-by-scene analysis](references/scene-breakdown.md). It adds chronological
visual observations, each scene's words from the existing ChatCut transcript,
shot/screen-state detail and optional scene JSON.
Choose this path from the user's question; a focused edit check keeps the
inspection workflow below. No new provider, queue or user mode parameter is
required. Use the current host's source/timeline delivery and clock contracts.

## Keep coordinates and subjects explicit

| Subject                             | Tool and coordinates                                                                          | What the image proves                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Placed timeline composition         | `preview_timeline`, `views:["viewer"]`, `viewerFrames` in timeline frames                     | Clips with their placement, crop, captions, overlays, effects, and framing |
| Original video / Motion Graphic     | `inspect_asset`, `sourceFrameCount` for an overview or `sourceTimesMs` in source milliseconds | The source media at those positions                                        |
| Original image / SVG                | `inspect_asset` with its default image preview                                                | The source image, without timeline placement                               |
| Readable original file in this host | The host's local inspection tools                                                             | Source bytes; no temporary timeline or cloud upload is needed              |

Use `timelineId` when scope could be ambiguous. Viewer metadata reports the
actual `frame`, `timelineTimeMs`, and FPS. Source metadata reports `sourceTimeMs`.
Do not label a source timestamp as timeline time. Read a placed item's start,
source offset, playback rate and timeline FPS before mapping between them.

Timeline ranges are half-open `[fromFrame,toFrame)`. Frames at `toFrame` or the
duration are outside the renderable range. The hosted tool may skip invalid
requested moments and report adjustments; it fails when none are renderable.
Check the returned frames rather than assuming every request was rendered.
`sourceTimesMs` and `sourceFrameCount` are alternatives; bounded transcript
context uses the separate `transcriptRangesMs` field.

## Read the actual delivery

Preview tools can return an inline image, temporary per-frame `resource_link`
URIs, or written workspace paths on a workspace-backed runtime. Hosted plugins
have no backend workspace. Inspect inline images directly when the host shows
them. For image links, use the full returned URI with a host-supported image
reader, or an allowed download into the host's own analysis directory. Never
infer local files from names such as `timeline-frames/...`, and never treat a
backend `workspacePath` as a path on the user's computer.

If rendering is unavailable, read its diagnostic. Source-frame requests on
this connector need the target project open in a capable editor; there is no
automatic cloud fallback. Inspect a readable original locally when that is the
subject, or surface the returned editor URL for composed proof. A metadata read
or successful tool call without visible pixels does not establish appearance.

## Narrow a change

Start with a frame before and after the suspected change. Sample a few moments
between them, then refine the adjacent pair that brackets the difference.
Stop at adjacent timeline frames when exact onset matters. For source footage,
refine source milliseconds instead. An overview proves only sampled moments.

Read full frames before cropping. Use the same crop rectangle and scale for
comparisons, and label the returned frame/time, timeline or source identity.
Keep chronological order left-to-right, then top-to-bottom. Render fresh
evidence after editing; an old contact sheet describes the old state.

## Straightening across shots

A clip can contain different camera angles. Choose a reliable level reference
for each affected shot; a doorway viewed in perspective is not enough to infer
camera roll. Apply one rotation to the whole clip only when it suits all shots;
otherwise limit the correction to the intended shot or range and preserve the
others. If the intended reference is unclear, clarify that choice before editing.

Compare matching timeline frames before and after the correction, including
shots that should stay unchanged. Check level, framing and cropped edges together.
Await the edit before requesting its preview, and inspect fresh pixels after an
undo too. Report straightening or restoration only to the extent those frames
verify it.

## Contact sheets from host-local images

Use the tool's returned labeled sheet when available. For custom comparisons,
the shared [concat-images helper](scripts/concat-images.mjs) accepts images that
already exist on the host. It needs Node and an available ImageMagick command;
if those are absent, use the host's existing image tools or inspect frames
individually. This skill does not require a new package installation.

```bash
node <this-skill-dir>/scripts/concat-images.mjs \
  --output <host-analysis-dir>/title-change.jpg --columns 3 \
  --caption "timeline frame 120" --caption "timeline frame 123" \
  --caption "timeline frame 126" \
  <host-analysis-dir>/frame-120.jpg <host-analysis-dir>/frame-123.jpg \
  <host-analysis-dir>/frame-126.jpg
```

`--crop WIDTHxHEIGHT+X+Y` applies a common pixel crop; `--tile-width` limits tile
size. Read the helper's JSON and inspect the resulting `outputPath` using the
host's image viewer. Label strips are analysis annotations, not video content.
Analysis images stay separate from project media; import one through
[asset-import](../asset-import/SKILL.md) only if the user wants to keep or use it.

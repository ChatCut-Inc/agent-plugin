# Gemini Omni 1.1 Flash (`model: "omni"`)

Read before using Omni on `submit_video`. The existing `omni` choice now uses Vertex `gemini-omni-1.1-flash-preview`; do not send the Gemini API's different ID. Seedance 2.5 remains the default for fresh generation.

## When to choose it

- Targeted edits of a short existing clip: change an object's color, remove an object, or change lighting. Ask for unchanged content to remain consistent, but never promise pixel-exact preservation.
- Cheap 360p drafts when iteration cost matters; use 720p by default when no draft quality was requested.
- A user explicitly choosing Omni for a continuation or a first/last-frame transition.
- Upscaled 1080p/4k delivery when requested. Upscaling is not native high-resolution detail; do not silently raise the cost.

This is an upgrade of the previous Omni branch, not evidence that it beats Seedance/Kling on every scene. Do not change the default model for future generations after an Omni edit.

## Supported contract

| Intent                   | Inputs                                               |
| ------------------------ | ---------------------------------------------------- |
| Text-to-video            | `prompt`                                             |
| First-frame animation    | `prompt`, `firstFrame`                               |
| First/last interpolation | `prompt`, `firstFrame`, `lastFrame`                  |
| Subject references       | `prompt`, up to 3 `refImages`                        |
| Targeted video edit      | `prompt`, `continueFrom`, optional `taskMode:"edit"` |
| Video continuation       | `prompt`, `continueFrom`, `taskMode:"extend"`        |

Choose one of frames, references, or source video; never mix them. A last frame requires a first frame. `continueFrom` is a project video asset ref, not an external URL. Images must also be project image asset refs.

- Generation/extension: integer `durationSeconds` 3–10. Extension specifies **added seconds**; the returned asset contains the original plus the continuation (live verified: 3s source + 3s requested = 6s result). Do not append that full asset after the source and duplicate it. Replace the source item only when requested; no timeline mutation is automatic. Output-video billing covers the added part; source input is also charged.
- Edit: source duration is inherited; `durationSeconds` is ignored.
- Source edit/extension: up to 10 seconds (small encoding tolerance), max 16 MB. Trim longer sources first or use Seedance 2.5.
- `ratio`: 16:9 or 9:16; source tasks inherit source ratio.
- `resolution`: 360p, 720p (default), 1080p, 4k. 1080p/4k are upscaled.
- Output: 24fps, video with native audio. `mode`, `shotType`, `multiPrompts`, `outputFormat` are not Omni controls.
- This integration does **not** expose general video/audio references, audio uploads, voice editing, or provider conversation state. Use `continueFrom` for source-video tasks; do not claim the upstream cumulative 40-second conversation workflow works here.
- Every result is a **new asset**, including edits. Wait/check through the surface's `track_progress` contract, inspect the result, then place it only as requested.

## Prompting and review

Use a concise English description of subject, motion, scene, camera, and intended sound. For frame interpolation describe the movement between the supplied frames. For continuation describe what happens next while keeping identities, lighting, and motion continuous. For edits state the targeted change and the important things to preserve.

Reference subjects as `@Image1`, `@Image2`, etc. The adapter binds the source roles; do not construct provider JSON in the prompt. Prefer positive descriptions. Exact captions, logos, and especially CJK text should be added as overlays instead of trusting generated lettering.

Repeated edits can accumulate visual drift; inspect identity, geometry, sound, timing, and unintended changes after each round. The tool's chain warning is a caution, not a measured 1.1 quality threshold. Do not retry policy refusals verbatim or claim success when a job failed.

For source edits, inspect the **first decoded frame**, a middle moment, and a valid moment near the end of the new asset (use `inspect_asset` source timestamps, not timeline time). A targeted change can appear only after the opening frames. Compare against the source and describe only what those samples establish; a thumbnail, asset name, or completed job does not prove whole-duration compliance. If any sample misses the requested change, report the edit as partial, keep the original, and ask before another paid generation. Do not call it "changed throughout" based on a few matching samples.

## Billing

Each generation, edit, or extension costs credits. The UI/preflight estimate depends on resolution, output duration, and media input; final billing uses reported input, video-output, and reasoning/text tokens. Never describe the estimate as a fixed quote or an edit as free.

At the existing $0.25/credit rate, video-output-only cost per second is approximately 0.1352 credits (360p), 0.40544 (720p), 0.60816 (1080p), or 1.21632 (4k), plus input/reasoning. Same-resolution 720p pricing is unchanged from the previous Omni. 360p drafts are cheaper; repeated edits can cost more than one carefully planned generation.

## Examples

```ts
submit_video({
  model: "omni",
  prompt:
    "A red paper boat drifts slowly across a sunlit pond, locked camera, soft water sounds.",
  name: "Paper boat draft",
  durationSeconds: 3,
  resolution: "360p",
  ratio: "16:9",
});
submit_video({
  model: "omni",
  continueFrom: "<video-asset-id>",
  taskMode: "edit",
  prompt:
    "Change the paper boat from red to blue. Preserve the composition and water motion.",
  resolution: "720p",
  name: "Blue paper boat",
});
submit_video({
  model: "omni",
  continueFrom: "<video-asset-id>",
  taskMode: "extend",
  prompt: "The boat continues drifting to the right as small ripples spread.",
  durationSeconds: 3,
  resolution: "720p",
  name: "Boat continuation",
});
submit_video({
  model: "omni",
  firstFrame: "<image-asset-id>",
  lastFrame: "<image-asset-id>",
  prompt: "A smooth camera push between the opening and ending compositions.",
  durationSeconds: 5,
  resolution: "1080p",
  name: "Keyframe transition",
});
```

Sources checked 2026-08-30: [Google announcement](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-omni-1-1-flash/), [Vertex model](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash), [API guide](https://ai.google.dev/gemini-api/docs/omni), [Vertex pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

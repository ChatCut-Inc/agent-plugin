---
name: image-gen
description: |
  AI image generation and reference-image editing via GPT Image 2.5 Flare/Sunburst, GPT Image 2, and Nano Banana. Use when the user wants to generate or create an image / picture / still through the backend image-generation jobs.
user-invocable: true
---

# Image Gen

ChatCut image generation and editing require an active paid Pro subscription and use credits for every model. If `submit_image` returns `FEATURE_NOT_INCLUDED`, surface the upgrade requirement; do not retry another ChatCut model to bypass it. Codex native image generation keeps its own host entitlement and is not governed by this ChatCut requirement.

Generate AI images through the backend generation API. Submit-only: creates a generation job and returns a `jobId`.

After submission, use `track_progress` tool to check status or wait for completion.

## Model Selection

| Model                    | Strengths                                     | Max refs |
| ------------------------ | --------------------------------------------- | -------- |
| `gpt-image-2.5-flare`    | Default: fast everyday generation and editing | 10       |
| `gpt-image-2.5-sunburst` | Precision edits and detailed creative work    | 10       |
| `gpt-image-2`            | Previous GPT image model                      | 10       |
| `nano-banana`            | Strongest reference-image fidelity            | 14       |

- `gpt-image-2.5-flare` is the default. Honor the image model attached to the user prompt or explicitly requested.
- Use `gpt-image-2.5-sunburst` when the user selects it for precise editing.
- `nano-banana` is the reference-heavy choice. Use it when reference-image fidelity matters more than text rendering, or when the user needs more than 10 reference images.

**IMPORTANT:** Before generating, READ the model's reference document for params, limits, and prompt tips:

- Image 2.5 Flare / Sunburst → [references/gpt-image-2.5.md](references/gpt-image-2.5.md)
- `gpt-image-2` → [references/gpt-image-2.md](references/gpt-image-2.md)
- `nano-banana` → [references/nano-banana.md](references/nano-banana.md)

## Tool Params

| Param               | Values                                                                  | Default |
| ------------------- | ----------------------------------------------------------------------- | ------- |
| `aspectRatio`       | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `4:5`, `5:4`, `21:9` | `16:9`  |
| `imageSize`         | `1K`, `2K`, `4K`                                                        | `1K`    |
| `quality`           | `low`, `medium`, `high`, `auto`; Image 2.5 also `xhigh`, `max`          | `high`  |
| `background`        | `auto`, `opaque`, `transparent` (Image 2.5 only; PNG output)            | `auto`  |
| `referenceAssetIds` | Array of project asset ids — backend resolves bytes server-side         | —       |
| `name`              | Short descriptive asset name shown in the library                       | —       |
| `count`             | Number of images to generate (1–10, each becomes a separate job)        | `1`     |

## Defaults

- Aspect ratio: **16:9**. If the project composition is not 16:9, ASK the user which aspect ratio they want before generating.
- Size: **1K**.

## Ask Before Submit

- Never auto-upgrade size.
- Only pass `imageSize: "2K"` or `"4K"` when the user explicitly asks. Warn that 2K/4K are EXPERIMENTAL and may be slower.

## Reference Images

Use when the user provides source material to edit, blend, or use as visual guidance (e.g. "change the background", "combine these into a poster").

- Pass project asset ids via `referenceAssetIds`. The backend fetches and encodes them server-side — never pull the asset bytes yourself.
- When the user @-references an image asset, pass its id directly in `referenceAssetIds`.
- Formats accepted by backend: png, jpeg, webp, svg (auto-rasterized to png), heic, heif. Each ≤ 50MB.

## Run

```ts
// Basic generation
submit_image({
  model: "gpt-image-2.5-flare",
  prompt: "a cute orange cat",
  name: "Cat",
});

// With quality (OpenAI models)
submit_image({
  model: "gpt-image-2.5-flare",
  prompt: "hero poster with bold title",
  quality: "high",
  name: "Hero Poster",
});

// With reference images — pass project asset ids; backend resolves bytes
submit_image({
  model: "gpt-image-2.5-flare",
  prompt: "change background to beach",
  referenceAssetIds: ["<assetId>"],
  name: "Beach Edit",
});

// Reference-heavy with nano-banana
submit_image({
  model: "nano-banana",
  prompt: "composite poster",
  referenceAssetIds: ["<id1>", "<id2>"],
  name: "Composite",
});

// Multiple images
submit_image({
  model: "gpt-image-2.5-flare",
  prompt: "product shots",
  count: 3,
  name: "Product",
});
```

After submission, call `track_progress` with `action=status jobIds=<jobId>`. If the current task depends on a non-terminal result, follow its `checkBackAfterSeconds` sleep guidance before each later status check; `action=wait` is only a non-blocking compatibility alias.

## Rules

- Always provide `name` with a short descriptive asset name.
- Wait for completion unless the user only asked to queue. Use returned asset ids for further edits; use `edit_item` to place an image on the timeline when requested.
- Generation costs credits. Before submitting, briefly tell the user what you're about to generate — especially when generating multiple images.
- Do not use this skill for job management. Use `track_progress` tool for that.

---
name: shader-gen
description: |
  AI shader generator for WebGL video effects, transitions, masks, and color grading (LUT / 调色 / 电影感 / film look). Use when the user wants a video effect (滤镜 / 特效), a transition (转场 / crossfade / wipe / cube / 3d), a mask (蒙版 / 遮罩 / reveal), a zoom / push-in (推近 / 推镜头), or a color grade — try the built-in effects (zoom, builtin LUTs) before generating a new shader.
user-invocable: true
---

# Shader Generator

Submit-only: creates a backend generation job, returns `jobId`. Use the `track_progress` tool for job lifecycle after submission.

**Always use `submit_shader` for new shaders.** Manual authoring is only for
editing existing asset code — never as a fallback when generation fails.

## Catalog-first rule — try existing assets before generation

Before generating a shader, call `browse_library` unless the user names an exact asset id that is already visible in `browse_assets`.

`browse_library` is the source of truth for built-in effects, built-in transitions, and project effect/transition assets. Built-ins are stable global asset ids, not per-project DB assets, so they may not appear in `browse_assets`.

Apply catalog entries with `edit_item`, do **not** call `submit_shader`.

Good catalog searches:

```text
browse_library(query: "zoom")
browse_library(category: "transitions", query: "dissolve")
browse_library(category: "audio-fx")
```

Generate only when no catalog entry matches the user's intent closely enough.

### `builtin:zoom` uses the same track-bound placement as every effect

Effects always have timeline geometry. For a whole-clip effect, pass `targetItemId`; ChatCut resolves it to a clip-anchored range covering that clip. For an explicit timeline range, pass `trackId` + `trackBoundFrom` + `trackBoundDurationInFrames`.

```text
# Zoom on the entire video clip
edit_item(json: '{"adds":[{"type":"effect","assetId":"builtin:zoom","targetItemId":"<clip-id>","propertyOverrides":{"magnification":1.5,"shape":"hold"}}]}')

# Zoom on a sub-range of the clip (e.g. frames 90–150 only, a punch zoom on a beat)
edit_item(json: '{"adds":[{"type":"effect","assetId":"builtin:zoom","mode":"track-bound","trackId":"<trackId>","trackBoundFrom":90,"trackBoundDurationInFrames":60,"propertyOverrides":{"magnification":2,"shape":"punch"}}]}')
```

Use `preview_timeline({views:["timeline"],tracks:["V1"]})` to obtain track item ids and timeline-frame ranges. Use `inspect_item({itemId:"..."})` when exact item detail is needed.

| Key             | Type   | Range / values                             | Default | Notes                                          |
| --------------- | ------ | ------------------------------------------ | ------- | ---------------------------------------------- |
| `magnification` | number | 1–4                                        | `1.5`   | Zoom factor; 1 = no zoom, 2 = 2× in            |
| `focalPointX`   | number | 0–1                                        | `0.5`   | Horizontal focal point (0 = left, 1 = right)   |
| `focalPointY`   | number | 0–1                                        | `0.5`   | Vertical focal point (0 = top, 1 = bottom)     |
| `shape`         | select | `punch` / `hold` / `slow-push` / `instant` | `hold`  | Animation curve                                |
| `focalMode`     | select | `auto` / `manual`                          | `auto`  | `auto` picks subject; `manual` uses focalPoint |
| `easeInFrames`  | number | 0–60                                       | `8`     | Frames to ramp in                              |
| `easeOutFrames` | number | 0–60                                       | `8`     | Frames to ramp out                             |

Omit `propertyOverrides` entirely for default zoom. Send only the keys you want to change — patch semantics.

### Clip-anchored vs adjustment-track

Effect items have two placements, both with a concrete time range:

- **Clip-anchored**: pass `targetItemId` for the whole clip, or include an explicit range that intersects the clip. The stored range is local to that clip and follows it when it moves.
- **Adjustment-track**: pass `trackId` + `trackBoundFrom` + `trackBoundDurationInFrames` for a range over empty track space. The range is absolute on the timeline.

Use `targetItemId` for whole-clip effects. Use explicit track geometry only when the requested range differs from a clip's full duration.

### Built-in LUT properties

```text
edit_item(json: '{"adds":[{"type":"effect","targetItemId":"<clip-id>","assetId":"builtin:slog3-s709","propertyOverrides":{"intensity":1}}]}')
```

| Key         | Type   | Range | Default | Notes                          |
| ----------- | ------ | ----- | ------- | ------------------------------ |
| `intensity` | number | 0–1   | `1`     | LUT strength; 1 = full applied |

To swap: delete the effect and re-add with a different `assetId`. To remove: delete the effect item.

User-uploaded `.cube` LUT assets take this exact same shape — only `assetId` differs. See "Applying an Existing LUT Asset" below.

## Beta Status Gate

New shader generation is beta. Before generating, warn the user and wait for explicit confirmation.

Use the user's language. Chinese: "新的特效/转场生成目前还是 beta 阶段，可能会有不稳定的问题。如果你坚持要做，我可以帮你实现。" Skip if user already acknowledged in the same request.

## Supported Targets

Effects and transitions apply to `video`, `image`, and `gif` items.

## Type Routing

Before generating anything, check two non-generation paths first:

1. **Catalog entry** — use `browse_library` for built-in and project effects/transitions.
2. **User-uploaded `.cube` LUT asset** that already exists in the project library — bind it instead of generating, see "Applying an Existing LUT Asset" below. It shows up in `browse_assets` as `type: effect` with a `lut`-typed entry in `editableProperties`.

| User wants                                                           | `--type`     |
| -------------------------------------------------------------------- | ------------ |
| Video appearance (color, blur, glow, grain, distortion)              | `effect`     |
| Color grade / look (teal-orange, cinematic, vintage, LUT-style)      | `effect`     |
| Visibility control (mask, reveal, wipe, shape cutout, gradient fade) | `effect`     |
| Blend between clips (crossfade, dissolve, slide, 3D cube/page flip)  | `transition` |

"LUT-style" in the table means **generating a fresh GLSL color grade that resembles a LUT** — only when the user wants something new. If they want to apply a `.cube` file already in the library, don't generate; bind the existing asset instead.

No separate LUT or mask generator for the generation path — those are all `effect`.

## Applying an Existing LUT Asset

**Default target is the timeline.** "Apply this LUT" means an `edit_item` effect on the clip. Only reach for `edit_asset sourceLut` when the user asks for the source itself everywhere it appears — every clip cut from that asset, or a log-to-Rec.709 normalization of the footage — because that changes every instance of the asset on every timeline.

`.cube` files uploaded by the user become **effect assets with `category: "lut"`**. Applying one to a clip is **not** generation — it is the same `edit_item` effect shape as a built-in LUT, with that asset's own id as `assetId`:

```text
edit_item(json: '{"adds":[{"type":"effect","targetItemId":"<clip-id>","assetId":"<lut-effect-asset-id>","propertyOverrides":{"intensity":1}}]}')
```

Key points:

- `assetId` is the LUT effect asset's real id. There is no literal `"lut"` assetId, and no LUT binding nested inside `propertyOverrides`.
- `propertyOverrides` carries only `intensity` (0–1, default 1). The `.cube` binding lives on the asset, not on the effect item.
- Find the id with `browse_assets type:"effect"`: a LUT asset is the one whose `editableProperties` contain a `lut`-typed key. Built-in LUTs come from `browse_library category:"luts"`.
- `targetItemType` defaults to `video`; also supports `image`, `gif`.
- To swap: delete the effect and re-add with the other LUT's `assetId`. To remove: delete the effect item.
- To grade a whole source clip everywhere it appears instead of one timeline item, use `edit_asset` update with `{"sourceLut":{"assetId":"<lut-effect-asset-id>"}}` on the video/image/gif asset; `{"sourceLut":null}` removes it.
- If the `.cube` is not in the project yet, you cannot get it in: this surface has no LUT import path, and `.cube` is not an accepted chat attachment either, so never ask the user to send you the file. Ask them to drag it into the editor's media pool instead — the editor registers it as a LUT asset and it then shows up in `browse_assets`. Do not tell them ChatCut cannot handle `.cube`; the editor can.

Do not call `submit_shader` for this path.

After applying, confirm with `preview_timeline` that the effect is listed on the target clip's track. Do not report success from the `edit_item` response alone.

## Usage

Before calling `submit_shader`, restate the user's intent in one concrete sentence, then proceed immediately. After `track_progress` returns, state what was produced in one line — do NOT ask "要保留还是重新生成".

```ts
submit_shader({
  type: "effect",
  prompt: "Chromatic aberration with RGB split",
  name: "Chromatic Aberration",
});

submit_shader({
  type: "transition",
  prompt: "Smooth crossfade with soft edge",
  name: "Crossfade",
});

submit_shader({
  type: "effect",
  prompt: "Cinematic teal-orange color grade",
});

submit_shader({
  type: "effect",
  prompt: "Stronger version",
  referenceAssetIds: ["effect_asset_id"],
});
```

## Strategy

- Submit, then stop. Tell user the job was created.
- Use the `track_progress` tool for status/wait after submission.
- Generation always produces a library asset — never refuse because the timeline isn't ready.
- **Apply is separate and optional.** Only apply when user explicitly asks ("加到视频", "apply", "用到第一段"). When ambiguous, default to library-only.

## Editing Existing Properties

Any time you're about to edit shader `asset.properties`, applied effect/transition `item.propertyOverrides`, or promote a hardcoded shader value, read [`references/property-changes.md`](references/property-changes.md) first.

It reinforces that shader `properties` is an array, but the allowed shader property types are only `number`, `boolean`, `color`, `select`, and `vec2`. Motion Graphic properties are also arrays, but use a different type set.

## Parameters

| Param               | Description                                                                                                                                                    | Default |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `type`              | `"effect"` or `"transition"` (req'd)                                                                                                                           | —       |
| `prompt`            | Description of the shader (req'd)                                                                                                                              | —       |
| `name`              | Asset name shown in library                                                                                                                                    | —       |
| `referenceAssetIds` | Asset ids. Image id → model LOOKS AT it for visual inspiration. Effect/transition id → reuse its code as style anchor (≤1 per submit, kind must match `type`). | —       |

## Output

Returns `{ success, job: { jobId, status }, manage: { status, wait, watch } }`.

## Applying to Timeline

Only when user explicitly requests. Refresh the affected timeline with `view:"timeline"`, passing `track` to narrow the read when appropriate.

### Effect

```text
edit_item(json: '{"adds":[{"type":"effect","targetItemId":"<id>","assetId":"<id>","enabled":true,"propertyOverrides":{}}]}')
```

### Transition

Requires two adjacent same-track endpoints. `edit_item` validates live seam feasibility and refuses durations that would require freeze frames or overlapping neighboring transitions. If the add fails, retry with the suggested `durationInFrames`, trim the clips to expose handles, delete/shorten neighboring transitions, or keep a hard cut.

```text
edit_item(json: '{"adds":[{"type":"transition","assetId":"<id>","outgoingItemId":"<id1>","incomingItemId":"<id2>","durationInFrames":30}]}')
```

## Validation & Verification

### Backend Validation

When generating via `submit_shader`, the backend handles validation
automatically (transpile, AST security, class structure, retry on failure).

### Manual Code Verification

**NEVER write shader code from scratch.** Always use `submit_shader` for new
shaders. This section is ONLY for modifying existing shader code that was
already generated.

When writing shader code manually, read
`<this-skill-dir>/references/design-principles.md` first. If the change touches
editable properties, also read
`<this-skill-dir>/references/property-changes.md`.

Typical workflow:

1. `inspect_asset` with the shader `assetId` and `includeCode: true` — read the current source.
2. Edit the source in your own context.
3. `edit_asset` with `action=update`, the same `assetId`, and the full replacement source inline in `json.code`. Validation runs automatically on update — if code is invalid, the update is rejected with error details.

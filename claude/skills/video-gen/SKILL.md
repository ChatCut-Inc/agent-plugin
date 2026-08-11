---
name: video-gen
description: |
  AI video generation via Seedance 2.5, Seedance 2.0, Kling, and Gemini Omni. Use when the user wants to generate a video clip — text-to-video, image-to-video, first/last-frame transitions, reference-guided generation — or wants to modify / edit / extend an existing generated clip ("change the X", "把 X 改成 Y", remove an object, swap the background).
user-invocable: true
---

# Video Gen

Submits one video generation job per call and returns a `jobId`. Job status and later check-backs belong to `track_progress`; this skill does **not** place videos on the timeline automatically.

## When to Use

Any time the user wants to generate a video clip — text-to-video, image-to-video, first-last-frame transition, reference-based generation, or generatively editing / extending an existing video (producing new generated footage based on a source clip; not timeline trimming).

## Models

| Model           | Reference                                            | Strengths                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seedance-2-5`  | [references/seedance25.md](references/seedance25.md) | Default. 4-30s, up to 50 multimodal references, audio-only reference, timestamp control, and mp4/mov output. Strongest Seedance choice for new generation, edit, and extend.                                         |
| `seedance2`     | [references/seedance2.md](references/seedance2.md)   | Seedance 2.0 full model. 4-15s, rich multimodal references, and up to 1080p output.                                                                                                                                  |
| `seedance2fast` | [references/seedance2.md](references/seedance2.md)   | Seedance 2.0 Fast — **same inputs and 4-15s range as `seedance2`, returns in minutes instead of ~ten, ~20% cheaper, capped at 720p**. Use when the user is iterating and turnaround matters more than peak fidelity. |
| `seedance2mini` | [references/seedance2.md](references/seedance2.md)   | Seedance 2.0 mini — **same inputs and 4-15s range as `seedance2`, ~50% cheaper, capped at 720p**. Use for cheap drafts and high-volume batches where the full model's fidelity isn't required.                       |
| `kling`         | [references/kling.md](references/kling.md)           | Camera-control language via prompt; strong on fine emotional / performance control for character shots. 1080p via `mode:"pro"`.                                                                                      |
| `omni`          | [references/omni.md](references/omni.md)             | **Modifies an existing clip in place** via `continueFrom` — anything the prompt doesn't mention is preserved. Fast, cheap drafts from text or a `firstFrame` image. 720p, 3-10s.                                     |

**IMPORTANT:** Before generating, READ the chosen model's reference for capabilities, input channels, modes, prompt structure, and model-specific behavior.

## Model Selection

**For a new generation**, `seedance-2-5` is the **default**. Only switch when one of:

- **User explicitly named a model** ("用 Kling", "use Kling", "用 Omni", "用 mini", "/kling") — switch, no need to re-ask.
- **Seedance clearly can't or won't do it well** — when you hit a known case where Seedance struggles, propose switching to `kling` and confirm before submitting.
- **User explicitly asked for a fast / cheap draft they expect to revise** — propose `omni` (720p, ≤10s, also edits in place) and confirm before submitting.
- **User needs Seedance output at 1080p** — propose `seedance2`; Seedance 2.5 tops out at 720p.
- **User wants Seedance's 2.0 inputs cheaply, or many clips at once, and is fine with 720p** — propose `seedance2mini` (4-15s, ~50% of the 2.0 full-model cost) and confirm before submitting.
- **User is iterating on 2.0-style output and cares about turnaround** — propose `seedance2fast` (480p or 720p, 4-15s, ~80% of the 2.0 full-model cost, returns much sooner) and confirm before submitting.

Otherwise stay on `seedance-2-5`.

**For revising a clip that already exists**, the choice is made in Step 4 — not here. A revision request is not a reason to change the default for future fresh generations.

Access note: all six models require ChatCut Pro or paid credits. Never present another model as a free workaround for a ChatCut Pro gate; offer free Motion Graphic animation instead when the user asks for a free path.

## Tool Params

| Param             | Values                                                                                         | Default                           |
| ----------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| `prompt`          | video description (required)                                                                   | —                                 |
| `model`           | `seedance-2-5`, `seedance2`, `seedance2fast`, `seedance2mini`, `kling`, `omni`                 | seedance-2-5                      |
| `durationSeconds` | seconds                                                                                        | 5                                 |
| `ratio`           | see model docs                                                                                 | 16:9                              |
| `resolution`      | `480p`, `720p`, `1080p` (model-specific; `seedance2fast` supports 480p/720p and rejects 1080p) | 720p                              |
| `outputFormat`    | `mp4`, `mov` (`seedance-2-5` only)                                                             | mp4 (generate); mov (edit/extend) |
| `taskMode`        | `generate`, `edit`, `extend` (`seedance-2-5` only)                                             | generate                          |
| `name`            | descriptive asset name (required)                                                              | —                                 |
| `firstFrame`      | project asset ref                                                                              | —                                 |
| `lastFrame`       | project asset ref                                                                              | —                                 |
| `continueFrom`    | video asset ref — **`omni` only**, clip to modify                                              | —                                 |

Model-specific params (e.g., Kling `mode`, Seedance `refImages` / `refVideos` / `refAudios`) — see the model's reference.

## Input Resolution

`firstFrame` / `lastFrame` / `refImages` / `refVideos` / `refAudios` all take a project asset reference. Prefer a full UUID or short prefix from `browse_assets`; `asset://<id>` and same-project asset URLs returned by asset tools are also accepted. Per-slot type: frame slots and `refImages` → image; `refVideos` → video; `refAudios` → audio.

External URLs and base64 are not accepted. If the source is a public URL, download it into the sandbox workspace, import the local file through `asset-import` + `push_asset`, and pass the resulting asset id.

## Workflow

Four-step loop. For each new generation, restart from Step 1 if the user's intent has shifted.

### Step 1 — Align scope with the user

Before writing any prompt, align on three dimensions:

1. **Duration & segments** — total length, how many shots, and whether they live in one clip or several.

   If the user has already stated a direction ("做一段", "in one video", "分别生成", "split into N shots", etc.), follow it — don't second-guess.

   Otherwise, surface the two paths and let the user pick:
   - **Multi-shot within one clip** (see model ref) — single inference, subject / lighting / style physically consistent across sub-shots; fits a coherent narrative within the per-clip duration cap.
   - **Multiple clips** — each clip is independently controllable and re-rollable, but identity and style continuity have to be carried by anchors; fits durations beyond the cap or hard scene breaks.

   Offer the trade-off; do not pick for the user.

2. **Content** — what each clip depicts. Summarize back what you understood, segment by segment. When content is vague (e.g. "generate a video of a girl dancing"), the user typically hasn't specified one or more of:
   - **Subject**: who / what is the main subject (appearance, outfit, defining features)?
   - **Action**: what are they doing? (For talking / emotional shots, what micro-expression?)
   - **Scene**: where — setting, time of day, environmental details?
   - **Lighting / color mood**: what atmosphere?
   - **Camera**: any shot-size / angle / movement preference?
   - **Style**: visual style or reference (cinematic / anime / documentary / ...).

   Focus on the items that matter for this specific request and can't be safely inferred — don't turn this into a blank-filling exercise. Summarize the understood parts back to the user before proceeding.

3. **Consistency anchors** — only when multiple shots reuse a character, object, or scene: identify which anchor (reference image or video) to pin across shots. For sourcing rules, see §Visual consistency across shots below.

For each dimension, check the user's words:

- **Clear** — proceed.
- **Ambiguous or missing** — ASK the user. Do not guess, do not default to your own interpretation. A round-trip confirmation is cheaper than a wasted generation.

#### What NOT to do

- **Do not "tell then submit"** — announcing "I'll make this as 2 clips" and immediately submitting is not alignment, it's a unilateral decision with announcement.
- **Do not default to splitting a single-video request into multiple clips.** A single clip can carry multiple sub-shots (see model ref), with subject / lighting / style physically consistent across them. Surface the trade-off, then let the user choose.
- **Do not skip the ask** because you think the answer is obvious.

#### Hard overrides (user's explicit word wins)

- "one clip / single clip / 一条 / 一个镜头 / in 1 clip" → never split, even if the description is objectively long.
- "N shots / N 段 / N 个镜头" → generate exactly N.
- "use this image / 用这张图" → use as reference, don't substitute.

### Step 2 — Write the prompt

See the chosen model's reference for prompt structure and param combinations (e.g., Seedance's 8-element structure and modes; Kling's prompt tips). Before submitting, check:

- `name` is a **descriptive** asset name — descriptive enough for the user (and you in later turns) to recognize this asset in the project library. Avoid vague names like "Untitled" or "clip 1".
- Param combination matches the user's intent — see the **Modes** section in the model's reference.
- Generated video audio is not a tool parameter. Seedance and Kling are submitted with audio enabled by the backend.
- On validation failure, read the error and fix the inputs — **do not blindly retry the same invalid arguments**.

### Step 3 — Submit one, wait, confirm

**Submit one generation job at a time.** Unless the user explicitly asked for multiple clips in parallel, do not submit the next clip until the current one completes and the user has reviewed it. Parallel submission hides problems: if the first shot has drift or wrong framing, the user would rather redo it once than have several misaligned shots to discard.

- `submit_video.ratio` controls the generated asset only; it does not change the project timeline canvas. If the user requested a final output aspect ratio (for example "9:16 vertical" or "16:9 landscape"), set the timeline canvas to the same ratio with `manage_timelines` action=update (e.g. ratio:"9:16") before placing the completed asset. If the user asked for no black bars / full-bleed, pass `fit:"cover"` when setting the canvas or updating/adding the visual item.
- Do not use this skill for job management — use `track_progress` for an immediate status read and follow its later check-back guidance.
- After submitting, end your turn (tell the user the job was created) unless a follow-up task is already queued.
- When the job finishes, surface the result to the user for review before proceeding to the next shot.
- Model-specific failure handling — see the model's reference.

### Step 4 — Iterate

When the user wants a next clip, a revision, or a continuation, first decide what the existing clip **is** in the next call:

| The existing clip is…                                                                          | Path                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **The thing being modified** — a localized change, the rest stays                              | `omni` + `continueFrom`                                      |
| **A source to re-generate from** — new motion / camera, whole-clip style shift, extend, bridge | `seedance-2-5` + `refVideos`; set `taskMode` for edit/extend |
| **Not reusable** — the intent changed                                                          | regenerate, restart at Step 1                                |

**A localized change defaults to `omni` + `continueFrom`.** Do not wait for the user to say "keep everything else" — "把气球改成黄色" / "remove the text in the corner" already means it. Route to `seedance-2-5` only when the change genuinely needs re-inference (motion, camera, duration, whole-clip style), not because Seedance is more familiar.

`omni` editing is unavailable when any of these hold — say so and use `seedance-2-5 + refVideos` instead, telling the user the whole clip will be re-inferred rather than edited in place:

- the source clip is longer than 10s
- the output must stay 1080p (`omni` returns 720p)
- the change is an extend or a bridge (omni does not support them)

**Revising a `kling` 1080p clip has no lossless path.** `omni` and `seedance-2-5` return at up to 720p; `seedance2` can output 1080p but still re-infers from scratch. Tell the user what each path loses and let them choose before submitting.

Then apply the standing rules:

- **If it's the next shot in a multi-shot sequence** — reuse the established anchor (see §Visual consistency across shots below for principles, model ref for flag-level details).
- **If the user's feedback is ambiguous** ("it doesn't feel right") — ask what specifically to change before regenerating.
- **If the same text-prompt adjustment has failed twice** — stop adjusting text. Switch to reference images, or switch to an edit path (`omni` `continueFrom` for in-place changes, seedance `refVideos` for re-generation).
- Each new generation restarts the loop at Step 1 — realign if scope shifted.
- `submit_video` reports the omni edit round; when it warns about chain depth, relay the suggestion to the user instead of silently continuing.

## Visual consistency across shots

Text alone cannot reliably maintain visual identity across shots; visual references constrain output far more precisely than words.

### Anchors: the cornerstone of consistency

An **anchor** is a reference image or video pinned across every shot that shares the same character, object, or style. Any multi-shot sequence with recurring visual elements needs an anchor — don't try to reproduce them from text.

### Sourcing an anchor

Have reference awareness. When the user's request involves a recurring character / object / scene, think about what anchor to use **before** writing prompts:

- **Check the project first.** What has the user already provided or approved? Uploaded images, previously generated and approved shots, or earlier project assets can all serve as anchors.
- **Match the user's intent.** If the user pointed to a specific asset ("use this photo", "像上一段那样"), use that. If they described a character only in words, no anchor exists yet and one must be established.
- **When in doubt, ask the user.** Don't guess which asset to pin, and don't silently generate a new anchor when the user may already have one in mind.

### Establishing a new anchor (with user consent)

When no existing asset fits and one must be generated, propose it to the user first — it costs credits and shapes every downstream shot. Model-specific paths — see the chosen model's ref.

### Using the anchor

- Pass the anchor in **every shot** that shares the character / object / style. The specific flag(s) to use depend on the model — see the model's ref.
- Describe the anchor by appearance in the prompt, not by name: "The BLACK RACING CAR with chrome exhaust" constrains far more than "Fleetmaster". When role confusion is likely, add explicit negations: "The motorcycle does NOT transform."
- Refer to the anchor with `@Image1` / `@Video1` in the prompt — not vague phrases like "the same car as before".
- When a shot depends on a previous generation, check it with `track_progress` in a later turn until it is terminal, then use its `outputAssetId` as the anchor reference. `track_progress` is an immediate status read; `action=wait` is only a compatibility alias and does not block. Do not submit dependent shots in parallel.

### Multi-character projects

When a project has multiple named characters with distinct attributes (e.g. Faz with fire energy, Kev with ice energy), treat each character as a **separate anchor** — one reference asset per character. In every prompt:

- Name the **active** character and attach their distinctive attributes ("Kev has **blue ice** electric energy").
- Add explicit negations for the others to prevent attribute leakage ("NOT red fire energy, NOT Faz's look").
- Pin the correct character's anchor (model-specific flag — see model ref). Do not reuse another character's anchor by accident.

Missing either explicit attribution or negation causes cross-character attribute mixing.

**Multiple characters in the same frame.** For shots where multiple characters appear together (especially facing the camera), the model is prone to face-swap or body-clipping. Add **strong positional + outfit anchors** to each character and prefer a **fixed camera** for that shot:

- "the character on the LEFT wears a grey-blue tactical jacket, short beard, silver earring"
- "the character on the RIGHT wears a red cape with gold trim, long braided hair"
- "fixed camera, medium shot, both characters clearly separated"

Positional words (left / right / foreground / background) + distinctive outfit colors give the model enough signal to keep the characters apart.

### Escalate when text adjustments fail

If a visual-identity issue (wrong character, drift, color mismatch) persists after **two text-prompt adjustments** on the same shot, stop adjusting text. Text is not a substitute for an anchor. Escalate to:

- Adding or switching the anchor.
- Edit mode where the model supports it (see model ref for how to invoke).

Do **not** submit a third text-only retry on the same consistency issue.

### When to skip anchoring

Simple, one-off, or exploratory requests do not need anchors — generate directly.

## Run

```ts
// Text-to-video (Seedance 2.5 default)
submit_video({
  model: "seedance-2-5",
  prompt: "A cat walks across a sunny windowsill",
  name: "Cat on windowsill",
});

// Image-to-video with Seedance 2.5 — pass the project asset id directly
submit_video({
  model: "seedance-2-5",
  prompt: "The scene comes to life, gentle breeze rustles the curtains",
  firstFrame: "abc12345",
  name: "Living room animation",
});

// Kling text-to-video — only after Model Selection check
submit_video({
  model: "kling",
  prompt: "A sports car drifts around a wet corner",
  name: "Car drift shot",
});
```

After submission, return the `jobId` and end the turn by default. Call `track_progress` only when the user later asks for status or a dependent step needs the completed asset. Use `action=status`; it returns immediately, so follow its later check-back guidance and do not loop or expect `action=wait` to block.

## Config Mode

For complex multimodal jobs, build the full args object up front and pass it in a single call:

```ts
submit_video({
  model: "seedance-2-5",
  prompt: "...",
  name: "...",
  refImages: ["def67890", "ghi24680"],
  refVideos: ["abc99999"],
  refAudios: ["jkl55555"],
  durationSeconds: 8,
  ratio: "9:16",
});
```

## Rules

- Always provide `name` with a descriptive asset name.
- Default to submit-only. End your turn after submitting unless a follow-up task is queued.
- Do not try to manage jobs through `submit_video` — status and later check-backs belong to `track_progress`.
- Generation costs credits. Before submitting, briefly tell the user what you're about to generate.

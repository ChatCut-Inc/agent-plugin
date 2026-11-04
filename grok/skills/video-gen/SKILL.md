---
name: video-gen
description: AI video generation via Seedance, Gemini Omni, MiniMax H3, MiniMax H3 Max, Kling 3.0, and Kling 4.0. Use when the user wants to generate a video clip — text-to-video, image-to-video, first/last-frame transitions, reference-guided generation — or wants to modify / edit / extend an existing generated clip.
---

# Video Gen

Submits one video generation job per call and returns a `jobId`. Job status and later check-backs belong to `track_progress`; this skill does **not** place videos on the timeline automatically.

## When to Use

Any time the user wants to generate a video clip — text-to-video, image-to-video, first-last-frame transition, reference-based generation, or generatively editing / extending an existing video (producing new generated footage based on a source clip; not timeline trimming).

## Models

| Model            | Reference                                                    | Strengths                                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seedance-2-5`   | [references/seedance25.md](references/seedance25.md)         | First choice. 4-30s, up to 50 multimodal references, audio-only reference, timestamp control, and mp4/mov output. Strongest Seedance choice for new generation, edit, and extend. Its 480p clips are drafts that can become a matching 1080p final. |
| `seedance2`      | [references/seedance2.md](references/seedance2.md)           | Seedance 2.0 full model. 4-15s, rich multimodal references, and up to native 4K output (10-bit HEVC). An explicit ratio center-crops a first/last frame to that ratio.                                                                              |
| `seedance2fast`  | [references/seedance2.md](references/seedance2.md)           | Seedance 2.0 Fast — **same inputs and 4-15s range as `seedance2`, returns in minutes instead of ~ten, ~20% cheaper, capped at 720p**. Use when the user is iterating and turnaround matters more than peak fidelity.                                |
| `seedance2mini`  | [references/seedance2.md](references/seedance2.md)           | Seedance 2.0 mini — **same inputs and 4-15s range as `seedance2`, ~50% cheaper, capped at 720p**. Use for cheap test runs and high-volume batches where the full model's fidelity isn't required; a later full-model run will not reproduce it.     |
| `minimax-h3`     | [references/minimax-h3.md](references/minimax-h3.md)         | MiniMax H3. 4-15s, 768p/2k, first/last frames, and up to 9 image + 3 video + 3 audio references (12 total). Strong multimodal reference following.                                                                                                  |
| `minimax-h3-max` | [references/minimax-h3-max.md](references/minimax-h3-max.md) | MiniMax H3 Max, the faster H3 variant. 5-15s, 480p/768p, first/last frames or the same references as H3. No 2K output.                                                                                                                              |
| `omni`           | [references/omni.md](references/omni.md)                     | Gemini Omni 1.1 Flash. Targeted edits/extensions via `continueFrom`, first/last frames, and cheap 360p drafts. 3-10s; 720p default, upscaled 1080p/4k.                                                                                              |
| `kling`          | [references/kling.md](references/kling.md)                   | Kling 3.0. 3-15s, 720p/1080p, 16:9/9:16/1:1. First/last frames and reference images in one request (7 images in all). No video or audio references.                                                                                                 |
| `kling-4`        | [references/kling-4.md](references/kling-4.md)               | Kling 4.0. Up to 30s in one clip, 720p/1080p, adds 21:9. Frames plus up to 10 images and 5 reference videos, addressed by name in the prompt (`@image_1`, `@video_1`).                                                                              |

**IMPORTANT:** Before generating, READ the chosen model's reference for capabilities, input channels, modes, prompt structure, and model-specific behavior.

## Model Selection

**For a new generation**, `seedance-2-5` is the **first choice**. Only switch when one of:

- **User explicitly named an available model** ("用 Omni", "use H3", "用 mini", "用可灵") — switch, no need to re-ask. Kling or 可灵 without a version means `kling-4`; "Kling 3.0" means `kling`.
- **User explicitly asks for MiniMax H3 or needs combined image/video/audio reference guidance with optional 2K output** — use `minimax-h3`.
- **User explicitly asks for MiniMax H3 Max, or wants a faster or cheaper 480p MiniMax draft** — use `minimax-h3-max`.
- **User wants a cheap preview before paying for the final** — on `seedance-2-5`, offer a 480p clip: every 2.5 480p clip is a draft priced like any 480p clip; after the user approves it, `fromDraft` renders the 1080p final with the same prompt, references, duration, ratio and audio. The final is 1080p only, drafts expire after 7 days, and the final is close to the draft but not frame-identical. To change the shot, make a new 480p clip. If the user only needs 720p, one normal 720p clip costs less than draft plus final. For targeted edits of an existing clip, `omni` 360p drafts remain an option.
- **User needs Seedance output at 1080p** — prefer `seedance-2-5`; it and full `seedance2` support 1080p. For long or costly 1080p clips, mention the draft option with both prices in the confirmation; never switch to a 480p draft without the user choosing it.
- **User asks for 4K** — use full `seedance2` with `resolution:"4k"`; it is the only native 4K model in ChatCut (`seedance-2-5` offers up to 1080p, `seedance2fast` and `seedance2mini` up to 720p). 4K is 10-bit HEVC, costs about 2x 1080p, and takes noticeably longer (several minutes for a short clip); say so in the confirmation. `omni` 4k is upscaled, not native detail. Do not switch models silently.
- **User wants the next shot to start where a clip ends** — on Seedance, set `returnLastFrame:true` on the clip and pass the returned last-frame image (the provider's unwatermarked frame at the clip's resolution) as the next clip's `firstFrame`, without extracting a frame. Skip it for one-off clips.
- **User wants Seedance's 2.0 inputs cheaply, or many clips at once, and is fine with 720p** — propose `seedance2mini` (4-15s, ~50% of the 2.0 full-model cost) and confirm before submitting.
- **User is iterating on 2.0-style output and cares about turnaround** — propose `seedance2fast` (480p or 720p, 4-15s, ~80% of the 2.0 full-model cost, returns much sooner) and confirm before submitting.

Otherwise stay on `seedance-2-5`.

**For revising a clip that already exists**, the choice is made in Step 4 — not here. A revision request is not a reason to change the first choice for future fresh generations. Omni 1.1 replaces the previous Omni choice; keep the `omni` alias and do not invent a second legacy choice.

Access note: video generation costs credits. For ordinary beta/production accounts, Seedance, Omni and Kling also require the payer to have an eligible paid subscription; a credit-pack purchase alone does not unlock those routes. MiniMax currently uses credit checks without that subscription feature gate. Do not describe MiniMax as free or switch models to bypass an access error. If the user asks for a free path, offer Motion Graphic animation.

When a generation tool returns `FEATURE_NOT_INCLUDED` for a `generation.*` feature, use its payer and access details. If the project owner needs Pro, explain that the owner pays and must upgrade; the member's own Pro does not unlock the project. Do not give the member a personal upgrade link or send them to their own billing menu. They can find the owner in the project's existing members view when available. Otherwise share the returned upgrade link, or ChatCut’s avatar menu → Upgrade. Existing credits are preserved and generation still consumes credits after upgrading. This rejection does not charge for generation; existing agent conversation fees are separate, so do not claim the whole conversation was free. Preserve the exact original tool input and project, then stop. Do not automatically search for or substitute stock media; offer alternatives only if the user explicitly asks.

When the user returns with “continue”, “继续”, “jixu”, or says they upgraded, recheck current payer eligibility and credits for the original input with `estimate_generation` when supported, otherwise the original tool’s precheck. If there is no separate precheck, one retry of the original tool lets its server check current access. If eligible, submit the original input once; if still blocked, explain the current blocker and stop. Do not ask the user to choose between the original generation and stock media again or state the old rejection as current status without checking. If a job was already accepted, track it instead of submitting again. Never switch generation tools, providers or services to bypass a gate.

## Tool Params

Call `submit_video` with the model chosen above set explicitly. Its description and schema own the parameter names, allowed values, defaults and limits; per-model fields (e.g. Seedance references, Omni `continueFrom`) are in the model's reference.

## Input Resolution

`firstFrame` / `lastFrame` / `refImages` / `refVideos` / `refAudios` accept project asset references or public HTTPS/`s3://` resource URLs. Prefer a full UUID or short prefix from `browse_assets` for existing assets; `asset://<id>` and same-project asset URLs returned by asset tools are also accepted. Per-slot type: frame slots and `refImages` → image; `refVideos` → video; `refAudios` → audio. `continueFrom` also accepts a public video resource.

Pass public resources directly in the appropriate slot, including URLs resolved from skill/catalog references. ChatCut validates and measures them in managed generation storage without creating library assets. ChatCut downloads URL references up to 5 MiB for images and 50 MiB for video/audio; the model's own limits in its reference still apply. Do not download or import a resource merely for generation. Private S3 objects, base64 and workspace paths are not URL references.

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

See the chosen model's reference for prompt structure and param combinations (e.g., Seedance's 8-element structure and modes). Before submitting, check:

- `name` is a **descriptive** asset name — descriptive enough for the user (and you in later turns) to recognize this asset in the project library. Avoid vague names like "Untitled" or "clip 1".
- Param combination matches the user's intent — see the **Modes** section in the model's reference.
- Generated video audio is not a tool parameter. Seedance is submitted with audio enabled by the backend.
- On validation failure, read the error and fix the inputs — **do not blindly retry the same invalid arguments**.

### Step 3 — Submit one, wait, confirm

**Submit one generation job at a time.** Unless the user asked for multiple clips in parallel, directly or by approving a plan that names them (such as several takes of one prompt), do not submit the next clip until the current one completes and the user has reviewed it. Parallel submission hides problems: if the first shot has drift or wrong framing, the user would rather redo it once than have several misaligned shots to discard.

- `submit_video.ratio` controls the generated asset only; it does not change the project timeline canvas. If the user requested a final output aspect ratio (for example "9:16 vertical" or "16:9 landscape"), set the timeline canvas to the same ratio with `manage_timelines` action=update (e.g. ratio:"9:16") before placing the completed asset. If the user asked for no black bars / full-bleed, pass `fit:"cover"` when setting the canvas or updating/adding the visual item.
- Do not use this skill for job management — use `track_progress` for an immediate status read and follow its later check-back guidance.
- After submitting, end your turn (tell the user the job was created) unless a follow-up task is already queued.
- When the job finishes, surface the result to the user for review before proceeding to the next shot.
- For Omni source edits, follow the first/middle/end frame review in its reference before claiming the requested change succeeded.
- Model-specific failure handling — see the model's reference.

### Step 4 — Iterate

When the user wants a next clip, a revision, or a continuation, first decide what the existing clip **is** in the next call:

| The existing clip is…                                                                          | Path                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **The thing being modified** — a targeted change; preservation is not pixel-exact              | `omni` + `continueFrom`                                      |
| **A source to re-generate from** — new motion / camera, whole-clip style shift, extend, bridge | `seedance-2-5` + `refVideos`; set `taskMode` for edit/extend |
| **Not reusable** — the intent changed                                                          | regenerate, restart at Step 1                                |

**A localized change defaults to `omni` + `continueFrom`.** For an explicitly chosen Omni continuation use `taskMode:"extend"` + `continueFrom`; for transitions between two images use `firstFrame` + `lastFrame`. Keep Seedance 2.5 as the general edit/extend path otherwise. Do not wait for the user to say "keep everything else" — "把气球改成黄色" / "remove the text in the corner" already means it. Route to `seedance-2-5` only when the change genuinely needs re-inference (motion, camera, duration, whole-clip style), not because Seedance is more familiar.

`omni` source edits/extensions require a project video of up to 10 seconds. For longer sources use `seedance-2-5 + refVideos` or ask to trim first. This integration is stateless: do not promise the upstream 40-second multi-turn workflow.

**No generative edit is lossless.** Omni 1.1 supports upscaled 1080p/4k, but higher resolution does not guarantee detail or unchanged pixels. Review the result before replacing a timeline item; the original asset remains available.

Then apply the standing rules:

- **If it's the next shot in a multi-shot sequence** — reuse the established anchor (see §Visual consistency across shots below for principles, model ref for flag-level details).
- **If the user's feedback is ambiguous** ("it doesn't feel right") — ask what specifically to change before regenerating.
- **If the same text-prompt adjustment has failed twice** — stop adjusting text. Switch to reference images, or switch to an edit path (`omni` `continueFrom` for targeted changes, seedance `refVideos` for re-generation).
- Each new generation restarts the loop at Step 1 — realign if scope shifted.
- `submit_video` reports the omni edit round; when it warns about chain depth, relay the suggestion to the user instead of silently continuing.

## Visual consistency across shots

Text alone cannot reliably maintain visual identity across shots; visual references constrain output far more precisely than words.

### Anchors: the cornerstone of consistency

An **anchor** is a reference image or video pinned across every shot that shares the same character, object, or style. Any multi-shot sequence with recurring visual elements needs an anchor — don't try to reproduce them from text.

### Sourcing an anchor

Have reference awareness. When the user's request involves a recurring character / object / scene, think about what anchor to use **before** writing prompts:

- **Check the project first.** What has the user already provided or approved? Uploaded images, previously generated and approved shots, or earlier project assets can all serve as anchors.
- **Saved characters and products.** When the user names or attaches a character or product listed in `<assets>`, call `manage_character` / `manage_product` `action="get"` and pin its photo URLs as the anchor; a product's saved voice and video reference clips go in as `refAudios` / `refVideos` when the shot needs them. Do not ask the user to upload any of it again.
- **Match the user's intent.** If the user pointed to a specific asset ("use this photo", "像上一段那样"), use that. If they described a character only in words, no anchor exists yet and one must be established.
- **When in doubt, ask the user.** Don't guess which asset to pin, and don't silently generate a new anchor when the user may already have one in mind.

### Establishing a new anchor (with user consent)

When no existing asset fits and one must be generated, propose it to the user first — it costs credits and shapes every downstream shot. Model-specific paths — see the chosen model's ref.

### Using the anchor

- Pass the anchor in **every shot** that shares the character / object / style. The specific flag(s) to use depend on the model — see the model's ref.
- Describe the anchor by appearance in the prompt, not by name: "The BLACK RACING CAR with chrome exhaust" constrains far more than "Fleetmaster". When role confusion is likely, add explicit negations: "The motorcycle does NOT transform."
- Refer to the anchor with `@Image1` / `@Video1` in the prompt — not vague phrases like "the same car as before".
- When a shot depends on a previous generation, wait for it with `track_progress` `action=wait` and do what its result says (an automatic follow-up turn where supported, otherwise later check-backs) until it is terminal, then use its `outputAssetId` as the anchor reference. Neither action blocks. Do not submit dependent shots in parallel.

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
// Text-to-video (Seedance 2.5)
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
```

After submission, return the `jobId` and end the turn by default. Call `track_progress` only when the user asks for status (`action=status`) or a dependent step needs the completed asset (`action=wait`, then do what its result says). Both return immediately; do not loop.

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

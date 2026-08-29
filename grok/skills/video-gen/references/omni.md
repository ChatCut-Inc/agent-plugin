# Gemini Omni (`model: "omni"`)

Read this document before generating or editing videos with `model: "omni"` on `submit_video`.

We expose **Gemini Omni Flash** (`gemini-omni-flash-preview`). Refer to it as "Gemini Omni" with the user.

## Positioning

Omni is an **editing and drafting layer, not a finishing model**. Single-pass generation quality is below Seedance 2; its value is convergence: it is the only model that **modifies an existing clip in place** — everything the prompt doesn't mention is preserved (verified: a color-change edit kept position, rigging, highlights, and background pixel-stable).

Use it when:

- The user wants a **localized change** to an existing generated clip ("把气球改成黄色", "remove the logo", "make it sunset") — this is the default edit path, see SKILL Step 4.
- The user wants a **fast, cheap draft** they expect to revise before committing to a Seedance/Kling finish.

Do not use it when:

- The clip must be **1080p** (Omni outputs 720p only) → `kling` `mode:"pro"`.
- The clip must be **longer than 10s** → `seedance-2-5`, `seedance2`, or `kling`.
- The change is an **extend or bridge** → a Seedance model + `refVideos` (Omni does not support extension or interpolation).
- The frame must show **Chinese (or other CJK) text** — see §Text rendering below.

## Modes

| Inputs                      | Mode               | What happens                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prompt` only               | generate           | Fresh text-to-video clip.                                                                                                                                                                                                                                                                                                            |
| `prompt` + `firstFrame`     | image-to-video     | The image becomes the opening frame; the prompt describes the motion. Output ratio still follows `ratio` (verified in probing).                                                                                                                                                                                                      |
| `prompt` + `refImages` (≤3) | reference-to-video | Subject references: the prompt refers to them as Image 1..N and describes a NEW scene incorporating those subjects (verified in probing). Images only, cannot combine with `firstFrame` or `continueFrom`. This is the only multi-image mode — a desired closing composition is described in the prompt, not pinned as a last frame. |
| `prompt` + `continueFrom`   | edit               | The referenced clip is modified per the prompt; unmentioned content is preserved. Output is a **new asset**; the source stays in the library.                                                                                                                                                                                        |

Input modes are mutually exclusive — pick ONE of `refImages` / `firstFrame` / `continueFrom`. `lastFrame` is rejected: Omni has no end keyframe (no interpolation), so express any target composition through `refImages` + prompt. `refVideos` / `refAudios` are rejected too — video and audio references belong to Seedance.

## Params & limits

| Param                                              | Omni behavior                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `durationSeconds`                                  | 3–10. **A target, not a guarantee** — Omni has no duration parameter; the tool injects the target into the prompt (in probing this was followed to within a frame). Ignored for edits, which inherit the source length. Do not repeat the duration in your own prompt text. |
| `ratio`                                            | `16:9` or `9:16` only. No 1:1, no adaptive. Ignored for edits (inherits source).                                                                                                                                                                                            |
| `resolution`                                       | Omit it. Output is always 720p; passing `1080p` errors.                                                                                                                                                                                                                     |
| `firstFrame`                                       | Image asset ref used as the opening frame (image-to-video). Cannot combine with `refImages` or `continueFrom`.                                                                                                                                                              |
| `refImages`                                        | Up to 3 subject references (reference-to-video). Cannot combine with `firstFrame` or `continueFrom`.                                                                                                                                                                        |
| `continueFrom`                                     | Video asset ref of the clip to modify. Source must be ≤10s.                                                                                                                                                                                                                 |
| `mode` / `shotType` / `multiPrompts` / `lastFrame` | Not supported. `mode` / `shotType` / `multiPrompts` are Kling-only; `lastFrame` is rejected (no end keyframe / interpolation).                                                                                                                                              |

Billing: charged on **actual generated duration** (provider-reported), not the requested target. At ~0.4 credits/second it is the cheapest of the three models per second — but every edit round is a full re-generation at full price, so a long edit chain costs more than one Kling finish. Surface this when a user keeps iterating.

## Prompt tips

- **Write prompts in English.** Google has only evaluated English; other languages are explicitly unevaluated.
- **No negative prompts and no `Avoid:` blocks** — the API rejects negative prompting concepts. State what you want positively: instead of "no camera shake", write "locked-off static camera".
- Camera and motion are steered through natural language: "handheld shot", "continuous smooth shot, no scene cuts", "single unbroken take".
- Timing can use bracketed time codes: `[0-3s] the balloon rises, [3-6s] it drifts out of frame`.
- Keep tracked subjects to **3 or fewer** — reviews report merging and drift beyond that.
- For **edits**: describe only the change, plainly ("Make the balloon yellow"). Adding "keep everything else exactly the same" is a useful anchor on later rounds of a chain, but unnecessary on round 1.

## Editing chains

Each edit takes the previous output as input, so quality loss can compound:

- `submit_video` reports the **edit round** for every `continueFrom` call.
- When the tool warns about chain depth (round 4+), relay it: suggest regenerating fresh from a description of the current version, or add an explicit "keep everything else exactly the same" anchor to this round's prompt.
- Every version is a separate asset — the user can always fall back to an earlier round from the library.

## Text rendering

- **Do not use Omni when the frame must display Chinese text.** High-stroke-density characters (面, 鬱, 藏…) render as malformed glyphs consistently; Japanese kana mostly fails too. Use a Motion Graphic overlay for CJK text, or another model.
- Latin text is generally usable but still weaker than an MG overlay — prefer overlays for anything that must be pixel-crisp.

## Limitations

- **10s hard cap** on both generated clips and edit sources.
- **720p / 24fps only.**
- **No extend, no bridge, no first/last-frame interpolation.**
- **No audio input**; generated clips do include native audio (music / SFX steered by prompt). Voice editing is not supported — an edit cannot change what is spoken.
- Lip-sync on talking shots degrades after ~6–7s; multi-speaker same-frame shots are weak. Long talking-head content belongs on other models.
- Content policy is stricter than the other models and boundaries are unpredictable (brand names and age-editing of people are known blocks). If a prompt is refused, rephrase away from brands/real people rather than retrying verbatim.
- All output carries an invisible SynthID watermark.
- Generation is synchronous and typically returns in well under a minute; if `track_progress` shows the job failed with a provider policy message, surface it to the user as-is.

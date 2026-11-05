
### A-roll / transcript-based editing workflow

Use this flow for any A-roll task driven by transcript meaning.

If the user asks to preview the whole requested edit before it is applied, do not run `clean_script` first because it writes immediately and has no preview parameter. Call `read_script({ showSilence: true })`, stage fixed-filler strikes, semantic edits, and pause edits together in `timeline.md`, then call `apply_script({ preview: true })`. Encode pause compression as `[silence=Xs→Ys]` with the Unicode `→`; a bare change to `[silence=Ys]` is not the cross-surface rewrite syntax and Web will not apply it as compression. When a struck filler has retained silence on both sides, deleting it joins those durations: a 250ms cap is their combined retained total, not 250ms per side. For example, left `0.48s→0.25s` plus an unchanged right `0.13s` yields `0.38s`; allocate the two sides to total `0.25s` instead of expecting the planner to infer a global cap. If preview validates and the request already authorizes application, immediately call `apply_script` again without preview; do not ask for another confirmation. If the user explicitly requested preview only, stop after the preview.

For edits that may be applied immediately, use the following flow:

1. Start with orientation. Call `read_script`, then read `timeline.md` once to understand the user's goal, the content structure, and whether fixed fillers or long pauses are present. If you will run `clean_script`, do not build the full semantic edit from this pre-clean read.
2. Outside the preview-first path above, run the mechanical cleanup pass before semantic editing when fixed fillers or long pauses are present. Do not use this step for context-dependent fillers, retakes, repeated sentences, or anything that needs meaning.
3. After `clean_script`, always read the refreshed clean `timeline.md` before semantic editing. Use this refreshed file as the source of truth; previously read text may be stale. Then edit with semantic judgment: choose the best retake, clean false starts, remove repeated or failed attempts, preserve useful setup and context, reorder content when needed, and keep the speech natural. Use the current filesystem tool schema: batch related exact replacements if `Edit` exposes an `edits` array; otherwise use its supported exact-replacement fields and check validation after each edit. Inline strikethrough removes spoken words; never remove unstruck source words or correct ASR in `timeline.md`.
4. Validation runs after each filesystem edit. If diagnostics are returned, the changed `timeline.md` remains current: read it and fix forward with `Edit`. Only after validation passes, immediately apply the semantic edit with `apply_script` before starting another global pass.
5. Read the regenerated clean result and check what the viewer will actually hear: broken logic, missing context, over-deletion, missed cleanup, wrong order, or pauses that feel too tight or too long. Fix clear problems only.

`[sN]` rows are ASR segments, not semantic units. A complete sentence, idea, retake, or transition may span several `[sN]` rows, and one `[sN]` row may contain only part of a sentence. Before deciding what to delete or keep, mentally reconstruct the complete spoken sentence or idea across adjacent rows.

---

## MG Overlay

### Goal

Motion graphics layered into A-roll reinforce what the speaker is conveying — deepening the audience's impression of the key points and helping them grasp content that's hard to land through speech alone. Complete A-roll editing first; MG timing is based on the post-edit timeline.

This section only adds talking-head timing, frame-composition, subject/caption protection, and review constraints. For visual style alignment, MG creation or authoring, implementation constraints, editable properties, asset sizing, and verification, use the active Motion Graphics skill/workflow available in the current ChatCut environment.

### MG workflow

For talking-head MG work, treat the video as one edited piece, not as isolated graphics.

When talking-head Motion Graphics is selected, including a plan-only or handoff-analysis request, first activate the Motion Graphics Skill available on the current surface: call `Skill` with `skill: "motion-graphic-gen"` when that generator Skill is available; on Antigravity, where it is intentionally absent, call `Skill` with `skill: "create-motion-graphics"` instead. Then read `references/motion-graphics.md` from this skill's base directory completely before planning, generating, placing, or reviewing MG. This talking-head guide supplies the scene-specific editorial context but does not replace the active Motion Graphics Skill.

---

## B-roll

For B-roll, read `references/b-roll.md` from this skill's base directory completely before sourcing, choosing, placing, or reviewing it.

---

## Multicam (multiple camera angles of the same take)

For Multicam, read `references/multicam.md` from this skill's base directory completely before aligning or switching multiple camera angles of the same take.

---

## Track roles (turn on auto-ducking)

For Track roles, read `references/audio-and-music.md` from this skill's base directory completely before assigning audio roles or changing ducking behavior.

---

## Background Music

For Background Music, read `references/audio-and-music.md` from this skill's base directory completely before adding or fitting it.

---

## Captions

For Captions, read `references/captions.md` from this skill's base directory completely before editing them.

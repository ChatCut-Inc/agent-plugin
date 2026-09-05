---
name: talking-head-guide
description: |
  Guide for editing speech-led videos where spoken delivery or conversation drives the cut — single-speaker talking-head / 口播, two- or multi-speaker interview / 访谈, video podcast, lecture, tutorial, course, and similar formats. Use for any non-trivial edit of those formats, including speech cleanup (剪口播 / 口播剪辑 / 去口癖 / clean up fillers / smooth speech), pause or repeated-take removal, motion graphics layered onto the footage (口播加 MG / 加动画), B-roll (加 B-roll / add B-roll), music, or captions. For motion graphics specifically, use this together with the active Motion Graphics skill/workflow available in the current ChatCut environment — this skill adds speech-specific guidance (rhythm-aware timing, frame-aware placement, subject/caption protection, placement verification).
user-invocable: true
---

# Speech-Led Video Editing (Talking Head, Interview, Podcast)

## What this skill covers

**Required input**: an existing speech-led source registered or imported into the project — for example a single-speaker talking-head / 口播, a two- or multi-speaker interview / 访谈, a video podcast, lecture, tutorial, or course. For transcript-based A-roll editing, follow `asset-import`, then start as soon as the transcript is ready. If the user wants to start without source footage (e.g., generate a fresh talking-head from scratch), this skill doesn't apply.

### When source media is missing

- **GitHub Copilot CLI:** The user may attach the source to the conversation,
  provide a readable local path, or upload it directly in ChatCut. Use
  `asset-import` when an attachment or local path still needs to be imported.
  For an editor upload, continue from the registered project asset without
  importing it again.

If this workflow creates, targets, or opens a ChatCut project for the user,
surface the returned live editor URL before starting nontrivial edits and again
before final delivery if the visible editor no longer matches the project. Open
the exact handoff URL only when a connected browser-control capability is
already available; otherwise provide the clean editor link.

Independent treatments that can be applied to speech-led videos. Pick the ones that match what the user wants — not all are needed every time.

- **A-roll editing** (中文称 **语音剪辑** / 含 **去口癖、停顿、重复**) — transcript-based speech editing. Common operations include cleanup, highlight extraction, restructure, opening hook, and others as needed for the aligned outcome.
- **Motion graphics overlay** (英文展示给用户时写全称 **Motion Graphics**，不要缩成 "MG"；中文产品术语固定为 **MG 动画**——不要叫"动效""字幕条""动态字幕"等其它说法) — reinforce key information, structured content, and topic transitions with on-screen motion graphics
- **B-roll** (industry term — keep as "B-roll" in any language, do not translate) — cover jump cuts or visualize what's being said
- **Background music** (中文 **背景音乐**) — set mood and smooth micro-gaps
- **Captions** (中文 **字幕**) — on-screen text for accessibility
- **AI Voice Isolation** (中文 **AI 人声隔离**) — clean or isolate spoken human voice with DeepFilterNet3, picture untouched. See the `voice-isolation` skill.

> 用户语言为中文时，在 widget options / choices options / 对话文案里**严格使用上面括号里的产品术语**——别自己再翻译一遍，会跟产品其它地方对不上。

## What shapes the edit

Beyond picking treatments, a talking-head edit is shaped by several orthogonal variables. When the user's ask is vague, these are what's worth clarifying first:

- **Target** — platform (YouTube / TikTok / Shorts / ...), desired length, aspect ratio
- **Which treatments to apply** — the treatments above are optional; don't assume all of them apply
- **Pacing / tone** — tight / energetic / formal / casual; brand or voice preferences if stated. (For MG visual style, follow the active Motion Graphics skill/workflow.)

When more than one of these variables is missing, ask with one form after loading `widget-forms`. Do not ask markdown numbered questions and then append `<choices/>` for only one part of the same intake.

## Order of execution

When multiple treatments have been aligned with the user, they depend on each other and must be finalized in dependency order. This section is **only relevant after alignment** — it doesn't tell you what to start with on a fresh request.

The speech timing (set by A-roll editing) anchors everything downstream — MG placement, B-roll cut-covers, music duration, and caption sync all reference the final speech timeline.

So: finalize A-roll editing before committing any visual, audio, or text layer. Don't write captions against pre-edit speech, don't cut music to pre-edit length, don't place MG against timing that will shift.

Once the cut structure is final, run `smooth_audio` once as the last audio step — it micro-crossfades every hard audio cut and fades exposed edges so edits don't pop. Run it after `apply_script`/`clean_script` restructuring (reflow drops transitions); it's idempotent, so re-run it if the timeline changes again.

**You must confirm the result with the user after each major step before starting the next**, unless the user has explicitly asked to run end-to-end without stopping. Key checkpoints when multiple treatments apply: after A-roll editing finalizes the speech timing; before MG generation (confirm style and direction, and, when it isn't obvious, whether it sits over the video as an overlay or takes the whole frame); after MG generation; same pattern for B-roll, music, and captions. **Don't bundle multiple checkpoints into one response — confirm each step separately.** An upstream mistake forces redoing everything downstream (e.g., MG placed against pre-cleanup timing wastes generation credits when the timeline shifts).

---

## A-roll editing

### Scenario

In a talking-head workflow, the first step is usually A-roll editing: editing the original spoken footage.

A-roll edits are ultimately applied to the timeline and change what the viewer actually hears and sees. However, the editing decisions should usually start from the transcript, because the core question is: what spoken content should the viewer hear, and what should be removed, compressed, or reordered?

### Common A-roll tasks

A-roll editing is not only cleanup. First decide what spoken-content task the user is asking for, then choose the editing strategy and tools.

Common tasks:

- **Cleanup** — remove mistakes, repeated attempts, verbal habits, filler words, and meaningless pauses so the speech becomes clearer and more natural.
- **Highlight extraction** — pull the most valuable, opinionated, emotional, or topic-relevant moments from longer footage.
- **Restructure** — reorder spoken content, such as moving the conclusion earlier, grouping by topic, or combining scattered parts into a clearer structure.
- **Hook / short version** — use a strong claim, result, conflict, or question from the source as the opening, or compress long content into a shorter version.
- **Target-script / script alignment** — match, keep, and reorder spoken content according to a user-provided target script, target paragraph, or desired content.

Cleanup is the most common task and the one most likely to fail from bad boundary decisions. It is described in detail below. Other tasks get shorter rules, but still follow the shared A-roll principles: complete meaning, clear boundaries, and natural listening flow.

### Shared A-roll principles

These principles apply to all A-roll tasks, not only cleanup.

- **Decide the task before choosing the tool.** Do not let tool availability change the editing strategy.
- **Edit by complete semantic units.** Whenever possible, move/delete/keep complete sentences, complete ideas, complete answers, or complete steps. Do not cut out a half-sentence just because a few words match.
- **When the task names what to keep, trim to that boundary.** The inverse of the rule above, for any task that specifies which content to keep — restoring a specific sentence, matching a target script, pulling a named highlight, building a version: keep exactly the requested span. Trim the kept range to start and end at the requested words and drop the off-script head/tail of the source `[sN]` segment it sits in; keeping a whole segment for one requested sentence is over-keeping that drags in unrequested speech. This applies only when the task names what to keep — never to open-ended cleanup, where you keep complete units (above).
- **Do not stitch unfinished fragments across retakes.** Do not combine incomplete pieces from different attempts into one artificial sentence. This does not make the earlier attempt disposable: keep a complete useful lead-in, setup, contrast, category, evaluation, or context if it is not repeated later and can naturally connect to the later complete retake.
- **Preserve connective tissue.** List labels, contrast words, subjects, verbs, and adjacent source words are not filler when removing them makes a kept idea ungrammatical, abrupt, or misleading. Trim the smallest span that keeps the line speakable.
- **Keep listening flow natural.** The result should still have natural phrasing and breathing room. Do not make sentences feel glued together just to make them "clean."
- **Be conservative when boundaries are uncertain.** If unsure whether a cut harms meaning, logic, or listening flow, keep it or make a smaller cut.
- **Confirm complex changes first.** For complex restructuring, aggressive shortening, structural changes, or generated hooks, confirm target length, structure direction, and what to preserve with the user before editing.
- **Explain content, never indices.** You MUST NOT explain edits to the user with internal addresses such as `[sN]`, `[cN]`, `[gap]`, word indices, clip ids, or segment ids. The user cannot see those addresses and will not understand what they mean. Use the actual spoken content, a short quote, or a plain-language description of the edit.
- **Never name a screen position for a panel.** When you invite the user to review or fine-tune the result, call it "the Transcript panel" (中文「文字稿面板」) — never a direction (left / right / side / 左侧 / 右侧). The layout is rearrangeable and the panel does not sit in a fixed corner.

### Cleanup goals and decisions

#### What good cleanup means

Good cleanup does not mean making the video as short as possible, and it does not mean rewriting the speaker into a different script.

Good cleanup means:

- The logic stays coherent
- The expression becomes clearer
- The audio feels natural
- Obvious mistakes, repeated attempts, meaningless stalls, and filler are removed
- The speaker's intent, tone, and natural rhythm are preserved

Bad cleanup usually falls into two failure modes:

- Under-cleaning: obvious mistakes, repetition, long pauses, or filler remain.
- Over-cleaning: sentences are cut off, meaning is missing, rhythm becomes too hard, or the result sounds stitched together.

Default principle: remove defects without changing meaning; make speech smoother, not harder; prefer small local cuts over whole-sentence or whole-segment deletion; when unsure whether a cut harms meaning, keep it.

#### How to judge common cleanup cases

Below are the common cleanup categories and how to make editing decisions for each.

##### Meaningless filler words

Fillers fall into two categories.

The first category is clearly meaningless hesitation sounds. These are usually safe to remove:

- `um`
- `uh`
- `er`
- `ah`
- `呃`
- `额`
- `えー` / `えーと` / `えっと`
- `あー`
- `んー`

When they do not carry special meaning, use `clean_script` first for bulk cleanup.

The second category depends on context and must not be removed by word list alone:

- `so`
- `like`
- `然后`
- `就是`
- `嗯`
- `啊`
- `那个`
- `那`
- `对`
- `所以`
- `但是`
- `あの` / `あのー`
- `その` / `そのー`
- `まあ`
- `なんか`
- `ちょっと`
- `で`
- `うーん`
- `やっぱり`

How to decide:

- If the word is only hesitation or padding, remove it.
- If it carries sequence, continuation, contrast, cause, reference, response, emphasis, or natural tone, keep it.
- If removing it makes the surrounding words sound hard-spliced, keep it or only compress the pause.
- If unsure, keep it.

Examples:

- `um, I think this solves the main problem` -> remove `um`.
- `It works like a checklist` -> keep `like`; it is a comparison.
- `The upload failed, so we retried it` -> keep `so`; it carries cause/result.
- `right after the call, send the recap` -> keep `right`; it modifies timing.
- `然后我们再看第二点` -> keep `然后`; it marks sequence.
- `えーと、次のポイントです` -> remove `えーと`; it is pure hesitation.
- `あの人が言っていた通りです` -> keep `あの`; it is a demonstrative, not hesitation.
- `あの、ちょっと待ってください` -> remove the leading `あの`; it is hesitation here.
- `まあ、悪くないと思います` -> keep `まあ`; it softens the judgement and carries tone.
- `なんか違和感がある` -> keep `なんか`; it means "somehow" here, not padding.

##### Retakes and repeated attempts

A retake is when the speaker retries the same intended idea because they misspoke, got stuck, forgot words, or restarted. Retake cleanup is not "delete repeated text." The goal is to keep one complete, natural, logically coherent version of the intended idea.

Use this decision path:

1. Decide whether it is really a retake.
   Treat it as a retake only when multiple attempts are trying to say the same intended idea. Do not treat it as a normal retake when the repetition is intentional emphasis, a rhetorical beat, a structural marker, or a second pass that adds new information or tone.
2. Define the complete version to keep.
   A complete version may include more than the main content sentence. It may need a lead-in, connector, section marker, topic setup, contrast, qualifier, subject, object, or conclusion. These are not filler when the kept content depends on them.
3. Cut only the failed or covered part.
   Remove only words that are wrong, dangling, abandoned, or fully covered by the kept version. The cut boundary starts at the repeated or failed idea, not automatically at the earlier transition, setup, or continuous speech. If earlier speech contains useful context that the kept version does not repeat, keep it.
4. Choose the best complete attempt.
   If several attempts are complete, usually prefer the later one because it is often closer to the speaker's intended take. But do not choose the last attempt mechanically. If the later attempt is missing needed context, structure, subject, object, or conclusion, keep the more complete version or preserve the missing lead-in from the earlier attempt.

A repeated lead-in is redundant only when another equivalent lead-in remains naturally connected to the kept content. If removing every copy makes the result lose structure or sound abrupt, keep one natural copy and remove only the extra restarts. Do not stitch unfinished fragments from different attempts into one artificial sentence.

Examples are patterns, not a closed list:

- Local false start inside a kept sentence:
  `There, there's no After Effects, no Premiere, no DaVinci Resolve learning.`
  Keep the complete sentence, but remove the abandoned restart:
  `There's no After Effects, no Premiere, no DaVinci Resolve learning.`
  Do not keep the stray first word just because the full sentence is otherwise useful.
- Repeated structural lead-in:
  `And secondly, ... and secondly, we're introducing a brand new UI.`
  Remove the extra restart, but keep one natural lead-in attached to the kept content:
  `And secondly, we're introducing a brand new UI.`
  Do not delete every structural marker and leave only:
  `We're introducing a brand new UI.`
- Useful setup before a failed ending:
  `Then the next one is different from comedy. It is popular on Disney Plus. It is called...`
  Later retake:
  `It is a popular Disney Plus show called Love Story.`
  Keep useful setup that the later retake does not repeat, and cut from the failure point:
  `Then the next one is different from comedy. It is a popular Disney Plus show called Love Story.`

##### False starts and unfinished fragments

Use `false starts / unfinished fragments` for this category. `False start` is the more natural editing/transcription term for a speaker beginning a phrase and then restarting or abandoning it; `unfinished fragment` makes the dangling half-sentence case explicit.

Only remove a fragment when it clearly does not form useful information.

Safe to remove:

- The speaker abandons the thought and a complete version appears later.
- The segment is only a dangling phrase, such as "this is actually..." with no completion.
- It is clearly the leftover beginning of a failed attempt.

Do not remove:

- A sentence that is imperfect but contains useful information.
- A lead-in that provides the subject, object, or context needed later.
- Content that provides setup, contrast, conclusion, emotion, or tone.

If only part of a sentence or segment is wrong, do not delete the useful content around it. Remove only the bad word, phrase, or pause; if a local cut cannot sound natural, keep the segment.

##### Pauses and breaths

Pause cleanup should default to compression, not zeroing out. Spoken video needs natural breathing room.

Default rules:

- Obvious long pauses over 0.8-1s: usually compress to about 0.3s.
- Between sentences: keep about 0.3-0.5s so listeners can hear natural phrasing.
- Around topic shifts, contrast, or emphasis: keep slightly longer pauses when needed; do not make the delivery too rushed.
- Short breaths inside one sentence: if they are normal breathing, do not remove them.
- Clear long pauses inside one sentence: compress them, but not so tightly that adjacent words sound glued together.
- Long pauses before a retake: if the failed attempts around it are removed, remove the pause with them.
- If the user provides explicit thresholds, follow them. For example, if the user says "only process pauses over 0.8s and keep at least 0.3s", do not process natural pauses under 0.8s.

### Other A-roll task guidance

Load only the reference for the branch the user selected. Do not preload references for unrequested treatments; default cleanup requires no reference.

For A-roll editing scenarios other than cleanup — including highlight extraction, restructure, hook / short version, target-script / script alignment, or building versions, highlights, and excerpts — read `<this-skill-dir>/references/other-a-roll-editing-scenarios.md` completely before planning or editing that A-roll branch.

### A-roll / transcript-based editing workflow

Use this flow for any A-roll task driven by transcript meaning.

1. Start with orientation. Call `read_script`, then read `timeline.md` once to understand the user's goal, the content structure, and whether fixed fillers or long pauses are present. If you will run `clean_script`, do not build the full semantic edit from this pre-clean read.
2. For cleanup tasks, run the mechanical cleanup pass before semantic editing when fixed fillers or long pauses are present. Do not use this step for context-dependent fillers, retakes, repeated sentences, or anything that needs meaning.
3. After `clean_script`, always read the refreshed clean `timeline.md` before semantic editing. Use this refreshed file as the source of truth; previously read text may be stale. Then edit with semantic judgment: choose the best retake, clean false starts, remove repeated or failed attempts, preserve useful setup and context, reorder content when needed, and keep the speech natural. For long transcripts, work one clear section at a time if that improves judgment accuracy.
4. Apply the semantic edit with `apply_script`.
5. Read the regenerated clean result and check what the viewer will actually hear: broken logic, missing context, over-deletion, missed cleanup, wrong order, or pauses that feel too tight or too long. Fix clear problems only.

`[sN]` rows are ASR segments, not semantic units. A complete sentence, idea, retake, or transition may span several `[sN]` rows, and one `[sN]` row may contain only part of a sentence. Before deciding what to delete or keep, mentally reconstruct the complete spoken sentence or idea across adjacent rows.

---

## MG Overlay

### Goal

Motion graphics layered into A-roll reinforce what the speaker is conveying — deepening the audience's impression of the key points and helping them grasp content that's hard to land through speech alone. Complete A-roll editing first; MG timing is based on the post-edit timeline.

This section only adds talking-head timing, frame-composition, subject/caption protection, and review constraints. For visual style alignment, MG creation or authoring, implementation constraints, editable properties, asset sizing, and verification, use the active Motion Graphics skill/workflow available in the current ChatCut environment.

### MG workflow

For talking-head MG work, treat the video as one edited piece, not as isolated graphics.

When talking-head Motion Graphics is selected, including a plan-only or
handoff-analysis request, first load the `create-motion-graphics` skill. Then
read `<this-skill-dir>/references/motion-graphics.md` completely before
planning, generating, placing, or reviewing MG. This talking-head guide
supplies the scene-specific editorial context but does not replace the active
Motion Graphics skill.

---

## B-roll

For B-roll, read `<this-skill-dir>/references/b-roll.md` completely before sourcing, choosing, placing, or reviewing it.

---

## Multicam (multiple camera angles of the same take)

For Multicam, read `<this-skill-dir>/references/multicam.md` completely before aligning or switching multiple camera angles of the same take.

---

## Track roles (turn on auto-ducking)

For Track roles, read `<this-skill-dir>/references/audio-and-music.md` completely before assigning audio roles or changing ducking behavior.

---

## Background Music

For Background Music, read `<this-skill-dir>/references/audio-and-music.md` completely before adding or fitting it.

---

## Captions

For Captions, read `<this-skill-dir>/references/captions.md` completely before editing them.

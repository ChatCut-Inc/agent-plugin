# Seedance 2.5

Read this document before generating with `model: "seedance-2-5"`, the default for `submit_video`.

## Capabilities

- Duration: 4-30 integer seconds via `durationSeconds` (default 5).
- Resolution: 480p, 720p (default), or 1080p. Ark encodes 1080p output as 10-bit H.265/HEVC.
- Ratio: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9`, or adaptive for locked frame/edit/extend tasks.
- Output: defaults to mp4 for generate tasks and MOV for edit/extend tasks when `outputFormat` is omitted.
- Audio generation is always enabled. Control dialogue, music, ambience, and silence in the prompt.
- Native prompt/audio output languages include Chinese, English, Spanish, Indonesian, Malay, Thai, Arabic, Portuguese, Vietnamese, Japanese, and Korean.

## Inputs

| Channel           | Tool param   |                   Limit |
| ----------------- | ------------ | ----------------------: |
| Exact first frame | `firstFrame` |                       1 |
| Exact last frame  | `lastFrame`  | 1, requires first frame |
| Reference images  | `refImages`  |                      30 |
| Reference videos  | `refVideos`  |                      10 |
| Reference audios  | `refAudios`  |                      10 |

Video references must each be 2-30s and total at most 30s. Audio references must each be 2-30s and total at most 30s. The tool validates counts; check source durations before submitting when metadata is available.

Seedance 2.5 supports audio-only reference generation. A visual reference is not required when `refAudios` is the only input.

Frame mode and reference mode remain mutually exclusive. Do not combine `firstFrame`/`lastFrame` with any `refImages`/`refVideos`/`refAudios`.

Every media input must be a project asset ref from `read_project`, `asset://<id>`, or a same-project asset URL. Import external media first. Refer to inputs explicitly as `@Image1`, `@Video1`, and `@Audio1`, then immediately identify what each reference controls.

## Task Modes

The request shape and prompt determine the task:

| Intent               | Inputs                                      | Required controls                           |
| -------------------- | ------------------------------------------- | ------------------------------------------- |
| Text generation      | prompt only                                 | chosen ratio and 4-30s duration             |
| Reference generation | any reference arrays                        | chosen ratio and 4-30s duration             |
| First frame          | `firstFrame`                                | ratio becomes adaptive; 4-30s               |
| First/last frame     | both frame params                           | ratio becomes adaptive; 4-30s               |
| Video edit           | source in `refVideos`, `taskMode: "edit"`   | source duration is inherited; output is new |
| Video extend         | source in `refVideos`, `taskMode: "extend"` | set extension duration; output is new       |

The upstream model classifies edit and extend intent from the prompt. Use explicit wording such as "Edit @Video1...", "Replace...", "Remove...", "Extend @Video1 forward...", or "Continue @Video1...". Do not accidentally use edit/extend language for a semantic reference-only request.

For edits, Seedance locks ratio and duration to the source. `submit_video` sends `ratio: "adaptive"` and `duration: -1`; edit sources must be 4-30s. For extensions it sends adaptive ratio and the requested `durationSeconds`. Both paths default to MOV and always create a new generated asset; the original is unchanged.

## Prompt Rewriting Contract

This reference is for rewriting a user's request into one clean, directly submittable Seedance prompt. It does not choose tool parameters, inspect media, import assets, or submit a generation. Preserve the user's intended people and count, key props, setting, causal event order, spatial relationships, edit target, extension direction, and final state. Do not turn visible reference details into unprovided facts about identity, age, occupation, relationships, or story.

Keep submission parameters separate from the rewritten prompt. Do not write duration, ratio, resolution, frame rate, output format, model name, API settings, or audio-enable settings into the prompt. User-supplied timestamp ranges are creative direction and should be retained when they are explicit; do not invent numeric timestamps merely to fill the requested duration. When no timestamps are supplied, use ordered stages for longer stories instead.

Produce one best prompt by default, without analysis, headings outside the prompt, code fences, change explanations, or invented reference labels. Preserve existing reference labels exactly, such as `@Image1`, `@Video1`, and `@Audio1`. If a requested reference is unavailable, omit its label from the prompt, retain only the text-confirmed responsibility, and optionally give one short note outside the prompt explaining what is missing.

For every reference that is actually used, state its narrow role. A reference image can define a person, product, prop, setting, lighting, or key state; a reference video can define action, camera movement, rhythm, timeline, or an edit/extension source; an audio reference can define voice, dialogue, ambience, sound effects, or music. Do not implicitly inherit every property from a reference. When a video supplies only motion, explicitly exclude its identity, clothing, or setting as needed. Do not force unrelated references into the prompt.

When the complete input list is known, list each unused reference in an `Unused references:` block and state that it does not control people, settings, props, action, camera, or sound. Use one clear mapping per named person, group, prop, and setting. Do not map one single-person image to multiple simultaneously visible named people unless the image itself clearly contains that group.

## Rewriting Rules By Mode

### Generate

For text-only generation, state the subject, setting, main event, visible style or mood when requested, camera, and sound only when relevant. For reference generation, write the reference roles first, then the subject relationships, event sequence, and continuity requirements. Convert abstract claims or emotions into observable actions, expressions, sounds, or results when precise control is needed. Keep dialogue verbatim when provided; do not invent missing lines. Identify the speaker, language only when specified, and whether other people remain naturally silent. Use `{dialogue}` for spoken lines, `()` for music, and `<>` for sound effects when distinction is useful. State `no subtitles` only when the user requests no generated text.

For product or process prompts, express each step as initial state, one concrete operation, and observable end state. For transfers, pickups, or placements, state the single item's ownership after each change. Anchor spatial relationships to stable objects such as a counter, table, doorway, or vehicle rather than relying only on screen-left or screen-right.

### Edit

Treat `@Video1` as the sole edit master. State the exact object, region, or sound to change; the requested replacement, removal, or adjustment; and what remains unchanged. Preserve the source scene, camera, movement, timing, occlusion, event order, and all unspecified visible elements. For a moving-subject replacement, require the new subject to occupy the original subject's appearance time, movement path, speed, and occlusion positions, and state that the original no longer appears. Do not rewrite an edit as a new generation.

For sound-only edits, retain the source picture, actions, lip-sync timing, camera, cuts, and all unspecified sounds. Name the modified speaker or sound class and the retained sounds separately.

### Extend

State whether the extension is forward or backward. A forward extension starts from the source video's final frame; a backward extension ends at its first frame. Describe the boundary continuity for pose and orientation, props, setting, composition, lighting, sound state, and motion trend before adding new action. Never alter the original video content. Keep each continuing person or object as one continuous instance: do not duplicate, split, or change its body or part count.

### Keyframes And Storyboards

For first-frame mode, write `@Image1 is the exact first frame.` and separately state the composition, subject positions, poses, props, setting, and camera direction it defines. For first-and-last-frame mode, write `@Image2 is the exact last frame.` with the same separate definition, then describe one continuous progression between the two states. Other references may define appearance or materials but must not override either boundary frame.

When multiple images define ordered key states, name their sequence and describe the observable state each image controls; treat them as semantic anchors, not pixel-perfect holds. For storyboard grids, state the reading order, the shot sequence to adopt, and any sketch style, labels, arrows, or placeholder figures to ignore. For blockout videos, explicitly say whether the video supplies only motion, staging, camera, and timing, or also supplies full structure; exclude construction marks, placeholder materials, and guides from the result.

## Fidelity And Continuity Rules

Treat the user text as the story contract. Do not change the number or identity of people, critical props, ownership, relationships, setting, sequence of causes and effects, or ending. A reference may supply directly visible or audible characteristics, such as hairstyle, clothing, product material, room layout, movement, camera motion, rhythm, vocal quality, or ambience. It must not override text-defined names, relationships, ages, occupations, motivations, or plot facts.

Maintain a private checklist of every required person, group, prop, setting, sound source, and final state before writing. Each named entity must appear in the prompt with one unambiguous responsibility. Keep distinct named people separate: do not merge them, exchange their appearance, dialogue, clothing, props, actions, or positions. When an object is unique, state its count and final holder or location. When a spatial relation matters, express it relative to a stable object and retain orientation across scenes.

Turn internal or abstract direction into observable screen behavior only to the degree needed for control. For example, describe the trigger, a gaze shift, a hand stopping, a breath, posture, expression, action, or spoken line rather than adding new backstory. If a reaction is caused by something visible, show the trigger before the reaction, or establish their relationship with a clear eyeline or camera move. Do not turn a performance of injury, a near miss, or a simulated event into an actual injury or event.

Use camera terms only when they improve the requested result. Name the camera's subject, starting state, direction, and ending state rather than adding unsupported technical settings. Expand uncommon or ambiguous terms into visible effects: identify what stays sharp, what blurs, which direction the camera or subject moves, and how foreground and background change. Do not convert a shot number, reference number, chapter number, or step number into a camera angle.

Keep sound sources distinct. State whether each audio element is spoken dialogue, voice quality, ambience, sound effect, or music. For a multi-person conversation, bind each line to its speaker and state that non-speakers remain naturally silent when necessary. Do not invent dialogue, an accent, a dialect, narration, lip movement, music, subtitles, signage, or voice-over unless requested. Do not promise exact rendering of small text, formulas, labels, signs, or frame-accurate timing through prompt wording alone.

## Story And Timing Rewrites

For a brief request, preserve a simple continuous action rather than padding it with extra shots, characters, or events. For a long story, choose the requested scene, trailer, overview, or causal arc. If the scope is not specified, keep one complete main event rather than attempting every subplot. Compress repeated description and nonvisual exposition, while retaining relationships, trigger events, critical dialogue, and the final state.

Organize longer prompts into sequential stages. Each stage should contain one major state change, a readable cause or action, and an observable ending that the next stage inherits. Use explicit timestamp ranges only when the user supplied timing or explicitly asks for timed control. Those ranges must be continuous, non-overlapping integer-second ranges and should describe event budgets rather than exact edit points. If externally provided duration differs from the user's creative timeline, preserve event order, relative pace, and final outcome; use untimed stages instead of fabricating new timestamps.

When more duration is available than the story requires, expand existing actions with natural preparation, eye-lines, pauses, reactions, or transitions. Do not fill time with repetitive action, empty shots, a new character, a new plot event, or a changed conclusion. Prefer the following state-based form:

```text
Stage 1: Start with <visible initial state>. <One concrete action or event>. End with <observable state>.
Stage 2: Continue from <prior state>. <One concrete action or event>. End with <observable state>.
Stage 3: <Closing action or event>. End with <final visible state>.
```

## Directly Submittable Rewrite Patterns

Use only the sections needed by the request. Replace every placeholder; do not leave instructions or template syntax in the final prompt.

### Text Or Reference Generation

```text
Goal: <one clear video event and outcome>.

Reference roles:
@Image1 defines <one person, product, prop, setting, lighting, or key state>; do not use <unwanted properties>.
@Video1 defines <action, camera motion, rhythm, or timeline>; do not use <unwanted identity, clothing, or setting>.
@Audio1 defines <speaker or sound source>'s <voice, dialogue, ambience, sound effect, or music>.

Subjects and relationships:
<Person A> uses @Image1 for <specific visible attributes>.
<Prop A> belongs to <Person A>; there is only one <Prop A>.
<Person A> stands <stable spatial relationship>; <Person B> stands <stable spatial relationship>.

Event:
Start: <initial visible state>.
<Continuous main action with causal order>.
End: <final positions, prop ownership, and image state>.

Continuity:
Keep <identity, count, visible attributes, prop ownership, setting layout, camera axis, and sound relationships> consistent.
```

### Video Edit

```text
Edit @Video1. It is the sole edit master and supplies the original setting, camera, camera movement, action timing, occlusion, and event order.

Change only <specific object, person, region, or sound> to <requested result>.
@Image1 defines only <replacement subject or object attributes>; do not use <unwanted image content>.

<Replacement subject> occupies the original subject's appearance times, movement path, speed, and occlusion positions. The original <subject> no longer appears.
All other visible people, props, background elements, actions, camera movement, cuts, and event order in @Video1 remain unchanged.
```

For a local visual edit, identify the boundary of the changed region and explicitly preserve neighboring objects. For a background change, state that only the area outside the retained subject silhouettes changes. For an addition or removal, state the count, position, appearance time, and affected area. Do not use an edit prompt to redesign the source timeline.

### Sound-Only Video Edit

```text
Edit @Video1 only for sound. Keep its picture, subject actions, lip-sync timing, camera, cuts, and event order unchanged.

Change <named speaker or sound category> during <scope> by <removing, replacing, or adjusting it>.
@Audio1 supplies only <voice quality, dialogue, ambience, sound effect, or music>.
Keep <all other dialogue, ambience, action sounds, and music> unchanged.
```

### Forward Or Backward Extension

```text
@Video1 is the source video.

Extend @Video1 <forward/backward>.
<For forward: The new first image continues @Video1's final frame.>
<For backward: The new final image naturally reaches @Video1's first frame.>
Maintain <pose and orientation, prop positions, setting layout, composition, lighting, sound state, and motion trend> at the boundary.

Then <new action outside the source video's existing content>.
End with <observable result>.

Keep <identity, clothing, unique props, setting layout, camera axis, and existing sound environment> continuous. Every continuing person and object remains one continuous instance without duplication, splitting, or changes to its part count.
```

### First And Last Frame Progression

```text
@Image1 is the exact first frame.
It defines <opening composition, subject positions, poses, props, setting, and camera direction>.
@Image2 is the exact last frame.
It defines <closing composition, subject positions, poses, props, setting, and camera direction>.
@Image3 defines only <specific appearance, material, prop, or setting attributes>; it does not override the first or last frame.

Start exactly from @Image1's state, then <continuous action and causal progression>, and naturally arrive at @Image2's state.
Keep <identity, count, prop ownership, setting layout, and camera direction> continuous between the boundary states.
```

## Final Prompt Checklist

- One primary task only: generate, edit, or extend. Split an explicit edit-then-extend request into two ordered prompts, with the edited output used as the second prompt's source.
- Submission parameters remain outside the prompt, including duration, ratio, resolution, frame rate, output format, model name, and API configuration.
- Every user-provided fact about identity, count, relationship, setting, causality, prop ownership, and ending is preserved.
- Every used reference has one narrow stated role; no unavailable or invented label appears.
- Reference-derived observations are not elevated into unprovided story facts.
- Distinct people, groups, props, and sound sources retain distinct mappings and do not swap roles.
- Long sequences preserve cause and effect, continuity between stages, and visible ending states without invented timestamps.
- Edits name the sole source master, exact change scope, retained content, and source-timeline inheritance.
- Extensions name the direction, boundary-frame continuity, new material only, and single-instance continuity.
- Keyframes, storyboards, and blockouts have explicit roles and excluded nonfinal artifacts.
- Dialogue, music, ambience, effects, subtitles, and silence appear only when requested and remain assigned to the correct source or speaker.
- The final output is a single clean prompt without meta-commentary, analysis, parameter instructions, or unrequested generic constraints.

## Prompt Structure

Write as a director, not as a keyword list:

1. Map every input to its role.
2. Give a one-sentence subject + setting + event + style overview.
3. Describe the sequence with integer-second timestamps for longer clips.
4. Specify shot size, camera movement, action, performance, lighting, dialogue, music, and sound effects where they matter.
5. End with global continuity and negative constraints.

Use continuous timestamp ranges without gaps, for example `0-5s`, `5-12s`, `12-20s`. Do not overpack a time range; the model will omit or over-cut impossible action density.

For many references, list mappings before the narrative:

```text
References: @Image1 is the hero product; @Video1 supplies camera motion only; @Audio1 supplies rhythm and vocal tone.
0-6s: ...
6-14s: ...
14-20s: ...
No subtitles. Keep the product geometry and label unchanged throughout.
```

Negative audio instructions are supported: "no BGM", "ambient sound only", "no dialogue", or "no sound". Say "no subtitles" when generated text is unwanted.

## Consistency

- Reuse the same image anchors across every shot that shares a person, product, or scene.
- Carry the latest approved video in `refVideos` when motion/style continuity matters.
- Explain what to copy from each reference; do not ask the model to copy every property unless that is intended.
- After two text-only retries for identity drift, stop and add or replace a visual anchor.

## Content Review

Raw references containing real people may be rejected. Prefer authorized portrait assets or eligible trusted outputs. If content review rejects an input, surface the failure and ask for a different/authorized reference; do not blindly retry the same media.

## Example

```ts
submit_video({
  model: "seedance-2-5",
  name: "Twenty-second launch film",
  durationSeconds: 20,
  ratio: "16:9",
  resolution: "720p",
  refImages: ["product-image-id"],
  refAudios: ["soundtrack-id"],
  prompt:
    "References: @Image1 is the exact hero product; @Audio1 controls rhythm. 0-6s: macro reveal... 6-14s: orbit... 14-20s: final packshot. Preserve product geometry and label. No subtitles.",
});
```

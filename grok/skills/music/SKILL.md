---
name: music
description: Shared ChatCut entry point for newly generated music, soundtrack, theme music, 配乐, background music, an intro theme, a music bed, BGM, or vocal songs. Infer backing music from the brief; ask only about material ambiguity. Use `submit_music` for either branch, with `generationType` selecting instrumental or song mode.
---

# Music

Use `submit_music` to create a new instrumental background-music or vocal-song audio asset. For an explicit sung song, lyrics-to-song request, or vocal MV song, read [`references/song.md`](references/song.md) for the lyric workflow, then call `submit_music` with `generationType:"song"`. Infer instrumental backing music from a supporting role, the brief and the surrounding edit; ask about vocals only when the unresolved choice materially changes the user's goal.

The tool submits one generation job and returns a `jobId`. The generated audio asset is available after `track_progress` reports completion.

## Capability Boundary

`submit_music` creates a new original music asset. ChatCut does not expose Mureka's editing, extension, remix or stem-separation features, so it cannot change existing audio. The output length cannot be set; trim or loop it on the timeline. Sung songs support Chinese, English, Japanese, Korean, Portuguese, Spanish, German, French, Italian and Russian lyrics.

Mureka also cannot guarantee exact beat, drop, lyric, or timestamp alignment. Generate the music asset first, then use timeline tools for placement, trimming, looping, fades, and ducking. If the user requires precise beat-level sync, explain that this must be handled as a timeline/audio edit rather than guaranteed by the generation model.

When a generation tool returns `FEATURE_NOT_INCLUDED` for a `generation.*` feature, use its payer and access details. If the project owner needs Pro, explain that the owner pays and must upgrade; the member's own Pro does not unlock the project. Do not give the member a personal upgrade link or send them to their own billing menu. They can find the owner in the project's existing members view when available. Otherwise share the returned upgrade link, or ChatCut’s avatar menu → Upgrade. Existing credits are preserved and generation still consumes credits after upgrading. This rejection does not charge for generation; existing agent conversation fees are separate, so do not claim the whole conversation was free. Preserve the exact original tool input and project, then stop. Do not automatically search for or substitute stock media; offer alternatives only if the user explicitly asks.

When the user returns with “continue”, “继续”, “jixu”, or says they upgraded, recheck current payer eligibility and credits for the original input with `estimate_generation` when supported, otherwise the original tool’s precheck. If there is no separate precheck, one retry of the original tool lets its server check current access. If eligible, submit the original input once; if still blocked, explain the current blocker and stop. Do not ask the user to choose between the original generation and stock media again or state the old rejection as current status without checking. If a job was already accepted, track it instead of submitting again. Never switch generation tools, providers or services to bypass a gate.

## Workflow

1. Infer the music role from the brief and existing edit. Use instrumental
   backing music for an ordinary supporting score; use song mode for requested
   singing or lyrics. Ask only about material ambiguity that the context cannot
   resolve. Include the selected mode in the paid scope before submission.
2. For explicit instrumental, BGM, music-bed, or no-vocals requests, write a
   concise prompt describing style, energy, instrumentation, mood, tempo, and
   edit role, then call `submit_music` with `generationType:"instrumental"`.
3. For explicit singing, lyrics-to-song, or vocal-MV requests, read
   [`references/song.md`](references/song.md), resolve lyrics and creative
   direction there, then call `submit_music` with `generationType:"song"`.
4. Provide a short descriptive `name` when useful.
5. Use `track_progress` if the next edit needs the completed asset.
6. Place, trim, loop, or duck the audio with timeline tools after the asset
   exists.

## Tool Input Shape

`submit_music` accepts:

- `generationType` — `instrumental` (default) for no-vocals BGM, or `song` for
  an original vocal song;
- `prompt` — required for instrumental mode and optional music/vocal direction
  for song mode; maximum 1,024 characters;
- `lyrics` — required for song mode and invalid for instrumental mode; maximum
  5,000 characters;
- `gender` — optional `female` or `male` preference for song mode only;
- `name` — optional descriptive asset name.

## Prompt Shape

For instrumental music, combine:

- genre or instrumentation: "minimal electronic", "warm acoustic guitar", "cinematic piano";
- energy: "upbeat", "calm", "tense", "confident";
- role: "under a product walkthrough", "intro sting", "background bed under speech";
- constraints: "not distracting", "no vocals", "short loop feel" when needed.

## Rules

- Never route an ordinary BGM request to vocal song generation, even if the
  prompt is stylistically ambiguous.
- Do not cover speech with loud music; lower volume or duck under narration.
- Do not call the generation path to remix, clean up, separate, or replace an
  existing copyrighted recording. The result is a new original asset.
- Submit one generation job by default. Do not create several variants in
  parallel unless the user explicitly asks for that.
- Do not promise exact lyric timing, beat alignment, or automatic MV assembly.

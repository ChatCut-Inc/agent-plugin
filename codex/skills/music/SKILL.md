---
name: music
description: |
  Shared ChatCut entry point for newly generated music, soundtrack, theme music, 配乐, background music, an intro theme, a music bed, BGM, or vocal songs. If vocals are unspecified, ask whether the user wants a vocal song or instrumental music before choosing a generator. Use `submit_music` for either branch, with `generationType` selecting instrumental or song mode.
user-invocable: true
---

# Music

Use `submit_music` to create a new instrumental background-music or vocal-song audio asset. For an explicit sung song, lyrics-to-song request, or vocal MV song, read [`references/song.md`](references/song.md) for the lyric workflow, then call `submit_music` with `generationType:"song"`. When a request only says music, soundtrack, theme music, or 配乐 and does not specify vocals, ask the user to choose vocals or instrumental first instead of assuming.

The tool submits one generation job and returns a `jobId`. The generated audio asset is available after `track_progress` reports completion.

## Capability Boundary

Mureka creates a new original music asset; it does not edit, clean up, remix, separate, or adjust existing audio.

Mureka also cannot guarantee exact beat, drop, lyric, or timestamp alignment. Generate the music asset first, then use timeline tools for placement, trimming, looping, fades, and ducking. If the user requires precise beat-level sync, explain that this must be handled as a timeline/audio edit rather than guaranteed by the generation model.

## Workflow

1. Treat the vocal choice as a required gate before asking about style, mood,
   duration, instruments, or any other creative detail. Words such as music,
   soundtrack, theme music, 配乐, "for this video", or "for an MV" do not
   resolve that choice. If the user has not explicitly chosen vocals or
   instrumental music, reply only with the equivalent binary question in the
   user's conversation language. For Chinese use "要带人声的歌曲，还是纯音乐/无
   人声配乐？"; for English use "Would you like a vocal song or instrumental,
   no-vocals backing music?" Do not spend credits or ask other questions in
   that turn.
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

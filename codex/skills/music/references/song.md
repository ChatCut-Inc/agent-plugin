# Vocal-song reference

Use this reference after the user has explicitly chosen a sung song, vocals,
lyrics-to-song, a theme song with words, or vocal music for an MV.

## Capability Boundary

Mureka song generation creates a new original vocal recording from lyrics and
optional music direction. It does not edit, clean up, remix, separate, or
continue an existing recording.

The model cannot guarantee exact lyric timestamps, beat/drop positions, or
alignment to an existing video. Generate the song first, then use timeline
tools for placement, trimming, fades, looping, and sync work.

## Song Workflow

1. Resolve lyrics before spending credits:
   - preserve user-supplied lyrics as-is unless the user asks for a rewrite;
   - when the user asks to write a song without lyrics, draft a compact original
     structure (`[Verse]`, `[Chorus]`, optional `[Bridge]`) and ask for approval;
   - skip that approval only when the user explicitly asks for an end-to-end
     run without review.
2. Decide only the creative details that materially affect the result:
   language, genre or mood, tempo, instrumentation, arrangement, singing style,
   and optional vocal gender. Use stated choices; do not imitate a named living
   artist.
3. Write a concise music direction in `prompt`, keeping the actual lyrics in
   `lyrics` and never duplicating them in `prompt`.
4. Call `submit_music` with `generationType:"song"`, `lyrics`, optional
   `prompt`, optional `gender`, and a descriptive `name`.
5. Use `track_progress` to wait for the generated audio asset when the next edit
   depends on it, then report it for a later MV workflow or place, trim, fade,
   and sync it with timeline tools.

## Song Input

- `lyrics` — required, non-empty lyrics, including optional structure markers;
  maximum 5,000 characters;
- `prompt` — optional music/vocal direction such as genre, mood, tempo,
  instrumentation, arrangement, and singing style; maximum 1,024 characters;
- `gender` — optional `female` or `male` preference, only when relevant to the
  user's request;
- `name` — optional descriptive asset name.

Good direction combines:

- genre or instrumentation: "indie pop with acoustic guitar and strings";
- energy and mood: "intimate verses, hopeful and expansive chorus";
- vocal delivery: "clear warm vocal, restrained in the verse, stronger in the chorus";
- tempo or role: "mid-tempo theme song for a cinematic MV".

Keep `[Verse]`, `[Chorus]`, and `[Bridge]` markers in `lyrics` when they help
the model understand song structure.

## Song Guardrails

- Never infer vocals from a generic request for "music", "soundtrack", "theme
  music", or 配乐; ask the vocal fork first.
- Do not call this path to remix, clean up, separate, or replace an existing
  copyrighted recording. The result is a new original asset.
- Do not copy lyrics from a named song when the user has not supplied them;
  offer original lyrics or ask the user to provide lyrics they are authorized to
  use.
- Submit one song job by default. Do not create several variants in parallel
  unless the user explicitly asks for that.
- Do not promise exact lyric timing, beat alignment, or automatic MV assembly.

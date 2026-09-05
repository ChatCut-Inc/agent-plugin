---
name: video-translation
description: |
  Translate, dub, and localize speech in an existing video while optionally
  preserving speaker voices, generating translated captions, or synchronizing
  the speaker's lip movements. Use when the user asks for 视频译制、多语言配音、
  把视频里的中文变成英文、让视频里的人说另一种语言、保留原音色、翻译声音、
  口型同步、translated video, video dubbing, voice translation, or lip-synced
  localization, as well as traducción de video, doblaje de video, traducir un
  video, or sincronización labial. This Skill MUST be loaded before composing
  treatment choices for an ambiguous video-translation request in any language,
  including a turn that only asks the user to choose a treatment. Do not use
  when the user only wants subtitles translated,
  wants an SRT/VTT file, wants text or a script translated before generating
  a new avatar video, or wants ordinary TTS with a newly selected voice.
user-invocable: true
---

# Video Translation

Create a new localized video asset from an existing project video. Treat
speech translation, dubbing, voice preservation, lip synchronization, captions,
quality, authorization, generation, and verification as one workflow.

Lip-synced translation starts with source-transcript review in an editable
ChatCut Widget. The recognized source wording is never treated as final until
the user has edited or approved that form and submitted it. Audio-only
translation keeps the existing direct-submit flow and skips this review.

## When to Use

Use this skill when the user wants an existing video to:

- Make its speakers speak another language.
- Produce a dubbed or localized version.
- Preserve the original speakers' vocal identity across languages.
- Synchronize visible mouth movements with translated speech.
- Translate only the spoken audio while keeping the original picture.
- Generate a translated video with optional translated captions.
- Create a language-specific version for another market.

Typical triggering requests include:

- "让视频里这个人说英语。"
- "把中文口播做成英文版，口型也对上。"
- "把这段采访译制成日语，保留每个人的声音。"
- "做一个西班牙语配音版。"
- "只把声音翻译成英语，画面不要变。"
- "把这个中文数字人成片改成英文。"

Route adjacent requests elsewhere:

- Only translate, add, edit, or export captions: use caption translation.
- Translate a script before generating a new avatar video: translate the text,
  then use the Digital Human Skill.
- Generate speech with a chosen replacement voice: use the Voice Skill.
- Transcribe spoken content without changing it: use the Transcription Skill.
- Edit pauses, mistakes, framing, or B-roll in talking-head footage: use the
  Talking Head Guide.
- Generate new footage rather than localize an existing video: use Video Gen.

Treat these requests as ambiguous:

- "把这个视频翻译成英文。"
- "帮我做一个英文版。"
- "中文改成英语。"
- "做一个海外版。"
- "把这个视频国际化一下。"

For an ambiguous request, ask one treatment question with text choices. Keep
the wording natural for the conversation, and include all applicable paths:

- Lip-sync translation: continue through the editable source-transcript review
  and submit with `audioOnly: false` or omit `audioOnly`.
- Audio-only translation: keep the existing direct-submit path and submit with
  `audioOnly: true`.
- Subtitle-only translation: use caption translation and do not submit a video
  translation job.

Keep user-facing terminology in one language. These are localized concept names,
not fixed full option sentences; descriptions may stay natural for the context:

| Conversation language | Lip-sync path                        | Audio-only path          | Subtitle-only path            |
| --------------------- | ------------------------------------ | ------------------------ | ----------------------------- |
| Chinese               | 口型同步翻译                         | 只翻译声音               | 只翻译字幕                    |
| English               | Lip-synced translation               | Audio-only translation   | Subtitle-only translation     |
| Spanish               | Traducción con sincronización labial | Traducción solo de audio | Traducción solo de subtítulos |

The target translation language does not control this copy; the user's
conversation language does. Never append a second-language gloss such as
`(lip-sync)` to a localized label.

Do not omit lip-sync when the source has a visible speaker. Do not relabel
audio-only translation as generic "AI voice replacement"; choosing a new
synthetic voice is a separate Voice Skill workflow. If the user already stated
one treatment, skip this question and follow that route directly.

Do not submit a paid video-translation job until changing the spoken audio is
explicitly requested or confirmed.

## Workflow

1. **Resolve the source video.** It must be an imported project video asset;
   use the exact asset id from the attachment, selection, or `browse_assets`.
   Local or external media must be imported first.
2. **Resolve the target language** as an English language name (for example
   "English", "Spanish", "Japanese"). Confirm it when the user only implied a
   market ("海外版") rather than a language.
3. **Pick the treatment:**
   - Lip-sync: `mode: "speed"` — translated dubbing that preserves
     the speakers' vocal identity, plus synchronized mouth movements. Continue
     through the source-transcript review below.
   - `audioOnly: true` — translate the audio only and keep the picture
     untouched. Use for screen recordings, voice-over footage, or when the user
     says the picture must not change. Prefer this for transparent WebM when
     preserving the alpha channel matters. **Skip steps 4–6 and keep the existing
     direct-submit flow; do not require or pass `reviewedSourceTranscript`.**
4. **Prepare the source transcript for lip-sync only.** If word-level
   transcription is not complete, call `trigger_transcript`, wait for it with
   `track_progress`, and retry only when it is ready. Call `read_script`, then
   read the matching `library/<filename>.md` source transcript. Do not use the
   editable `timeline.md` cut as the translation source. **Do not substitute
   `inspect_asset` transcript ranges for `read_script`; the range result may be
   partial and is not the canonical complete source transcript.**
5. **Render the editable source-text review for lip-sync only.** Load the
   `widget-forms` skill and use the same prefilled free-text confirmation
   pattern as the Digital Human skill. Strip the library's `[sN]` addresses and
   speaker-rendering rows, but keep **exactly one recognized transcript segment
   per line**, in source order. Put that complete text in the textarea's
   `default`; use a localized label that asks the user to check and correct the
   recognized original text. Do not expose segment ids, word indices, file
   syntax, or timestamps.

   Hard preflight before presenting the form:
   - The field id is exactly `reviewedSourceTranscript`.
   - The prefill attribute is exactly `default`, never `default-value`,
     `defaultValue`, `value`, or `placeholder`.
   - `default` contains the actual complete non-empty recognized transcript,
     not a placeholder or an omitted value. If the transcript text has not been
     read successfully, do not render the form; read the canonical library
     document first.
   - Preserve one recognized source segment per line. Verify that the first and
     last non-empty source segments are both present before sending the form.
   - Load `widget-forms` and use one required `ask_user` string field named
     `reviewedSourceTranscript`, prefilled with the complete recognized
     transcript. Do not add a separate yes/no question.
   - **Stop here and wait. Never submit a translation in the same turn that
     first presents the form.**

6. **Use the submitted revision exactly.** The form submission is explicit
   confirmation. Read the complete `reviewedSourceTranscript` textarea answer
   from the user's next message and preserve its wording, punctuation, and
   order exactly. Pass through the returned line breaks when present, but do
   not reject or rewrite normal line-break edits made inside the textarea; the
   tool realigns them to the source timing. Do not paraphrase the text and do
   not ask the user to confirm the same text again. If the user supplies further
   corrections, reopen the same form with those corrections applied.
7. **Duration behavior.** By default the output may run slightly longer or
   shorter than the source so the translated speech keeps a natural pace. Pass
   `keepDuration: true` only when the user needs the exact original length
   (for example to swap it into an existing timeline slot), and mention that
   pacing may sound faster.
8. **Submit** with `submit_video_translation`. For lip-sync, pass
   `reviewedSourceTranscript` as the exact complete textarea value returned in
   step 6; the tool combines those reviewed lines with the original segment
   timestamps and creates source subtitles. For `audioOnly: true`, omit
   `reviewedSourceTranscript` and preserve the pre-existing direct-submit path.
   The tool shows the user a paid confirmation before the job starts; do not
   resubmit after a denial.
9. **Track** with `track_progress(action="wait")` until the translated video
   asset lands in the library, then hand it back (place on the timeline only
   when asked).

## Constraints and cost

- The whole source video is translated and billed by its full duration. To
  localize only a section, trim/export that section into its own asset first,
  then translate the shorter asset.
- Optional translated captions: `enableCaption: true` burns subtitles into the
  output video.
- ChatCut always requests preservation of the source resolution and bitrate.
  This is best-effort for lip-sync because the picture is re-rendered. A
  transparent WebM may become opaque, and 4K or >30 fps media may be
  re-encoded. The tool confirmation calls these cases out; never promise that
  lip-sync will preserve the container, alpha channel, HDR, codec, bitrate, or
  frame rate exactly.
- When the picture must not be lip-synced, choose `audioOnly: true`; this avoids
  facial re-rendering and is the safest treatment for transparent sources, but
  do not promise byte-for-byte container preservation. After completion ChatCut
  compares the source and output resolution, frame rate, and alpha pixel format
  when media probing is available, and reports detected changes in generation
  status.
- Multiple speakers are supported; pass `speakerCount` when the user states it.
- For lip-sync, the editable review starts with one source segment per line so
  the submitted text can reuse the original word-level timing. Pass the complete
  Widget value directly to the tool; do not merge, split, reorder, or silently
  normalize it in the conversation layer. Do not invoke this review for
  `audioOnly: true`.
- Indicative cost: ≈ 8 credits per minute of source video.
- Speech is dubbed with voices matched to the original speakers; it is a
  translation of the recorded voice, so confirm the user has rights to the
  footage and its speakers when the material is clearly someone else's.
- Never reveal or discuss the underlying provider; present this as ChatCut's
  AI video translation.

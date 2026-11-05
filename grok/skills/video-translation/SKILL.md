---
name: video-translation
description: |
  Translate the original speech in an existing video into another language,
  with or without lip sync. Own all video-translation planning and review. Use for 视频翻译、
  视频译制、多语言配音、translated video or lip-synced localization. Includes
  source-language correction and optional target-language wording edits before
  generation. For wholly new scripts, voice and optional lipsync
  provide independently reviewable speech and duration; a new presenter performance uses digital-human.
  Subtitle-only translation is a separate workflow.
---

# Video Translation

## Scope and inputs

This skill owns every video-translation request, including translation without
mouth changes. Keep source review, translation decisions and final verification
here; `voice` and `lipsync` execute reusable stages rather than own translation.

When a generation tool returns `FEATURE_NOT_INCLUDED` for a `generation.*` feature, use its payer and access details. If the project owner needs Pro, explain that the owner pays and must upgrade; the member's own Pro does not unlock the project. Do not give the member a personal upgrade link or send them to their own billing menu. They can find the owner in the project's existing members view when available. Otherwise share the returned upgrade link, or ChatCut’s avatar menu → Upgrade. Existing credits are preserved and generation still consumes credits after upgrading. This rejection does not charge for generation; existing agent conversation fees are separate, so do not claim the whole conversation was free. Preserve the exact original tool input and project, then stop. Do not automatically search for or substitute stock media; offer alternatives only if the user explicitly asks.

When the user returns with “continue”, “继续”, “jixu”, or says they upgraded, recheck current payer eligibility and credits for the original input with `estimate_generation` when supported, otherwise the original tool’s precheck. If there is no separate precheck, one retry of the original tool lets its server check current access. If eligible, submit the original input once; if still blocked, explain the current blocker and stop. Do not ask the user to choose between the original generation and stock media again or state the old rejection as current status without checking. If a job was already accepted, track it instead of submitting again. Never switch generation tools, providers or services to bypass a gate.

## Capability model and planning

Plan from the requested content, picture preservation and mouth synchronization,
then account for explicit voice or preview preferences. These recommendations
explain useful starting points. Adapt them using the actual media, live tool
schema, availability and quotes; clarify unresolved choices that affect the result.

| Capability                            | Inputs, outputs and planning implications                                                                                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrated `video_translation`        | Existing video + target language → translated video with generated dubbing and optional mouth synchronization. Proofread provides editable text for review; generated speech is available in the rendered result. The integrated service creates the speech.            |
| Voice cloning and TTS through `voice` | Reference recording → reusable speaker identity; text + compatible voice → speech audio. A saved compatible clone can be reused. The generated audio provides the actual words, pronunciation, duration and pauses for audition and alignment with existing footage.    |
| `lipsync`                             | Existing video + final speech audio → video with mouth movements matched to that audio. The audio supplies the words and voice. Prepare suitable speech and video durations first, use the live tool's supported duration treatment, then inspect the resulting pacing. |

For translation with mouth synchronization, integrated translation is usually the
simplest plan: review text, then generate dubbing and mouth movement together.
For translation with unchanged picture, independent original-voice dubbing is
the default: it preserves the picture and generally costs less than integrated
video generation. Compare live quotes for the actual task. The integrated audio-only
option also produces a dubbed video retaining the picture; consider it when
explicitly requested or better suited to the known constraints. Use integrated
`prepare` for its text-review workflow; use the source transcript
and agent translation to prepare independent TTS.

When the user explicitly wants a specified voice, supported speech controls or
audition before video rendering, independent audio gives them control over that
stage. Generate and audition the actual speech, align it with the picture, then
reuse the approved final audio for `lipsync` if mouth changes are wanted. This
keeps the heard performance and the rendered performance tied to the same audio.
Select compatible voices and controls from the live tool's supported options.

For a wholly new script, `voice` lets the agent measure and adjust the changed
speech duration before optional mouth rendering. Supplied final audio can enter
alignment and placement directly. Subtitle-only work uses the subtitle workflow;
a new presenter performance uses `digital-human`.

Load the selected execution skill for its input preparation, timing and
verification guidance. Translation scope and recovery are described below.
Already-generated avatar videos can be source videos; creating a new avatar is
a separate capability.

Resolve the source, target language and intended speaking turns before choosing
processing scope. Translation preserves the source speaker's identity by default;
load `voice` to resolve that identity when using the controlled speech route.

Audio intervals and speaker stems are different. Replacing an interval removes
its whole mix, including music, ambience and any overlapping voice. Non-overlapping
speaking turns allow other turns to remain untouched, but do not separate sounds
underneath the selected speaker. Inspect which components must remain and which
tracks actually exist before proposing generation. If only a mix is available and
the user requires underlying sounds unchanged, explain that missing capability
and resolve stems or a tradeoff first; voice cloning does not separate the mix.

Mouth rendering has a separate visual scope: the supplied frames are processed
without a speaker or spatial selector. A time crop does not exclude other people
still visible; do not promise their picture remains untouched unless the actual
edit isolates that visual scope. No-lip audio replacement retains the picture.

Preserve stated requirements when adapting the plan. A visible speaker alone
is not a request for lip sync, and a selected voice does not settle that choice.
If requirements conflict or a capability is unavailable, explain the specific
constraint and resolve the tradeoff; do not silently substitute another voice,
change preserved footage, or relax the requested content.

Before translating, establish segment timing budgets with
the [speech timing budget](#speech-timing-budget). Before any paid
speech synthesis or video rendering, check the target script
against the source for meaning, omissions, numbers and proper names, then check
target-language grammar and natural spoken wording. Apply this to both integrated
translation drafts and translations prepared for the `voice` route. Preserve user
edits and clarify material ambiguity; users need not know the target language to
confirm their source. This agent check does not add a mandatory review round.

## Review text on either route

Read the complete transcript for the intended source scope with `read_script`
and its canonical library document, waiting for transcription if needed. On the
integrated route, use the actual prepared draft for review.
Use editable source text first, with optional target review as described in the
review interaction below. On the `voice` route the agent translates the corrected
source itself and maintains the segment timing map; there is no integrated draft or
revision to create. User source approval can authorize automatic translation,
without requiring fluency in the target language. Reuse that approval, then follow
`voice` for compatible voice selection, synthesis and placement.

Follow the active host's `widget-forms` skill to present one prefilled, editable
source textarea containing readable, connected prose, with paragraph breaks where
useful. In embedded hosts, pair it with one `form-single` next-step choice:
“Confirm source and use automatic translation” or “Review translation”, localized
to the conversation language. Default to the former; show no foreign-language
editor initially. Only if the user chooses review, present the actual target in
one prefilled editable textarea. Follow the active host's equivalent supported
interaction outside embedded hosts. Do not invent collapsible widget attributes.
Users can confirm the source and authorize automatic translation without
opening or reviewing the foreign text.
Do not substitute a corrections/instructions field for editing the source itself,
and do not make one input per SRT cue. Escape embedded attributes and use `default`
for textarea prefills. Keep each transcript's own cue IDs, timing and mapping to
readable text internally; source and target may have different segmentation.
Never show placeholders as recognized or translated content.

## Independent dubbing: synthesize, align and deliver

After source confirmation, translate the corrected source against the segment
budgets established above. Preserve meaning, names and numbers; estimate natural
speaking time before synthesis and check target-language grammar. Users need not
proofread a language they do not know. Reuse the common review interaction above;
there is no provider draft or revision in this path.

Before selecting/reusing a voice, cloning or synthesizing independent speech,
load [voice](../voice/SKILL.md) unless it is already loaded in this conversation.
That skill owns voice compatibility, reference preparation, cloning, synthesis,
actual audio timing and recovery; this translation skill does not replace those
instructions. Pass it the corrected translation, timing plan, resolved speaker
requirement and picture constraints. Preserving the original speaker is already
a voice choice: loading `voice` does not reopen a preset picker or repeat approval.
A reusable compatible clone still requires the speech workflow, not a new clone.

Follow `voice` through final audio and alignment, then return here for translation
verification and delivery. Only load `lipsync` if mouth changes were requested.
Integrated translation does not require `voice`; supplied final audio does
not require cloning or synthesis.

Continue requested placement/export. Check the delivered language and wording,
voice through listening, speech against visual events, and preserved picture and
sounds. If lip sync was requested, inspect continuous video with sound. Report
only checks actually performed; a completed job is not proof of those qualities.

## Integrated translation task

An integrated tool does not mean this account can use every operation. Check the
backend's actual availability and structured errors. Reviewed translation stays
unavailable until the deployment has verified account rights
and use of the approved wording. Supplier draft pricing does not block this workflow.
If blocked, preserve the user's text and explain the limitation;
never bypass it with legacy direct generation or present an agent-written preview
as the draft that the provider will actually render.

Only after selecting the integrated route, use `video_translation`; `action` is required.

1. `list_languages` reads the live language catalog. Copy the exact returned target
   language value, including regional/script qualifiers; do not guess ISO codes.
2. Prepare the actual source asset for the requested scope using
   [processing-source preparation](#prepare-the-processing-source).
   Read this asset's complete transcript using `read_script` and its canonical
   library document after transcription is ready. This local text is a comparison
   aid, not proof of what the provider recognized or received as translation input.
   Verify the prepared asset’s actual duration and content before creating a task.
   Draft cue times refer to this asset. If the source scope changes, prepare the
   correct source asset and a task for it; editing text updates the existing source’s
   wording, while the source asset determines the video being processed.
3. `prepare` prepares a draft, or saves edits on the same `taskId`. Follow the tool's
   actual schema and returned state. ChatCut does not charge users for preparing,
   reading, editing or confirming the draft. Supplier preparation cost remains
   unverified; do not describe it as zero. Final video generation is billed separately.
   Never invent a provider-generated translation.
   A ready draft means text is ready for review, not that dubbing or lip sync has
   finished. Describe those as planned generation in plain conversation-language
   terms (for example, “保留你的声音” and “口型同步”); do not claim a separate voice
   clone has been created.
4. Use `get` on that task to read current text, revision, status, next action and any error. Task
   states are `preparing`, `ready`, `failed`, `submitting`, or `submitted`.
   Recover `submitting` with the same task, revision and lip-sync choice; after `submitted`, use
   its generation job for rendering/import status. Do not edit an in-flight generation. Preserve
   its task ID across interrupted conversations and edits; do not create a second task
   just to resume or check progress. Initial `prepare` takes `sourceAssetId` and
   `targetLanguage`. To edit a ready draft, send `taskId` and `expectedRevision`
   from `get`. Target-only edits use `targetTranscriptSrt`. Source corrections must
   include both `sourceTranscriptSrt` and the corresponding `targetTranscriptSrt`
   in the same `prepare` call; this saves the pair atomically and advances revision.
5. Read source provenance and capability flags. `sourceTranscriptSrt` is the current
   editable source draft; `originalSourceTranscriptSrt` preserves the initial local
   recognition reference. `sourceCorrectionSupported: true` permits saving corrections
   with updated target text. `providerSourceRetranslationSupported: false` means the
   agent must update the translation; this does not ask the provider to re-recognize
   or retranslate the corrected source. Never conflate local ASR with provider ASR.

When the user changes the source, compare it with the saved source and update the
actual target draft accordingly, correcting names consistently in both saved
drafts and repeating the target-script check above. If the user also edits the target, preserve
those edits when consistent; clarify a material conflict rather than silently choosing.
Save both SRTs with `prepare` on the same task and current revision, then describe
the saved changes briefly in the user's language. Do not silently render unchanged
translation after receiving a source correction.

Preserve each transcript's cue structure/timing when saving. Map continuous-prose
edits back to the existing cues yourself when unambiguous; ask a focused clarification
only if the intended wording cannot be determined. Substantial new-script rewrites
belong to `voice` with optional `lipsync`, outside this translation workflow.
If the user specifically requires the provider itself to retranslate supplied corrected
source text, explain that unsupported operation; do not present agent target edits as
provider-side retranslation.

A stale revision requires `get` before further edits. Any source or target change
invalidates approval of the old revision. After saving, briefly describe changes in
the user's language. Choosing “Confirm source and use automatic translation”
authorizes proceeding with the translation of that submitted source: use the newly
saved revision and let the runtime generation guard request final authorization
for that exact version and cost. Do not add another mandatory text-review round
or require foreign-language accuracy confirmation. A source edit without that
authorization does not authorize generation. Reuse explicit approval for an
unchanged saved revision; never carry an old revision's approval onto changed text.

## Integrated generation and delivery

Use `generate` with `taskId`, `revision` and an explicit `audioOnly` choice for
the reviewed draft when the tool reports it can proceed. Respect the runtime confirmation; a model-written claim of confirmation is
not a substitute for the host's authorization. Final generation must use the saved
revision authorized by the user, including its actual target text. Do not fall back to an uncontrolled retranslation when draft
support or provider rights are unavailable.

- `audioOnly: true` means dubbed speech without mouth synchronization, not subtitles
  only. It still uses the reviewed content.
- Duration stretching (`keepDuration`) is chosen at the initial `prepare`, not at
  `generate`. Inspect actual output duration and pacing afterward. Neither choice
  guarantees exact duration or arbitrary-length text fitting; do not promise a
  numerical stretching limit.
- Do not pass remembered `mode` or external voice IDs outside the live schema.
- Captions, if returned, are separate actual outputs; do not promise burned-in
  subtitles from a deprecated generation flag. Add requested subtitles with editing tools.

Use `get` and the returned generation job with `track_progress` as appropriate to
its actual stage. After completion inspect the returned asset and its actual duration,
audio and picture. Continue requested timeline placement, version assembly and export;
a job ID alone is not delivery. Lip-sync may re-encode or change alpha, resolution or
frame rate. Audio-only avoids mouth redrawing but does not guarantee byte-identical
container or picture encoding.

## Diagnose before retrying

If the provider reports `pending moderation`, check the same task rather than
submitting a new paid request. If the task returns
`nextAction: inspect-provider-session` or `PREPARATION_REQUIRES_RECONCILIATION`,
stop automatic polling and request operator reconciliation, preserving the task ID.
A `failed` status alone does not authorize a fresh preparation or generation.

| Observation                                     | Next action                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Unsupported language                            | Refresh the catalog or use returned candidates, not guessed spellings                                           |
| Draft unavailable or permission denied          | Preserve the task/text and explain the blocked capability; do not claim approved-text generation succeeded      |
| Source changed, stale text or revision conflict | Get the current draft; save source corrections with corresponding target edits before renewed authorization     |
| Submit timeout or unknown outcome               | Get the same task before retrying; never start a fresh paid task blindly                                        |
| Incorrect words                                 | Correct the source and corresponding target, or the target alone; lip sync cannot fix incorrect speech          |
| Wrong voice or pronunciation                    | Inspect the actual dubbed audio; discuss a controlled voice/TTS route if needed                                 |
| Correct audio, poor mouth movement              | Inspect faces, occlusion, cuts and duration; avoid redundant cloning or translation                             |
| Provider completed, output/import failed        | Recover the existing output when available; do not poll forever or pay to regenerate an already rendered result |

Use live estimates and error details; unknown provider causes or charges remain
unknown. User-facing explanations describe ChatCut capabilities, not internal model
names, provider identifiers or infrastructure.

## Speech timing budget

Before translating or drafting dialogue for existing visuals, inspect the actual
source speech segments and pauses alongside the relevant visual events. Establish
where each meaning unit can be spoken, including intentional gaps and any fixed
boundaries. A single shot can use a simple segment plan; it does not need the
multi-section table below.

Estimate the target-language speaking time at the intended delivery pace while
writing each segment. Preserve meaning, numbers and proper names; concise natural
phrasing and supported pacing are choices, mechanical character-count matching
is not. Apply already stated priorities for content, picture and timing. Only ask
when a material conflict remains that those priorities do not resolve.

After synthesis, compare actual spoken segment starts, ends and pauses with those
windows and the picture, whether or not lips will be changed. Check both overruns
and speech finishing while visible speech continues. Do not treat equal total
length, long padding silence or cutting off words as alignment. Use two distinct
adjustment layers:

- During TTS, use only controls advertised by the selected voice's catalog entry;
  do not assume a delivery tag or speed parameter exists for every voice.
- When words and voice are already correct and only pacing needs adjustment,
  prefer reusing that audio: copy it into your workspace, apply FFmpeg `atempo`
  for pitch-preserving tempo adjustment, and import the derived audio as a new
  project asset with the current host's import path. A timeline rate edit does
  not change the source asset used by a later generation tool; prepare the
  derived asset when that tool needs the adjusted audio itself.

Keep changes moderate, remeasure actual speech segments and pauses, and verify
the exported result against the picture. Neither pitch preservation nor matching
length guarantees natural delivery. Do not repeatedly synthesize at random to
hit an exact duration; resolve remaining conflicts through permitted wording,
placement or visual changes, or clarify constraints that cannot be met together.

## Single-speaker dialogue replacement

For a simple talking-head replacement, including translated dubbing without lip
sync, first resolve any obvious script-versus-duration conflict as described in
the speech timing budget above. For a selected section, use
[processing-source preparation](#prepare-the-processing-source)
before any whole-asset generation. Establish the intended script and selected voice, generate or
reuse final audio, then check the actual words and measured speech windows. Compare that audio with the source video and its speech windows
before dialogue replacement or `lipsync`. Both speech running beyond its window
and ending while visible speech continues can be material mismatches. Choose
wording, supported pacing, pauses or placement that fit the user's timing intent;
adapt visuals only when their requested preservation permits it. Adding silence
does not by itself fix visibly unmatched speech, and changing speed does not by
itself prove a natural result. Inspect the adjusted output. Do not expect lip sync to make arbitrary-length speech
fit, and do not require the multi-section mapping table below for a single shot.
Reuse existing final audio and approval rather than regenerating or reconfirming it.

## Prepare the processing source

`sourceAccess.cloud: "not-available"` and `originalUpload: "deferred"` do not
mean the local source is unusable. Independent dubbing can read the local source
without uploading its video. When integrated translation or lip sync needs cloud
media, call that tool with the resolved asset IDs; it requests the required uploads.
Follow an upload-in-progress response with its wait/retry instructions, preserving
the existing task and approved audio. Only ask the user to relink or upload manually
when the tool reports that automatic upload is unavailable or the file is missing.

Whole-asset generation needs an actual asset containing only the requested source
section. Resolve whether the user's range refers to source time or timeline time;
map timeline ranges through item offsets and playback rate before preparing media.
Copy the source media into your workspace, trim the required source interval
with shell media tools such as ffmpeg, and import the result as a new project
asset. If the input must include existing timeline edits, export only that
timeline range, wait for the export to finish, and import its output. Use the
current host's download, export and import tools; the environment notes and
tool descriptions say which ones apply. Preserve the original timeline.

Verify the prepared asset’s actual content and duration. Its times are relative
to that asset; placement returns to the intended original timeline range.

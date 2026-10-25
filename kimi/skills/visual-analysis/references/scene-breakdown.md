# Scene-by-scene analysis

Use this for understanding a video, studying a reference, or producing a granular
scene/shot breakdown. Keep a focused visual check focused; a subtitle or transition
question need not generate a report about the whole video.

## Establish the subject and evidence

Resolve the actual source or composed timeline, requested range and useful outcome.
Reuse readable media, the existing ChatCut transcript and frames. Analyzing a local
file does not require placing it on a timeline or uploading it. For a URL, use an
available acquisition route; a thumbnail, page description or successful import
alone does not establish its content. Report inaccessible media as a source gap.

Read duration and the relevant clock before assigning times. Original footage
uses source time; a composed edit uses its timeline clock. Follow the entrypoint's
host-specific field names and units. Keep placement, trim and rate mappings when
relating the two. The same numeric value can mean different moments on those
clocks.

## Inspect at the level the question needs

Begin with a bounded overview spanning the selected range, including its opening
and closing content. Use the current host's source-frame or timeline-viewer tools;
batch useful samples and divide long videos into meaningful ranges. Chapters,
transcripts and detected changes can locate candidates, but they do not prove
that the relevant visuals were inspected.

Expand around consequential changes: a new shot, a changed software screen,
prompt or setting, an inserted example, an action's start/result, or a transition.
Inspect ordered before/during/after moments when motion matters. Read small text
from a useful full-size frame or crop. A few overview images cannot establish
every cut or a frame-exact boundary; use the available cut/adjacent-frame route
when that precision changes the answer. Do not inspect every frame by ritual.

## Read speech from the ChatCut transcript

This analysis assumes the media already has a ChatCut transcript. Read each
scene's timestamped words from it through the host's transcript field or view,
and put the words actually spoken in that interval into the scene's `audio`. Use
the transcript of the media's own speech; a translated or reworded caption track
does not record what was said. Do not transcribe again or reconstruct speech by
listening. If the transcript is missing, still processing or unreadable for the
range, report that gap and leave the speech unresolved; creating a transcript is
the transcription workflow's job.

Keep the transcript's words, including uncertain or misrecognised terms. When
on-screen text shows the intended spelling, note the correction instead of
silently rewriting the quote. A sentence can cross a visual cut; assign its words
to the scene where they are spoken without inventing a word boundary. Summarise
only when the user asks for less detail, and label the summary as one.

Listen to the audio only for tone, music, sound effects or synchronization, when
the question depends on them. Without that listening, say so and do not invent
acoustic descriptions. A transcript's music tag is evidence of the tag, not a
listening result.

## Describe meaningful scenes

Let visible content and the user's purpose determine segmentation. Separate
material shot/state changes; retain a coherent continuing action across transcript
sentences. A tutorial chapter can contain a presenter, a request, a software
operation and its output—those are different observations when they matter.
Group an unresolved rapid montage explicitly rather than guessing its cuts.
There is no target scene count or fixed sampling density.

For each useful interval capture:

- Start/end on the declared clock, at the supported precision.
- Visible subjects, setting, layout, text, action and camera/graphic movement.
- The transcript words spoken in the interval, plus any tone, music or sound
  effects actually listened for.
- Framing or shot type, and the scene's role in the video when useful.

Prefer specific observations to a repeated generic presenter description. For a
software demonstration, inspect the important screen, selected inputs, readable
settings and resulting state. Keep a creator's request separate from its result.
An output does not reveal its hidden prompt or internal production algorithm.

Keep illegible text, inferred settings and unverified claims uncertain. Reconcile
material disagreements between narration, visible controls and results. Current
documentation can explain a tool but cannot prove the creator used it for this
clip. Recovering the full production method or creating a new video continues in
the corresponding workflow; a scene list alone does not complete either task.

## Return useful prose or structured scenes

Use a concise narrative/table for an ordinary question. When the user or a
downstream workflow needs JSON, the following scene fields retain the useful
granularity of Higgsfield's exposed Video Analysis results without requiring that
provider, its queue or its private prompt:

```json
{
  "time_domain": "source",
  "analyzed_range": { "start_seconds": 0, "end_seconds": 4 },
  "scenes": [
    {
      "scene_number": 1,
      "timestamp_start": "00:00:00.000",
      "timestamp_end": "00:00:04.000",
      "visual": "A close view shows a cup on a table; a title enters above it.",
      "audio": "\"Here is the new cup.\" Music and effects not listened to.",
      "shot_type": "Close-Up",
      "label": "Product introduction"
    }
  ],
  "evidence": {
    "timing_precision": "estimated from sampled frames",
    "audio_basis": "chatcut_transcript",
    "coverage": "Sampled frames and transcript words across this selected range."
  }
}
```

This is an illustrative shape, not an observation of a supplied video or a claim
about a supplied video. The seven scene keys are `scene_number`,
`timestamp_start`, `timestamp_end`, `visual`, `audio`, `shot_type` and `label`.
Keep source/asset identity, evidence locators, precision and gaps alongside the
scenes when needed. Choose useful labels for the actual content; advertising
categories should not force a tutorial or film into a marketing interpretation.

Check chronological intervals against the actual duration and clock, including
the tail. Internally continuous times can still drift from the source. Cite the
actual frames/ranges supporting important claims. State partial coverage rather
than stretching an uninspected final scene. A completed provider job, more scenes,
valid JSON or distinct wording does not establish correct analysis.

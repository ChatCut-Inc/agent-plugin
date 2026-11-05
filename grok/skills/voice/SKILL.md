---
name: voice
description: Text-to-Speech (TTS), voice cloning, voiceover, narration placement/sync, and custom sound effects (SFX) generator. Use when the user wants generated speech from text, wants to clone a consented voice from uploaded reference audio, wants to correct a misspoken word or short phrase in recorded speech, wants to add/replace/align narration or voiceover for an existing video/timeline, wants to keep existing voiceover synced after visual retiming edits, needs voice audition/selection, or explicitly wants a newly generated/custom sound effect that is not available in the Sound Effects library.
---

# Voice & Sound Effects

`manage_voice` is the single entry for the voice catalog and the user's cloned
voices. `submit_voice` creates TTS audio assets. `submit_sound` creates custom
sound effects.

## Read the matching reference first

These are required reads, not suggestions. Read the whole file before the
first tool call or question of that branch.

- A word or short phrase was actually misspoken in recorded speech: read
  [references/fix-spoken-mistakes.md](references/fix-spoken-mistakes.md). If
  the recording is correct and only the transcript is wrong, fix the transcript
  instead. A full rewrite or new voiceover uses the normal path.
- Narration, voiceover, dubbing, or replacement speech for an existing visual
  target (video, timeline, screen recording, slides, demo, B-roll, MG), even if
  the user never says "sync"; or changing visuals while keeping existing
  narration aligned: read [references/video-sync.md](references/video-sync.md)
  before drafting narration, generating TTS, or placing audio. Skip it only for
  a standalone audio asset with no visual target.
- Cloning from a reference the user already supplied or identified for this
  request (attachment, project asset, timeline item), or any cloning in an
  external host such as Codex, Claude, or Grok Bot: read
  [references/cloning.md](references/cloning.md).
- The user asks for expressive delivery (emotion, tone, energy, pauses, pacing,
  emphasis, whispering, laughter, accent, singing): read
  [references/delivery-controls.md](references/delivery-controls.md) before
  writing the final text or choosing controls.

When a generation tool returns `FEATURE_NOT_INCLUDED` for a `generation.*` feature, use its payer and access details. If the project owner needs Pro, explain that the owner pays and must upgrade; the member's own Pro does not unlock the project. Do not give the member a personal upgrade link or send them to their own billing menu. They can find the owner in the project's existing members view when available. Otherwise share the returned upgrade link, or ChatCut’s avatar menu → Upgrade. Existing credits are preserved and generation still consumes credits after upgrading. This rejection does not charge for generation; existing agent conversation fees are separate, so do not claim the whole conversation was free. Preserve the exact original tool input and project, then stop. Do not automatically search for or substitute stock media; offer alternatives only if the user explicitly asks.

When the user returns with “continue”, “继续”, “jixu”, or says they upgraded, recheck current payer eligibility and credits for the original input with `estimate_generation` when supported, otherwise the original tool’s precheck. If there is no separate precheck, one retry of the original tool lets its server check current access. If eligible, submit the original input once; if still blocked, explain the current blocker and stop. Do not ask the user to choose between the original generation and stock media again or state the old rejection as current status without checking. If a job was already accepted, track it instead of submitting again. Never switch generation tools, providers or services to bypass a gate.

## TTS

1. Reuse a concrete voice selected by exact ID/reference or an exact unique saved name. Ask when names are duplicated or selection is unresolved; otherwise use the audition path below. Every option comes
   from `manage_voice action="list" voiceType="all"` for the current request,
   with the target narration `language` and the conversation `locale`. Never
   build options from memory, translated names, filenames, or broad traits.
2. Submit with the chosen entry's `voiceRef` alone; never add `provider` or
   `voiceId` to it. Submit only entries whose `supportedUses` includes `tts`;
   a cloned voice without it needs current plan access. The legacy
   `provider` + `voiceId` pair is only for a voice the host attached with those
   values; follow that attachment's hidden context.
3. `submit_voice` only creates an audio asset. Placing, replacing, trimming,
   and aligning it on the timeline is a separate step with timeline tools.
4. Keep standalone narration in one `submit_voice` call when it fits the
   selected model's per-request limit. For ElevenLabs, v2/v4 allow 10,000
   characters and v3 allows 5,000. If the script exceeds the limit, split at
   sentence boundaries without dropping or rewriting text, keep the same
   voice/model, and deliver a continuous narration when requested. Also split
   when the user asks for separate clips or a visual workflow needs them.
5. Use only the controls in the chosen entry's
   `capabilities.supportedControls`; never infer support from a voice name or
   family. A cloned voice's empty list still takes delivery cues written in its
   text, so it stays a candidate for expressive requests. Never claim stable
   age, regional accent, pronunciation dictionary, or exact duration control.
   For ElevenLabs, `supportedControls` is a union: check the selected model in
   `capabilities.controls.models`. Audio tags require an explicitly selected
   `eleven_v3` or `eleven_v4`; the default v2 does not interpret them. Never
   send `speed` with v4 or v4 Turbo.

Keep the default `eleven_multilingual_v2` when it supports the request. Pass
language codes such as `vi`, `th`, `zh-CN`, or `ja-JP` to discovery, and read
`modelGuidance`. Catalog language tags and sample language are not model
language guarantees. v2 does not speak Vietnamese or Thai; explicitly select
v3 or v4 for those languages. Do not silently switch every request to v4.
When speed matters, keep a speed-capable model that also supports the target
language; do not substitute v2 for a language it cannot speak. Keep `locale`
for display names, independent from narration language.

Japanese narration (including a Chinese conversation asking for Japanese): list
with `language="ja"` (never `other`) and `locale` set to the conversation
language. Audition with the returned Japanese sample; `sampleLanguage` tells
which language a sample actually speaks, so never relabel a Chinese or English
sample as Japanese. Cloned voices keep their own sample language. For a chosen
Doubao official voice, add `explicitLanguage:"ja"` when submitting. Keep returned
voice names.

### Keep voice providers private

Doubao, ElevenLabs, Fish Audio, their model names, provider voice ids, and
provider URLs are internal. Never show or hint at them in replies, progress
updates, recommendations, cards, clone instructions, summaries, or errors. Say
`official voices` / `官方音色` and `cloned voices` / `克隆音色` / `My Voices` /
`我的音色`, or use the voice's saved name. When an error mentions a provider,
keep its actionable meaning and drop the provider details. Provider values
belong only in tool arguments and in reading tool results.

## Choosing a voice

When TTS is requested without a concrete official or custom voice, and the
user has not chosen cloning, call `manage_voice action="list" voiceType="all"`
before recommending or rendering anything. It already lists ready cloned voices before matching official ones.
Never infer the user's voices from chat history or from this file.

Classify the request:

- **Concrete voice:** the user named or attached a voice, or picked the only
  named custom-voice option. Use it. If they chose their cloned voices and
  several are ready, show only those ready voices as playable choices. For a
  named official voice, use or confirm it; do not reopen the source choice.
- **Own voice** ("my own voice", "my cloned voice", or a workflow that clones
  when none is ready): audition only ready cloned voices plus the clone card,
  or go straight to cloning when none is ready. Offer official voices only if
  the user declines cloning or asks. Cloned narration is synthesized from text
  and can speak languages the speaker never recorded, so a narration language
  the user cannot speak is a reason to use their cloned voice, never to switch.
- **Cloning chosen** (explicit request, or the clone option was picked): do not
  list voices just to compare sources. Start the cloning route below in the
  very next reply; do not wait for the user to ask again or send them to a
  menu.
- **No concrete voice:** render one combined playable picker:
  1. every ready cloned voice that has a real `previewUrl`, first, whatever
     the narration language or requested traits;
  2. 2-4 suitable official voices, matched on explicit requirements ("middle-
     aged male", "warm", "professional") or, failing those, on traits inferred
     from the script, presented as a suggestion rather than the user's stated
     preference. If nothing matches every explicit requirement, list again
     without the optional filters and present the results as the closest
     choices;
  3. one clone action card last: `Clone another voice` when a ready cloned
     voice exists, otherwise `Clone my voice`, in the conversation language.

  Never drop a ready playable cloned voice because of its sample language,
  missing catalog tags, empty `supportedControls`, or an explicit or inferred
  trait; cloned voices narrate any language. Do not ask a text-only
  saved-versus-official question, do not use `<choices/>`, and never add a
  standalone `<clone-voice/>` next to the clone card. A reference file may
  deliberately replace this ordinary picker with a narrower one.

Render the picker with `widget-forms` as one required `playable_single_choice`.
Each option comes from one returned entry: localized name, summary, and the
returned preview URL exactly as given (never rebuild, re-host, or prepend a
base URL). Omit a ready cloned voice without a preview. The native picker shows
only the first five playable cards. Write all visible copy in the conversation
language, starting with one short, natural sentence that invites the user to
listen and pick, as in the example below. The narration language only chooses
the catalog, so an English request for Chinese narration gets English copy and
Chinese-capable voices.
Keep a label-to-entry map (including each `voiceRef`) in context so a submitted
label maps back without another confirmation.

Native ChatCut shape:

```text
试听一下，选好音色我就开始生成。
<widget>
  <form-visual id="voiceId" label="请选择并试听音色" media-kind="audio" required="true">
    <visual-option value="<customVoiceId or voiceId>" name="<returned name>" summary="<returned summary>" media="<returned preview URL>" media-kind="audio"/>
    <visual-option value="clone_voice" name="克隆我的音色"/>
  </form-visual>
</widget>
```

Wait for the choice, then:

- Official voice: submit its `voiceRef`.
- Cloned voice: submit its exact `voiceRef` when final speech is requested.
  Generation rechecks current ownership, readiness and plan access. If it returns
  `FEATURE_NOT_INCLUDED`, do not synthesize through another route: explain the
  plan requirement; the runtime shows the upgrade card.
- `clone_voice`: in the native editor the card opens the clone dialog itself
  and returns the saved voice into the same picker, so the answer already is
  that cloned voice. Elsewhere, start the cloning route on the next turn.

## Cloning

Offering the clone option in a picker is required whatever the user's plan,
quota, or availability, and needs no consent; those decide what happens after
the user picks it. Cloning itself needs explicit authorization and a reference the user supplied
for this request. Speech already in the project is never a reference or
permission by itself.

1. First call `manage_voice voiceType="custom" action="check-create-access"`;
   it is the authoritative preflight (`list` is not). If the account cannot
   create another voice, explain with the returned counts instead of opening
   any clone flow.
2. Pick the route:
   - **Reference already supplied or identified** (native editor), or **any
     external host such as Codex, Claude, or Grok Bot**: read
     [references/cloning.md](references/cloning.md) and follow it. Never emit
     `<clone-voice/>` in an external host; it cannot render there. Its intake
     form uses these strings verbatim, in the conversation language:
     - Authorization checkbox: zh `我确认拥有该音色或已获得克隆授权，并承诺不将其用于冒充他人、欺诈或其他违法用途。`;
       en `I confirm that I own this voice or have permission to clone it, and will not use it for impersonation, fraud, or unlawful purposes.`;
       es `Confirmo que esta voz es mía o que tengo permiso para clonarla, y que no la usaré para suplantación, fraude ni otros fines ilícitos.`
     - Default preview text: zh `这是你的克隆音色，希望你喜欢这个效果。`;
       en `This is your cloned voice. I hope you like the result.`;
       es `Esta es tu voz clonada. Espero que te guste el resultado.`
   - **Native editor, no usable reference:** use the editor dialog, which owns
     recording/upload, name, preview text, authorization, entitlement, preview,
     and retry. Do not collect any of these yourself. After every required tool
     has finished, send this as the final message of the run: one short
     sentence that they can click the button below to start cloning, then
     `<clone-voice/>` alone on its own line, then one short sentence asking them
     to select the saved voice from the menu that opens and send a message to
     continue. For example:
     `可以点击下方按钮开始克隆你的音色啦。\n<clone-voice/>\n保存后，在弹出的菜单中选择音色，再发消息给我继续。`
     Then stop and wait.
3. `<clone-voice/>` is an executable editor action, not text. Never quote it,
   put it in backticks, describe it as a next step, or emit it in a progress,
   pre-tool, or intermediate message. At most one per run.
4. Saving in the dialog opens the voice menu; it does not attach the voice.
   Selecting the saved voice checks Pro access. Saving or previewing a voice
   is not permission to generate speech. When the user sends a cloned-voice
   attachment, follow its hidden context.

Rename or delete saved voices with the other custom `manage_voice` actions;
delete only after an explicit permanent-delete confirmation.

## Sound effects

Search the Sound Effects library before spending credits: call `browse_library`
with the sound-effects category and a descriptive query, then place the
returned library sound with `edit_item` as its description explains. Use
`submit_sound` only when the user explicitly asks for a generated or original
sound, or the library has no suitable match. Describe the sound specifically:
source, setting, and style ("footsteps on a wooden floor in an empty room",
"cinematic whoosh", "8-bit game coin").

## Hard rules

1. Never render voice options or submit TTS before calling
   `manage_voice action="list" voiceType="all"` for the current request, and
   never submit while the voice is only broadly described.
2. Never exclude a ready cloned voice with a playable preview from the picker
   because of its sample language, its name, or explicit or inferred traits;
   end every ordinary picker with exactly one clone action card.
3. Never combine `voiceRef` with `provider` or `voiceId`, and never pass a
   provider voice id to any tool to get around cloned-voice access checks.
4. Never replace original recorded speech with TTS unless the user asks.
5. Never import or clone a reference before the user affirmatively submits the
   full ownership/permission and lawful-use confirmation. An attachment, a
   name, a generic "yes", or another completed field is not that confirmation.
6. Never clone unrelated speech already in the project, and never send the user
   back to the dialog or ask them to reselect audio they already supplied.
7. `<clone-voice/>` appears only as the final message, at most once per run.
8. Never show a cloned-voice preview as raw `<audio>`, a Markdown link, or a
   bare URL.
9. Never expose provider names, model names, provider ids, or provider URLs,
   and never cite this skill, a workflow, or a rule in visible text, including
   short progress notes.

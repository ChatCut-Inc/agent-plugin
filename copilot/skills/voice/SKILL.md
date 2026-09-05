---
name: voice
description: |
  Text-to-Speech (TTS), voice cloning, voiceover, narration placement/sync, and custom sound effects (SFX) generator. Use when the user wants generated speech from text, wants to clone a consented voice from uploaded reference audio, wants to add/replace/align narration or voiceover for an existing video/timeline, wants to keep existing voiceover synced after visual retiming edits, needs voice audition/selection, or explicitly wants a newly generated/custom sound effect that is not available in the Sound Effects library.
user-invocable: true
---

# Voice & Sound Effects Generator

Generate voiceovers (TTS) and sound effects. For TTS, choose a concrete
provider and voice before calling `submit_voice`.

## When to Use

- Generate voiceover/narration from text
- Create text-to-speech audio for videos
- Add, replace, or redo narration/voiceover for an existing video, timeline,
  screen recording, slide animation, product demo, B-roll edit, MG explainer, or
  other visual sequence
- Keep existing narration/voiceover aligned after trimming, speeding up, slowing
  down, moving, reordering, or replacing the visuals it describes
- Offer and audition TTS voice choices when the user has not picked a concrete voice
- Clone the user's own or explicitly authorized voice from reference audio
- Generate custom sound effects from text descriptions only after checking the Sound Effects library first

## TTS (Text-to-Speech)

If the current request has an existing visual target and the user wants
narration, voiceover, dubbing, or replacement speech for that target, read
[references/video-sync.md](references/video-sync.md) before drafting new
narration, using existing narration text to generate TTS, or placing audio. Do
this even when the user did not explicitly say "sync" or "match the visuals";
the existence of a visual target means narration timing and meaning may need to
follow on-screen content. Use the normal standalone TTS path only when there is
no visual target or the user just wants an audio asset from text.

Also read [references/video-sync.md](references/video-sync.md) when the timeline
already has narration/voiceover and the user asks to change the visuals while
keeping that voiceover aligned. This is a sync maintenance task even if no new
TTS is needed.

Use `submit_voice` for final TTS with curated or cloned voices. Use
`manage_custom_voice` only to list, create, preview, apply, rename, or delete
cloned Fish Audio voices. The current contracts are:

- `provider` is required. Use `doubao` for Chinese-optimized narration and
  `elevenlabs` for English or multilingual narration, or `fish-audio` for a
  ready ChatCut custom voice.
- `voiceId` is required and provider-specific. Do not mix catalogs.
- `submit_voice` creates an audio asset only. Timeline placement, replacement,
  trimming, and alignment happen later with timeline tools.
- For long narration, multiple `submit_voice` calls can be useful: split at
  natural pauses, sentence groups, or script beat boundaries when the workflow
  benefits from separately timed or placed voice clips, such as storyboard beats,
  scene-level ad segments, or a user request for separate assets.
- For Doubao, `speedRatio`, `loudnessRatio`, `pitch`, `emotion`,
  `emotionScale`, `performancePrompt`, and `explicitDialect` are supported
  knobs, but not every Doubao voice supports every expressive control. Check
  the `voiceId` guide or [references/voices.md](references/voices.md) before
  using them.
- For ElevenLabs, `modelId`, `speed`, and `stability` are the supported voice
  knobs. For `eleven_v3`, inline audio tags are available for expressive
  delivery such as emotion, tone, nonverbal cues, accent hints, pauses, or
  local pacing.
- For `fish-audio`, pass the ready voice's ChatCut `customVoiceId` as
  `voiceId`. `submit_voice` performs the authoritative Pro/readiness check,
  creates a generation job, and consumes standard TTS credits after success.
  Never pass or request the provider's internal Fish model id. The current
  Fish S2.1 model supports inline square-bracket cues in `text` for local
  emotion, delivery, and paralinguistic control.

### Keep voice providers private

Doubao, ElevenLabs, Fish Audio, their model names, and other provider identity
are internal implementation details. Never expose or attribute them in
user-facing replies, progress updates, voice recommendations, audition cards,
clone instructions, success summaries, or errors. Use ChatCut product language
instead:

- Call curated catalog voices `official voices` / `官方音色`.
- Call saved custom voices `cloned voices` / `克隆音色`, `My Voices` /
  `我的音色`, or use the voice's user-visible saved name.
- Describe status and failures at the ChatCut feature level. If a tool or
  provider error contains a provider name, model name, provider voice id, or
  provider URL, preserve the actionable meaning but remove those details
  before replying.

Provider names and provider-specific ids remain valid only in internal tool
arguments, tool-result interpretation, and these implementation instructions.
Do not copy them from tool output into visible UI metadata or prose.

Doubao control support for current curated voices:

- `vivi`, `xiaohe`, `yunzhou`, `xiaotian`, `naiqimengwa`, `yingtaowanzi`,
  `wenroumama`, `zhixingnv`, `dayi`, `jitangnv`, `liuchang`, `ruyayichen`,
  `morgan`, `qingcang`, `huiben`, `popo`, `yuanboxiaoshu`, `baqiqingshu`, and
  `tangseng` support explicit `emotion` / `emotionScale`,
  `performancePrompt`, and ASMR-style prompt directions.
- `shuanglangshaonian` supports `performancePrompt` and COT/QA-style
  instruction following, but does not support explicit `emotion` /
  `emotionScale` or ASMR-style control.
- `explicitDialect` is only supported by `vivi` and can be `dongbei`,
  `shaanxi`, or `sichuan`.

ElevenLabs control support for current curated voices:

- `amelia`, `brittney`, `hope`, `jessica`, `arabella`, `jane`, `maria`,
  `mark`, `frederick`, `peter`, `james`, `jon`, `sully`, `david`, and `alex`
  all support the same request-level controls: `modelId`, `speed`, and
  `stability`.
- These controls are not per-voice guarantees of a specific acting style.
  Use the preset tags/samples to pick a naturally suitable voice, then use the
  controls for moderate delivery changes.
- For ElevenLabs `eleven_v3`, inline audio tags are available when the user
  asks for expressive delivery such as emotion, tone, nonverbal cues, accent
  hints, or local pacing. Official examples fit these useful TTS categories:
  emotion/tone tags such as `[happy]`, `[sad]`, `[angry]`, `[excited]`,
  `[curious]`, `[sarcastic]`, `[crying]`, `[annoyed]`, `[appalled]`,
  `[thoughtful]`, `[surprised]`, and `[mischievously]`; vocal delivery and
  nonverbal cue tags such as `[whispers]`, `[laughs]`, `[sighs]`, `[exhales]`,
  `[inhales deeply]`, `[clears throat]`, `[snorts]`, `[swallows]`,
  `[wheezing]`, and `[coughs]`;
  pacing/pause/local speed tags such as `[slowly]`, `[pause]`,
  `[short pause]`, `[long pause]`, `[rushed]`, and `[drawn out]`; and
  accent/special-performance tags such as
  `[strong X accent]`, for example `[strong French accent]`, plus `[sings]`,
  `[singing]`, `[woo]`, and `[pirate voice]`. Official examples are
  non-exhaustive; similar auditory tags can be tried when the user explicitly
  asks for that delivery and the tag describes how the voice should sound, not
  a visual action. Write tags directly in `text`, close to the short phrase
  they should affect. Treat tags as local guidance, not paragraph-wide controls.
- For pauses and pacing in `eleven_v3`, use punctuation, text structure,
  shorter generated segments, or local audio tags such as `[short pause]` and
  `[slowly]` when needed.

Fish Audio control support for cloned voices:

- The current `fish-audio` route uses Fish S2.1. Put concise natural-language
  cues in square brackets directly in `submit_voice.text`, for example
  `[happy]`, `[calm]`, `[angry]`, `[excited]`, `[whisper]`, `[laugh]`,
  `[sigh]`, `[gasp]`, `[pause]`, `[emphasis]`, `[inhale]`, or `[exhale]`.
  S2.1 is not limited to a fixed tag list, so a specific auditory description
  such as `[whispers sweetly]` or `[laughing nervously]` is also valid.
- Place a cue immediately before the phrase or moment it should affect. Fish
  S2.1 accepts cues anywhere in the text, so multiple short cues can create
  local transitions, for example
  `[calm] 先别着急。[excited] 好消息是，我们已经找到解决办法了！` or
  `I thought it was over [gasp] but then the lights came back [relieved].`
- Use cues sparingly and only when the requested delivery benefits from them.
  Prefer one clear instruction at a transition over stacking conflicting
  directions. Treat the result as model guidance rather than a deterministic
  editing boundary, and split into separate `submit_voice` calls when exact
  clip-level timing or independent retries matter.
- Do not use Fish S1's legacy `(parenthesis)` emotion syntax on this route, and
  do not add a separate `emotion` argument: the S2.1 cue belongs inside
  `text`. Keep the default voice-cloning preview line untagged. Do not add cues
  to a custom preview on the user's behalf, but preserve cues the user
  intentionally includes within the 100-character preview limit.

```ts
// English / multilingual via ElevenLabs
submit_voice({
  provider: "elevenlabs",
  text: "Hello world",
  voiceId: "peter",
});

// Chinese via Doubao
submit_voice({
  provider: "doubao",
  text: "你好世界",
  voiceId: "liuchang",
});

// With speed adjustment (Doubao only)
submit_voice({
  provider: "doubao",
  text: "这是一段稍快的中文旁白。",
  voiceId: "liuchang",
  speedRatio: 1.5,
});

// With expressive Doubao controls
submit_voice({
  provider: "doubao",
  text: "这次事故提醒我们，安全永远不能侥幸。",
  voiceId: "liuchang",
  emotion: "sad",
  emotionScale: 3,
  performancePrompt: "痛心但克制，语速稍慢，像新闻专题旁白",
  pitch: -1,
  speedRatio: 0.92,
});

// With ElevenLabs delivery controls
submit_voice({
  provider: "elevenlabs",
  text: "The launch changed how teams plan their daily work.",
  voiceId: "peter",
  speed: 0.95,
  stability: 0.4,
});

// With local Fish Audio S2.1 delivery cues on a ready cloned voice
submit_voice({
  provider: "fish-audio",
  voiceId: "<confirmed custom voice id>",
  text: "[calm] 先别着急。[excited] 好消息是，我们已经找到解决办法了！",
  name: "Expressive custom voiceover",
});
```

## Voice Audition Before Generation

### Emit the native clone entry only as a final action

`<clone-voice/>` is an executable editor action, not prose, code, or an
internal process label. Never quote it, wrap it in backticks, describe it as
the next step, or emit it in a progress update, pre-tool explanation, plan, or
other intermediate assistant message.

Finish every required inspection and tool call first. If the native dialog is
still the correct route afterward, follow the **dialog-entry sequence** under
**Native ChatCut editor** below. That sequence must be the final user-facing
assistant message for the run: do not call another tool, add anything after
its completion reminder, or emit the tag again. A single Agent run may render
at most one standalone native clone entry.

### Route cloning by host and available reference

Decide the host path before loading `widget-forms` or asking for clone inputs:

- In the native ChatCut editor, first check whether the user has already
  supplied a readable audio attachment or explicitly identified an accessible
  audio-bearing ChatCut asset for this cloning request, including a timeline
  audio or video item. If so, do not make the user choose the same source again
  and do not emit `<clone-voice/>`. Resolve or derive its audio asset, run the
  creation preflight, collect only the missing name, preview text, and explicit
  authorization, then use the Agent-driven cloning flow below.
- In the native ChatCut editor, use the editor dialog only when a usable
  reference has not already been supplied. Follow the native dialog path under
  **Custom Voice Cloning** below.
- In external Codex, Claude Code, or GitHub Copilot CLI hosts, never emit
  `<clone-voice/>`; those hosts do not render or dispatch the native editor
  action. Use the Agent-driven attachment flow below.

An arbitrary voice already present in the project is not consent or a cloning
reference. Use the direct path only when the user supplied or identified the
audio for the current cloning request and later gives the full authorization
required below.

When the user explicitly chooses an audio-bearing timeline item, resolve it and
its source range with `preview_timeline`. Reuse a 10-second-to-3-minute audio
asset directly. For video, use `request_asset_download`, extract the chosen
range as supported audio with ffmpeg, then load `asset-import` and import the
result with `import_media`. For any source over 3 minutes, use a clean
30–60-second excerpt; under 10 seconds, ask for a longer reference. Continue
with the resulting audio asset id without emitting `<clone-voice/>`; the source
choice is not authorization.

### Choose the interaction from live state

Treat the custom-voice lookup as a mandatory gate. Whenever the user requests
TTS without naming a concrete preset or a concrete custom voice, and has not
already explicitly chosen or requested voice cloning:

1. If `manage_custom_voice` is not already loaded, use `ToolSearch` to load it.
2. Call `manage_custom_voice action="list"`.
3. Use the returned ready voices and names to choose the interaction below.

Do this before reading the curated voice catalog, recommending official voices,
or rendering any voice-selection UI. Never infer the user's saved voices from
chat history.

An explicit request to clone a voice is already a concrete source choice. Do
not call `manage_custom_voice action="list"` merely to choose between official,
saved, and cloned voices in that case. First resolve whether the current
request already supplies a usable reference; perform any required creation
preflight; then follow the selected host route. The standalone native entry may
appear only after that work is complete, under the final-action discipline
above.

The Agent may infer useful tone, mood, delivery, or use-case suggestions from
the narration text. Treat these as recommendation signals, not as the user's
choice of voice source. A reasonable inference must never exclude a ready,
playable custom voice from the combined audition surface below.

Classify the request before rendering anything:

- **Concrete custom voice:** when the user names a ready custom voice or chooses
  the only named custom-voice pill, use that exact custom voice. When the user
  chooses `Choose my cloned voice` and several are ready, show only those ready
  custom voices as playable choices before continuing.
- **Concrete official preset:** use or confirm that exact preset; do not reopen
  the source-choice branch.
- **Clone action selected:** only now enter the host-specific cloning route
  above in the very next reply. Do not wait for the user to ask again, tell
  them to open a menu or panel, or leave the choice as an unhandled pill. In
  the native editor, finish any required inspection or preflight before the
  dialog entry; in external Codex, Claude Code, or GitHub Copilot CLI hosts,
  begin the attachment flow.
- **At least one ready custom voice, but no concrete voice named:** render one
  combined playable audition surface. Put ready custom voices that have a real
  `previewUrl` first, add 2-4 suitable official voices with playable samples,
  and finish with `Clone another voice`. Do not ask a text-only saved-versus-
  official source question and do not use `<choices/>`.
- **No ready custom voice and no voice preference:** infer a small, varied set
  of 2-4 generally suitable official voices, render them as playable cards,
  and finish with `Clone my voice`. Do not use text-only source choices.
- **No ready custom voice and voice requirements available:** use explicit
  requirements such as "middle-aged male", "warm female", or "professional"
  first; otherwise reasonable traits inferred from the narration may guide the
  recommendation. Show 2-4 matching official playable cards and one clone
  action card in the same selection surface. Do not append a standalone
  `<clone-voice/>` button to this reply.

Localize the branch labels and adjust them to live state. Use these meanings:

- Chinese:
  - Named custom: `使用「<name>」`
  - Custom list: `选择我的克隆音色`
  - Curated catalog: `选择官方音色`
  - First clone: `克隆我的音色`
  - Additional clone: `克隆新音色`
- English:
  - Named custom: `Use “<name>”`
  - Custom list: `Choose my cloned voice`
  - Curated catalog: `Choose an official voice`
  - First clone: `Clone my voice`
  - Additional clone: `Clone another voice`
- Spanish:
  - Named custom: `Usar «<name>»`
  - Custom list: `Elegir mi voz clonada`
  - Curated catalog: `Elegir una voz oficial`
  - First clone: `Clonar mi voz`
  - Additional clone: `Clonar otra voz`

In GitHub Copilot CLI, map the choices through `widget-forms`: use one required
`ask_user` string field, keep each voice id as its stable value, and use the
localized voice name as its label. Add `clone_voice` as the final label-only
option in that same field.

Always expose one appropriate path to cloning during voice selection, but never
show both a clone action card and the standalone native `<clone-voice/>` entry
in the same reply. Provider availability, plan, and quota govern what happens
after the user chooses cloning, not whether the choice is visible. Offering
the choice does not require consent; explicit permission and a supported
reference are required only before the external clone tool call.

Before recommending, rendering, or submitting any TTS voice option, read
[references/voices.md](references/voices.md). Use that file as the preset
source for preset ids / `voiceId`, provider choice, display labels, tags, and
sample URLs. Do not create voice options from memory, translated names, or
broad user descriptions.

First determine two separate languages:

- User conversation language: the language the user used to talk to you. Use
  this for surrounding copy, option names, and summaries.
- Target narration language: the language of the text being synthesized. Use
  this only to choose provider and voice catalog.

Load `widget-forms` before collecting input or rendering a choice. That skill
owns the current host's form, attachment, and media-card behavior. This skill
owns the voice candidates, required fields, safety rules, and the asset ids
passed to voice tools. Do not embed host-specific UI instructions here.

"help me generate ... voice over in Chinese" is an English conversation asking
for Chinese narration, so the audition widget copy stays in English while the
voice candidates come from Doubao.

For an official audition:

1. Filter `references/voices.md` by target narration language / provider and
   the user's explicit gender, age range, tone, and use-case requirements. If
   none were explicit, reasonable tone or use-case traits inferred from the
   narration may guide the shortlist after the user chooses official voices.
   Present inferred traits as a suggestion, not as a stated user preference. If
   none match all explicit requirements, say so and offer the closest supported
   presets.
2. Pick 2-4 matching curated presets.
3. Load `widget-forms` and request one required `playable_single_choice`. Give
   every curated option its stable preset id, localized display label,
   localized summary, and matching sample path from `references/voices.md`.
   Each documented `/voice-samples/...` value is a complete editor asset
   reference: pass it verbatim. Never prepend an inferred S3, CDN, editor,
   localhost, or production base URL, and never reconstruct an absolute URL
   from the filename pattern. This differs from a custom voice's `previewUrl`,
   which must be used exactly as returned by `manage_custom_voice`.
4. Always add one no-media action option with stable value `clone_voice` as the
   final card on every recommendation/selection surface. Label it `Clone my
voice` when no ready custom voice exists, or `Clone another voice` when one
   does; localize it using the meanings above. In GitHub Copilot CLI this is a
   label-only `ask_user` option, not a separate question or button.
5. Wait for the user to choose. If the answer maps to `clone_voice`, render the
   host-specific cloning entry/workflow on the next turn; do not start cloning
   from the audition reply itself.
6. For a curated preset, call `submit_voice` with the selected preset id as
   `voiceId`.
7. For an existing custom voice, call `manage_custom_voice action="apply"`
   with its full mapped `customVoiceId`. When final speech is requested, pass
   that same id to `submit_voice` as `voiceId` with `provider: "fish-audio"`.

For a custom-voice-only audition, include every relevant `ready` custom voice
that has a `previewUrl`. Use the full `customVoiceId` as its stable value, the
stored name as its display label, `previewText` as its summary when present,
and the exact tool-returned `previewUrl` as audio media. Do not copy, download,
rewrite, validate by hostname, or invent that URL. If a ready voice lacks a
preview, omit it from the audition surface rather than making an unplayable
text-only card.

Keep every curated option's id, display label, sample, and summary tied to the
same row from `references/voices.md`; keep every custom option tied to the same
tool-returned voice tuple. The target narration language only chooses the
curated catalog; the conversation language controls all visible copy. Keep the
label-to-id map in context so a host that returns visible labels can still map
the answer to the exact id without another confirmation.

## Custom Voice Cloning

Voice cloning is a separate consented flow. Proactively offering it during
voice selection is required and is not the same as starting a clone. Never
clone a third party's voice merely because a clip is present in the project.

### Native ChatCut editor

When the user has not already supplied a usable reference audio attachment or
ChatCut audio asset for this cloning request, delegate creation to the existing
editor dialog and follow the **dialog-entry sequence** below. Do not first ask
for the voice name, language, reference upload, or consent in an Agent widget.
The dialog owns fresh entitlement and slot checks, recording/upload,
authorization, durable source storage, Fish Audio registration, preview, and
retry.

When the user has already supplied a usable reference for this cloning request,
do not send them back through the dialog and do not ask them to reselect the
file. Follow **Agent-driven cloning from an available reference** below. After
the creation preflight succeeds, collect only missing fields: explicit
authorization, voice name, and preview text. Then call
`manage_custom_voice action="clone"` with the resolved ChatCut audio asset id.

For the dialog path, the Agent owns presenting the entry. Immediately after the
user chooses the clone branch:

1. Send one short, natural sentence that tells the user they can click the
   button below to start cloning.
2. Render exactly `<clone-voice/>` on its own line.
3. Add one short, localized sentence asking the user to send a message when
   cloning is complete so the Agent can continue the request.

Adapt the instruction and reminder to the conversation and language. This
three-part sequence must be the final assistant message for the run after all
required tools have finished; never place it in a pre-tool or intermediate
message. Examples:

- Chinese: `可以点击下方按钮开始克隆你的音色啦。\n<clone-voice/>\n克隆完成后告诉我一声，我再继续。`
- English: `Click the button below to start cloning your voice.\n<clone-voice/>\nLet me know when cloning is complete, and I'll continue.`
- Spanish: `Haz clic en el botón de abajo para empezar a clonar tu voz.\n<clone-voice/>\nAvísame cuando termine la clonación y continuaré.`

These are examples, not fixed copy. Do not say “follow these steps” or imply
that the Agent will collect clone inputs. Do not redirect the user to an editor
menu to find cloning themselves. After sending the entry and reminder, stop
and wait for the user to report completion or send the draft created by the
dialog's Apply action.

When the user clicks Apply, the editor inserts both the cloned-voice attachment
and the localized equivalent of `Continue generating with this voice.` into
the prompt draft. Wait for the user to send that draft. The attached hidden
voice context contains the exact custom voice id; continue the existing request
with `submit_voice provider="fish-audio"` when final speech is actually
requested. Do not emit raw `<audio>` HTML or a second Retry / Apply widget.

### Agent-driven cloning from an available reference

Use this flow in either of these cases:

- the native ChatCut Agent already has a readable attachment or accessible
  ChatCut audio asset that the user supplied for this cloning request; or
- an external Codex, Claude Code, or GitHub Copilot CLI host is collecting the
  reference as a conversation attachment because it cannot open the native
  editor dialog.

Never call the clone action until the user submits explicit permission. ChatCut
durably archives every submitted clone-source recording in its own user-file
storage before Fish Audio registration. This source is retained for future
provider migration even if the project asset is later deleted; never ask a
user to re-record or reselect an already accessible reference merely to create
the voice.

After the user chooses `clone_voice`, resolve any reference already supplied for
this cloning request before asking for another upload. Do not use
`providerAvailable:false` to block intake; the provider integration may be
enabled after the choice was rendered, and the clone action is the
authoritative availability check. Use entitlement and slot fields to explain
an upgrade or a full quota before asking for unnecessary inputs when the
account cannot create another clone. If the clone action itself returns
`CUSTOM_VOICE_PROVIDER_NOT_CONFIGURED`, explain that cloning is temporarily
unavailable and keep the requested name and imported reference asset in context
so the flow can be retried later.

Before asking for a name, recording, upload, or consent, call
`manage_custom_voice action="check-create-access"` and treat that fresh result
as the authoritative creation preflight. Do not use `list` alone as an
entitlement check: `check-create-access` deliberately emits the runtime's
feature-gated upgrade card for an ineligible free account.

- Free account with `freeTrialAvailable:false`: do not collect another
  reference. Explain that the Free custom-voice slot is occupied and that the
  user must delete the existing voice or upgrade to create another. In the
  native editor the product opens its pricing dialog; in the Agent conversation,
  the existing feature-gated upgrade card is the equivalent interaction. Do not
  invent a purchase URL or continue cloning behind it.
- Pro account with `activeVoiceCount >= voiceSlotLimit`: do not collect another
  reference. Say exactly how many voices are active and that the current plan
  limit has been reached, then offer two conversational actions: upgrade the
  plan through the runtime's upgrade card, or close/continue with an existing
  voice. Do not call `clone` until the user has upgraded or freed a slot.
- Otherwise continue with the intake below. A stale preflight never overrides
  the clone endpoint: if `clone` still returns `FEATURE_NOT_INCLUDED` or
  `CUSTOM_VOICE_QUOTA_EXCEEDED`, follow the same recovery path and do not retry
  automatically.

1. Explain that the reference audio will be securely processed to create a
   reusable cloned voice. Do not identify the underlying provider.
2. Require a name, explicit authorization/risk confirmation, preview text, and
   one valid reference audio. When the user already supplied the reference,
   reuse it and ask only for the other missing fields. The user must confirm
   that the speaker is the user or the user has permission, and that the voice
   will not be used for impersonation, fraud, or unlawful activity. Uploaded
   audio is language-detected by ChatCut, so do not ask the user to choose its
   language. The stable ChatCut formats are AAC, FLAC, M4A, MP3, OGG, WAV, and
   WebM. Require 10 seconds to 3 minutes; recommend 30-60 seconds of clean solo
   speech without music, reverb, or background noise.
3. Load `widget-forms` and request only the missing parts of this host-neutral
   intake contract:
   - `voice_name`: `short_text`, required.
   - `voice_reference`: `audio_reference`, exactly one required recording or
     attachment only when no usable reference has already been resolved.
   - `preview_text`: `short_text`, editable and no more than 100 Unicode
     characters. Prefill the localized default below, but let the user replace
     it with any text they want to hear in the cloned-voice preview.
   - `voice_consent`: `explicit_consent`, required and initially unselected.
     Ask the adapter to keep the missing fields in one intake when its host
     supports media fields. If the host collects conversation attachments
     separately, follow the adapter's attachment flow and do not treat attaching
     a file as consent. Do not re-ask a field the user has already supplied
     clearly in the current cloning request.

Authorization and the use commitment are a hard continuation gate. After the
intake returns, independently verify that the user affirmatively submitted the
exact localized authorization option above. Until that confirmation is
present, stop: do not import the attached reference, do not call
`manage_custom_voice action="clone"` or `action="preview"`, and do not claim
that cloning has started. A supplied name, an attachment, a generic “yes”, a
previous unrelated approval, or widget state showing other completed fields is
not authorization. If authorization is missing or ambiguous, ask only for the
full authorization confirmation again and wait for the user's answer.

Normalize the submitted result before cloning:

```ts
{
  voiceName: "<submitted name>",
  sourceAssetId: "<ChatCut audio assetId>",
  previewText: "<submitted preview text or localized default>",
  confirmedConsent: true,
}
```

Localize all visible copy to the user's conversation language. For the
authorization checkbox, use the same product copy as the Create Voice
dialog rather than paraphrasing it:

- Chinese: `我确认拥有该音色或已获得克隆授权，并承诺不将其用于冒充他人、欺诈或其他违法用途。`
- English: `I confirm that I own this voice or have permission to clone it, and will not use it for impersonation, fraud, or unlawful purposes.`
- Spanish: `Confirmo que esta voz me pertenece o que tengo permiso para clonarla, y que no la utilizaré para suplantar identidades, cometer fraude ni otros fines ilícitos.`

Use ChatCut's detected language tag rather than asking the user to identify the
language manually.

The intake must resolve to a ChatCut audio `assetId`. If the host returns a
readable attachment instead, load `asset-import`, import it into the targeted
project, and use the returned audio `assetId`. Never pass a local path,
attachment URL, or raw bytes to `manage_custom_voice`. If no readable audio is
available, stop and ask for it. Use the user's submitted `preview_text` after
trimming surrounding whitespace. If it is blank, use the localized default:

- Chinese: `这是你的克隆音色，希望你喜欢这个效果。`
- English: `This is your cloned voice. Hope you like it.`
- Spanish: `Tu voz clonada. Espero que te guste.`

Choose the default by the user's conversation language. The final preview text
must contain 1-100 Unicode characters. If the submitted value is longer, ask
the user to shorten it before cloning; do not silently truncate it or replace
it with the default. Preserve the user's wording rather than rewriting it from
conversation context.

Then call:

```ts
manage_custom_voice({
  action: "clone",
  sourceAssetId: "<uploaded audio asset id>",
  name: "<submitted voice name>",
  confirmedConsent: true,
  previewText: "<submitted preview text or localized default>",
});
```

The tool waits for both cloning and preview generation. After it returns a
ready voice and `previewUrl`, ask the loaded `widget-forms` adapter to render
one `playable_preview` using the full `customVoiceId` as its stable value, the
submitted voice name as its display name, the submitted `previewText` as its
summary, and the exact tool-returned `previewUrl` as audio media. This is a
display-only preview, not another intake or selection form. Never put the URL
in prose, emit a raw `<audio>` element, or substitute an unsupported Markdown
audio/link syntax.

Immediately after the playable preview, ask for one single branch decision:
`Retry` / `重试` / `Reintentar`, or `Apply` / `应用` / `Aplicar`. This branch
decision uses one required `ask_user` single-choice field through
`widget-forms`. Keep the full `customVoiceId`, submitted name, submitted
`previewText`, and `previewUrl` mapped in context while waiting. If `ask_user`
is unavailable, ask the same two-option question in ordinary chat.

- `Retry` means collect a replacement recording or upload for this same voice;
  do not consume another slot and do not discard the previous ready voice until
  replacement succeeds. If the current tool surface cannot replace the source
  in place, explain that limitation instead of creating a second voice.
- `Apply` means select the cloned voice for the current AI draft/request. Call
  `manage_custom_voice action="apply"` with the selected `customVoiceId`. This
  action performs the authoritative Pro/readiness check without generating
  audio or consuming credits. On success, retain the custom voice id as the
  selected voice and continue the conversation; only call `submit_voice` with
  `provider: "fish-audio"` when the user actually asks to generate final speech.
  If it returns `FEATURE_NOT_INCLUDED`, do not present the voice as applied and
  do not synthesize. Explain that the free clone can be previewed but applying
  it for generated narration requires Pro; the runtime's feature-gated upgrade
  card is the Agent equivalent of the editor paywall.

The free plan can attempt one clone and listen to its preview, but cannot use a
cloned voice for final TTS. Pro custom-voice slots equal
`floor(monthly plan credits / 100)`; a ready or processing voice occupies one
slot. Slot access does not include free generation: final cloned-voice TTS uses
the normal voice-generation credits, deducted only after generation succeeds.
The backend is authoritative for all three rules.

When the user asks to generate final speech with a cloned voice, call
`submit_voice` with the ChatCut custom voice id:

```ts
submit_voice({
  provider: "fish-audio",
  voiceId: "<confirmed custom voice id>",
  text: "<final narration text>",
  name: "Custom voiceover",
});
```

If the tool returns `FEATURE_NOT_INCLUDED` / `feature_not_included`, tell the
user that one custom-voice preview slot is available on Free but final cloned
voice TTS requires Pro. Do not retry, switch voices, or submit the provider id
through another tool to bypass the gate. The runtime emits the standard pricing
upgrade card for this blocker; invite the user to upgrade and retry afterward.
For a paid account, phrase this as: it has created `activeVoiceCount` voices and
has reached the current subscription plan limit of `voiceSlotLimit`; offer an
upgrade action and a close/continue action. Do not route a quota error through
the free-account paywall copy.

## Sound Effects

For ordinary editing sound effects (SFX), do **not** generate first. Use the
built-in Sound Effects library before spending credits:

1. Call `browse_library` with `category:"sound-effects"` and a query such as
   `"whoosh"`, `"camera shutter"`, `"notification"`, `"censor beep"`, or
   `"record scratch"`.
2. Inspect the returned `library:sound:<id>`.
3. Place it with `edit_item`, using `fromFrame` as the sound's
   anchor/editorial moment frame:

```ts
browse_library({
  category: "sound-effects",
  query: "short whoosh transition",
});

edit_item({
  adds: [
    {
      type: "audio",
      assetId: "library:sound:whoosh-short",
      fromFrame: 120,
      trackId: "A1",
    },
  ],
});
```

Only generate sound effects from text descriptions with `submit_sound` when:

- The user explicitly asks for a generated/original/custom sound.
- The requested sound is too specific for the existing Sound Effects library.
- `browse_library({ category:"sound-effects", query })` returns no suitable
  match.

```ts
// Custom/generated sound effect after the library has no suitable match
submit_sound({ prompt: "A dog barking in the distance" });

// With custom duration (0.5-22 seconds)
submit_sound({
  prompt: "Thunder and heavy rain",
  durationSeconds: 15,
});

// High prompt adherence
submit_sound({
  prompt: "Sci-fi laser gun firing",
  promptInfluence: 0.8,
});
```

**Tips for better results:**

- Be specific: "A dog barking loudly" vs just "dog"
- Include context: "Footsteps on wooden floor in an empty room"
- Specify style: "Cinematic whoosh" or "8-bit game sound"

## Parameters

### TTS

| Field        | Description                             | Notes           |
| ------------ | --------------------------------------- | --------------- |
| `provider`   | `doubao`, `elevenlabs`, or `fish-audio` | Required        |
| `text`       | Text to synthesize                      | Required        |
| `voiceId`    | Curated id, or ChatCut custom voice id  | Required        |
| `speedRatio` | Speech speed                            | Doubao only     |
| `modelId`    | ElevenLabs model id                     | ElevenLabs only |
| `stability`  | ElevenLabs stability                    | ElevenLabs only |
| `speed`      | ElevenLabs speech speed                 | ElevenLabs only |
| `name`       | Asset name                              | Optional        |

### Custom voices

| Action                | Required fields                                            | Result                                                |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `list`                | none                                                       | Entitlement, slot count, existing voices              |
| `check-create-access` | none                                                       | Authoritative create gate before collecting reference |
| `apply`               | `customVoiceId`                                            | Pro/readiness check; selects voice without generation |
| `clone`               | `sourceAssetId`, `name`, `confirmedConsent`, `previewText` | Reusable Fish Audio voice + preview                   |
| `preview`             | `customVoiceId`, `previewText`                             | Refreshed short audition                              |
| `rename`              | `customVoiceId`, `name`                                    | Updated product/provider display name                 |
| `delete`              | `customVoiceId`, `confirmedDelete:true`                    | Permanently deletes provider voice and frees the slot |

Do not use or expose a separate `manage_fish_audio_voice` tool. Fish model IDs,
public/unlisted publishing, arbitrary tags, cover images, and provider-level
catalog management are internal integration details. Delete only after an
explicit user confirmation; use `rename` for a simple name change.

### Sound Effects

| Field             | Description       | Notes          |
| ----------------- | ----------------- | -------------- |
| `prompt`          | Sound description | Required       |
| `durationSeconds` | Duration          | 0.5-22 seconds |
| `promptInfluence` | Prompt adherence  | 0-1            |
| `name`            | Asset name        | Optional       |

## Voices

Use the `submit_voice` `voiceId` guide and
[references/voices.md](references/voices.md) for the current curated preset
list, display labels, tags, and sample URLs.

### Voice presets are provider-specific — do NOT mix them

ElevenLabs and Doubao have separate voice catalogs. `vivi` / `dayi` are only
Doubao; `mark` / `amelia` / `james` are only ElevenLabs. Passing a Doubao name
to ElevenLabs (e.g. `voiceId: "vivi"` with `provider: "elevenlabs"`) will fail.

If you need a specific voice and a particular language:

- For Chinese narration -> use `provider: "doubao"` and either a curated Doubao
  preset (`vivi`, `dayi`, `xiaohe`, `yunzhou`, `liuchang`, etc.) or a raw
  `speaker_id` from the configured Doubao catalog.
- For English / multilingual -> use `provider: "elevenlabs"` and an ElevenLabs
  preset.

## Hard rules — what you must NOT do

1. Never use a voice preset name from a different provider.
2. Never render official voice recommendations before the mandatory custom
   voice `list` gate when no concrete voice was named.
3. Never use explicit or inferred voice traits to exclude a ready custom voice
   with a playable preview from the combined audition surface.
4. Never omit the final clone action card from a voice recommendation or
   selection surface.
5. Never submit TTS when the voice is only described broadly and the user has
   not confirmed a concrete preset.
6. Never recommend or render a TTS voice option before checking
   [references/voices.md](references/voices.md).
7. Never claim stable age, regional accent, pronunciation dictionary, or exact
   duration controls; the current tool does not expose those as reliable fields.
8. Never replace original recorded speech with TTS unless the user asks.
9. Never import or clone a reference voice until the user has affirmatively
   submitted the full ownership/permission and lawful-use commitment required
   by the cloning intake. Never infer this confirmation from an attachment,
   another completed field, a generic approval, or prior unrelated context.
10. Never bypass cloned-voice Pro checks by passing a provider voice id to
    `submit_voice` or another generation tool.
11. Never force the native clone dialog or ask the user to reselect audio when
    the user has already supplied a usable reference for the current cloning
    request. Preflight access, collect the missing authorization, name, and
    preview text, then clone from its ChatCut audio asset id.
12. Never treat unrelated speech already present in the project as a cloning
    reference or as permission to clone it.
13. Never render a cloned-voice preview as raw `<audio>` HTML, a Markdown link,
    or a bare URL. Use `widget-forms` `playable_preview` with the exact
    tool-returned `previewUrl`; keep Retry / Apply in the separate branch
    control required by the current host.
14. Never emit `<clone-voice/>` in an intermediate message or more than once in
    one Agent run. Complete required tools first; if the native dialog remains
    the correct route, follow its dialog-entry sequence and then stop.
15. Never expose Doubao, ElevenLabs, Fish Audio, provider model names,
    provider-specific ids, or provider URLs to the user. Use `official voice`
    and `cloned voice` product terminology, and sanitize provider details from
    visible errors and status messages.

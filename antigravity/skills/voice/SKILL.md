---
name: voice
description: Text-to-Speech (TTS), voice cloning, voiceover, narration placement/sync, and custom sound effects (SFX) generator. Use when the user wants generated speech from text, wants to clone a consented voice from uploaded reference audio, wants to correct a misspoken word or short phrase in recorded speech, wants to add/replace/align narration or voiceover for an existing video/timeline, wants to keep existing voiceover synced after visual retiming edits, needs voice audition/selection, or explicitly wants a newly generated/custom sound effect that is not available in the Sound Effects library.
user-invocable: true
---

Before using this skill, read [the required continuation](references/voice-workflows-consent-and-parameters.md) in full. It is part of this skill and contains mandatory workflow, tool-contract, and safety instructions; do not act from this entry file alone.


# Voice & Sound Effects Generator

If `submit_voice`, `manage_voice`, `pull_asset`, or `submit_sound` are not loaded yet, load them with `ToolSearch` before calling them, so you use their real parameters instead of guessing.

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
- Correct a real misspoken word or short phrase with the authorized speaker's
  cloned voice while preserving picture and downstream timing
- Generate custom sound effects from text descriptions only after checking the Sound Effects library first

## TTS (Text-to-Speech)

If the user wants to correct a word or short phrase that was actually spoken
incorrectly in existing recorded speech, read
[references/fix-spoken-mistakes.md](references/fix-spoken-mistakes.md) before
editing or generating. That workflow preserves the picture and protects later
timing while replacing only the faulty sound. Do not use synthesized speech
when the recording is already correct and only its transcript is wrong; fix
the transcript instead. Use the ordinary narration path for a full rewrite or
complete new voiceover.

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

Use `manage_voice` as the single catalog and management entry, and
`submit_voice` for final TTS. `manage_voice action="list" voiceType="all"`
returns official and cloned candidates in one normalized list. Only
`voiceType="custom"` supports create-access, apply, clone, preview, rename, or
delete actions. The current contracts are:

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
  knobs, but not every voice supports every expressive control. Use the
  selected official entry returned by `manage_voice action="list"` as the
  authority.
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

Official voice controls come from `manage_voice action="list"`:

- Call it for the target narration language and the user's visible locale.
  Treat each returned `(provider, voiceId, name, summary, sampleUrl,
capabilities)` tuple as atomic.
- Use only fields in that entry's `capabilities.supportedControls`; never infer
  capability support from a remembered voice name or family.
- Controls are not guarantees of a specific acting style. Use the returned
  tags and sample to pick a naturally suitable voice, then use supported
  controls for moderate delivery changes.
- For entries that advertise `audioTags`, inline audio tags are available when
  the user asks for expressive delivery such as emotion, tone, nonverbal cues,
  accent hints, or local pacing. Official examples fit these useful TTS
  categories:
- Emotion/tone tags include `[happy]`, `[sad]`, `[angry]`, `[excited]`,
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
- For pauses and pacing, use punctuation, text structure,
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
mcp__skill__submit_voice({
  provider: "elevenlabs",
  text: "Hello world",
  voiceId: "peter",
});

// Chinese via Doubao
mcp__skill__submit_voice({
  provider: "doubao",
  text: "你好世界",
  voiceId: "liuchang",
});

// With speed adjustment (Doubao only)
mcp__skill__submit_voice({
  provider: "doubao",
  text: "这是一段稍快的中文旁白。",
  voiceId: "liuchang",
  speedRatio: 1.5,
});

// With expressive Doubao controls
mcp__skill__submit_voice({
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
mcp__skill__submit_voice({
  provider: "elevenlabs",
  text: "The launch changed how teams plan their daily work.",
  voiceId: "peter",
  speed: 0.95,
  stability: 0.4,
});

// With local Fish Audio S2.1 delivery cues on a ready cloned voice
mcp__skill__submit_voice({
  provider: "fish-audio",
  voiceId: "<confirmed custom voice id>",
  text: "[calm] 先别着急。[excited] 好消息是，我们已经找到解决办法了！",
  name: "Expressive custom voiceover",
});
```

## Antigravity interaction

Read `widget-forms` before any input or audition. In Antigravity, translate all native widget, playable-card and branch-choice instructions below to concise ordinary text choices with stable ids mapped internally. Audition through the clean ChatCut editor link, including new cloned-voice previews; never promise chat audio or print raw sample URLs. Keep the original live lookup, sample eligibility, stable voice ids, clone action, Retry/Apply decisions, full explicit consent and credit gates unchanged. Native editor dialog/tag examples below apply only inside ChatCut, not Antigravity.

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
- In external Codex / Claude / Antigravity hosts, never emit `<clone-voice/>`; those hosts do
  not render or dispatch the native editor action. Use the Agent-driven
  attachment flow below.

An arbitrary voice already present in the project is not consent or a cloning
reference. Use the direct path only when the user supplied or identified the
audio for the current cloning request and later gives the full authorization
required below.

When the user explicitly chooses an audio-bearing timeline item, resolve it and
its source range with `preview_timeline`. Reuse a 10-second-to-3-minute audio
asset directly. For video, `pull_asset`, extract the chosen range as supported
audio with ffmpeg, then load `asset-import` and `push_asset` the result. For any
source over 3 minutes, use a clean 30–60-second excerpt; under 10 seconds, ask
for a longer reference. Continue with the resulting audio asset id without
emitting `<clone-voice/>`; the source choice is not authorization.

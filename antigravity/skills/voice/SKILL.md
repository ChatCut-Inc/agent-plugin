---
name: voice
description: Text-to-Speech (TTS), voice cloning, voiceover, narration placement/sync, and custom sound effects (SFX) generator. Use when the user wants generated speech from text, wants to clone a consented voice from uploaded reference audio, wants to correct a misspoken word or short phrase in recorded speech, wants to add/replace/align narration or voiceover for an existing video/timeline, wants to keep existing voiceover synced after visual retiming edits, needs voice audition/selection, or explicitly wants a newly generated/custom sound effect that is not available in the Sound Effects library.
---

# Voice & Sound Effects Generator

Before using this skill, read [the required continuation](references/cloning-sound-effects-and-rules.md) in full. It is part of this skill and contains mandatory workflow, tool-contract, and safety instructions; do not act from this entry file alone.

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
- Offer text descriptions of TTS voice choices when the user has not picked a concrete voice, and direct auditioning to ChatCut
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
user-facing replies, progress updates, voice recommendations, choice lists,
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
  tags and returned summary to pick a naturally suitable voice, then use supported
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
  `[calm] Don't worry just yet.[excited] The good news is that we've found a solution!` or
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
  text: "[calm] Don't worry just yet.[excited] The good news is that we've found a solution!",
  name: "Expressive custom voiceover",
});
```

## Voice Audition Before Generation

### Use the published-plugin clone flow

Offer cloning as a concise ordinary text choice,
then collect the source as a
conversation attachment and follow the Agent-driven cloning flow below.

### Route cloning from the available reference

Before asking for clone inputs, check whether the user has already supplied a
readable audio attachment or explicitly identified an accessible audio-bearing
ChatCut asset for this request, including a timeline audio or video item. If so,
do not make the user choose the same source again. Resolve or derive its audio
asset, run the creation preflight, collect only the missing name, preview text,
and explicit authorization, then use the Agent-driven cloning flow below. If no
usable reference exists, ask the user to attach one through the host.

An arbitrary voice already present in the project is not consent or a cloning
reference. Use the direct path only when the user supplied or identified the
audio for the current cloning request and later gives the full authorization
required below.

When the user explicitly chooses an audio-bearing timeline item, resolve it and
its source range with `preview_timeline`. Reuse a 10-second-to-3-minute audio
asset directly. For video, use a readable host-local original or obtain the
source through the advertised `request_asset_download` tool and download its
returned URL. Extract the chosen range as supported audio with an available
ffmpeg, then follow [asset-import](../asset-import/SKILL.md) with `import_media`.
If source download or local processing is unavailable, ask for a prepared audio
reference. For any
source over 3 minutes, use a clean 30–60-second excerpt; under 10 seconds, ask
for a longer reference. Continue with the resulting audio asset id; the source
choice is not authorization.

### Choose the interaction from live state

Treat the unified voice lookup as a mandatory gate. Whenever the user requests
TTS without naming a concrete official or custom voice, and has not already
explicitly chosen voice cloning:

1. If `manage_voice` is not already visible, locate it from the current MCP tool
   manifest without assuming a host-specific prefix.
2. Call `manage_voice action="list" voiceType="all"` with the target narration
   language, conversation locale, and any useful official-voice filters.
3. Use the returned normalized `voices` list as the only candidate directory.
   It already puts cloned voices before matching official voices.

Do this before recommending or rendering any voice-selection UI. Never infer
the user's saved or official voices from chat history or a static Skill file.

An explicit request to clone a voice is already a concrete source choice. Do
not call the combined list merely to choose between official and cloned voices
in that case. First resolve whether the current request already supplies a
usable reference; perform `manage_voice voiceType="custom"
action="check-create-access"`, then follow the attachment and consent flow above.

The Agent may infer useful tone, mood, delivery, or use-case suggestions from
the narration text. Treat these as recommendation signals, not as the user's
choice of voice source. A reasonable inference must never exclude a ready
custom voice from the combined choice set below.

Classify the request before rendering anything:

- **Concrete custom voice:** when the user names a ready custom voice or chooses
  the only named custom-voice pill, use that exact custom voice. When the user
  chooses `Choose my cloned voice` and several are ready, show those ready
  custom voices as concise ordinary text choices before continuing.
- **Concrete official preset:** use or confirm that exact preset; do not reopen
  the source-choice branch.
- **Clone action selected:** only now enter the plugin cloning route
  above in the very next reply. Do not wait for the user to ask again, tell
  them to open a menu or panel, or leave the choice as an unhandled pill. Finish
  any required inspection or preflight, then begin the attachment flow.
- **At least one ready custom voice, but no concrete voice named:** show one
  combined option set. Put ready custom voices first, add 2-4 suitable
  official voices, and finish with `Clone another voice`. Tell the user that
  auditioning is available in ChatCut's voice library.
- **No ready custom voice and no voice preference:** infer a small, varied set
  of 2-4 generally suitable official voices, show their names and returned
  traits as concise ordinary text choices, and finish with `Clone my voice`.
- **No ready custom voice and voice requirements available:** use explicit
  requirements such as "middle-aged male", "warm female", or "professional"
  first; otherwise reasonable traits inferred from the narration may guide the
  recommendation. Show 2-4 matching official choices and one clone action
  in the same option set.

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

Always expose one appropriate `clone_voice` choice during ordinary voice selection.
It is a localized option at the end of the same choice set. Provider availability, plan, and
quota govern what happens after the user chooses cloning, not whether the
choice is visible. Offering the choice does not require consent; explicit
permission and a supported reference are required only before the clone tool
call. A scenario reference may intentionally use a narrower choice list without
the clone action and explain its direct-from-project fallback in prose.

Before recommending, rendering, or submitting a TTS voice option, use the
current `manage_voice action="list" voiceType="all"` result. It is the live
catalog shared with ChatCut Web, Desktop, and published plugins. Do not create
voice options from memory, translated names, filenames, or broad descriptions.

First determine two separate languages:

- User conversation language: the language the user used to talk to you. Use
  this for surrounding copy, option names, and summaries.
- Target narration language: the language of the text being synthesized. Use
  this only to choose provider and voice catalog.

Load `widget-forms` before collecting input or rendering a choice. That skill
owns Antigravity's text-choice, attachment, and no-audio-preview behavior. This skill
owns the voice candidates, required fields, safety rules, and the asset ids
passed to voice tools. Do not embed host-specific UI instructions here.

"help me generate ... voice over in Chinese" is an English conversation asking
for Chinese narration, so the choice-list copy stays in English while the
voice candidates come from Doubao.

For official voice selection:

1. Call `manage_voice action="list" voiceType="all"` with the target narration
   `language`, user conversation `locale`, and any explicit gender, age, tone,
   or use-case requirements. If none were explicit, a concise inferred
   tone/use-case query may guide the official shortlist. Present inferred traits
   as a suggestion, not as a stated user preference. If nothing official
   matches, broaden only optional filters and clearly describe the closest
   supported choices; never drop returned ready custom voices because they
   lack official catalog tags.
2. Use returned ready custom voices first, followed by 2-4 returned official voices.
3. Load `widget-forms` and present one required choice set using concise ordinary text choices. Give every
   option its localized `name` and concise returned `summary`, while keeping the
   exact `voiceId` or `customVoiceId` mapped internally. Do not render, download,
   attach, or link `sampleUrl` or `previewUrl`. Tell the user to audition these
   choices in ChatCut's voice library when sound matters.
4. Always add one action option with stable value `clone_voice` as the final
   option on every ordinary recommendation list. Label it
   `Clone my voice` when no ready custom voice exists, or `Clone another voice`
   when one does; localize it using the meanings above. A scenario-specific
   reference may explicitly replace this ordinary list with a narrower one.
5. Wait for the user to choose. If the answer maps to `clone_voice`, render the
   cloning workflow on the next turn; do not start cloning from the selection
   reply itself.
6. For an official voice, call `submit_voice` with the selected tuple's
   `provider` and `voiceId` verbatim.
7. For an existing custom voice, call `manage_voice voiceType="custom"
action="apply"` with its full mapped `customVoiceId`. When final speech is
   requested, pass that same id to `submit_voice` as `voiceId` with
   `provider: "fish-audio"`.

For a custom-voice-only selection, include every relevant `ready` custom voice.
Use the full `customVoiceId` as its stable value, the stored name as its display
label, and `previewText` as its summary when present. Do not copy, download,
rewrite, attach, link, or expose `previewUrl`. The user can audition saved voices
inside ChatCut.

Keep every option's type, submission id, display label, summary, and capabilities
tied to the same `manage_voice` tuple. The target narration
language filters official entries; the conversation language controls all
visible copy. Keep the label-to-tuple map in context so a host that returns
visible labels can still map the answer without another confirmation.


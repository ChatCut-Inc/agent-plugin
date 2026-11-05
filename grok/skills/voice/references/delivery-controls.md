# Expressive delivery controls

Read this when the user asks for a specific emotion, tone, energy, pause,
pace, emphasis, nonverbal sound, accent, or singing. The ranges and exact
meaning of every `submit_voice` field are in the tool description; this file
covers which control family a voice uses and how to write it.

## General rules

- Use only the controls listed in the chosen entry's
  `capabilities.supportedControls`. Never infer support from a remembered
  voice name or family.
- Controls guide delivery; they do not guarantee an acting style. Pick a voice
  whose tags and sample already fit, then use controls for moderate changes.
- Put text cues right before the short phrase they should affect. Treat them as
  local guidance, not paragraph-wide settings. Use them sparingly and prefer
  one clear cue at a transition over stacked or conflicting cues.
- For pauses and pacing, start with punctuation and sentence structure. When
  exact clip-level timing or independent retries matter, split into separate
  `submit_voice` calls instead of relying on cues.
- Cues and tags must describe how the voice sounds, never a visual action.
- Cloned voices have no numeric speed, pause-length, or duration controls.

## Official voices with `audioTags`

These voices accept inline audio tags in square brackets, written directly in
`text`. Choose `modelId:"eleven_v3"` or `modelId:"eleven_v4"` explicitly with
the voice's `voiceRef`; the default `eleven_multilingual_v2` does not interpret
these tags. Check `capabilities.controls.models` for the selected model.

Useful tags (non-exhaustive; similar audible descriptions can be tried when the
user asks for that delivery):

- Emotion and tone: `[happy]`, `[sad]`, `[angry]`, `[excited]`, `[curious]`,
  `[sarcastic]`, `[crying]`, `[annoyed]`, `[appalled]`, `[thoughtful]`,
  `[surprised]`, `[mischievously]`.
- Vocal and nonverbal: `[whispers]`, `[laughs]`, `[sighs]`, `[exhales]`,
  `[inhales deeply]`, `[clears throat]`, `[snorts]`, `[swallows]`,
  `[wheezing]`, `[coughs]`.
- Pacing and pauses: `[slowly]`, `[pause]`, `[short pause]`, `[long pause]`,
  `[rushed]`, `[drawn out]`.
- Accent and performance: `[strong French accent]` (any `[strong X accent]`),
  `[sings]`, `[singing]`, `[woo]`, `[pirate voice]`.

Controls depend on the model, not just the voice. v4 and v4 Turbo do not accept
numeric `speed`; never send it or promise duration alignment from it. Keep v2
for speed-controlled requests in its supported languages. v2 does not speak
Vietnamese or Thai; use a compatible model rather than falling back to v2.
v3 accepts at most 5,000 characters per request; v2 and v4 accept 10,000.
Lower stability is generally more expressive. Keep the default model unless
the requested language or delivery requires an explicit alternative.

## Official voices with emotion and direction controls

Other official voices may list controls such as speed, loudness, pitch, an
emotion label with intensity, and a natural-language performance direction.
Use only the ones the chosen entry lists. A short direction usually works
best, for example `痛心但克制，语速稍慢，像新闻专题旁白` or `欢乐一点，像朋友介绍`.
Some voices also support a target language or dialect; check the entry first.

## Cloned voices

Cloned voices take natural-language cues in square brackets inside `text`.
They are not limited to a fixed list, so `[happy]`, `[calm]`, `[angry]`,
`[excited]`, `[whisper]`, `[laugh]`, `[sigh]`, `[gasp]`, `[pause]`,
`[emphasis]`, `[inhale]`, `[exhale]`, `[whispers sweetly]`, or
`[laughing nervously]` all work. Several short cues can create local
transitions:

- `[calm] 先别着急。[excited] 好消息是，我们已经找到解决办法了！`
- `I thought it was over [gasp] but then the lights came back [relieved].`

Do not use the old `(parenthesis)` emotion syntax and do not pass a separate
emotion field for a cloned voice; the cue belongs in `text`. Keep the default
cloning preview line untagged, and add cues to a custom preview line only when
the user wrote them.

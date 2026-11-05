
### Resolve speech only when the requested action needs it

For an official avatar, never silently use its paired voice and never immediately
open the broader voice catalog. When the live result provides `defaultVoiceRef` and
the user has not already made this choice, first ask one blocking text-only decision
in the conversation language: whether to use this avatar's official built-in voice
or choose another voice. In embedded ChatCut, render that decision with localized
`<choices options="Use official voice,Choose another voice"/>`, then stop and wait.
If the user accepts, resolve speech with that exact `defaultVoiceRef` and do not call
`manage_avatar action=voices`. Call `action=voices` only after the user chooses
another voice, or when the live identity has no `defaultVoiceRef`. Do not ask for
language or script and then pre-emptively call `action=voices` in the same turn.

For a saved or newly created avatar, reuse its saved voice binding when present and
confirm it; otherwise offer available voices. When the user settles on a voice they
want this avatar to keep, save it with `manage_avatar action=set-default-voice`;
`list`/`get` then return it as the avatar's `defaultVoiceRef`.

For voice discovery, audition, or cloning, follow the Voice Skill and reuse its live
voice list, consent gate, and generated voice asset. Do not duplicate voice-cloning
logic here.

In Antigravity, use `widget-forms` text voice choices and audition through the clean ChatCut editor link, keeping each exact `voiceRef` mapped internally and retaining the localized `clone_voice` action. Ask script confirmation as a separate text field when needed. The following native widget presentation rules apply only inside embedded ChatCut.

When an exact voice still needs to be selected, never present voice names as prose
beside a free-text field. Use the exact `voiceRef` returned by `manage_avatar` as the
submitted value. Voice selection is audio-preview-only and is a strict exception to
the generic `<choices/>` rule:

- Never render `<choices/>`, `<form-single>`, prose voice names, or label-only voice
  options. A voice without a returned playable `previewUrl` must be omitted from the
  recommendation surface rather than presented as an unplayable choice.
- When the user wants to audition voices, prefer up to five suitable available
  official, preset, or custom voices that actually include `previewUrl`. Render them as one
  required `<form-visual id="voiceRef" media-kind="audio">`; `hasPreview: true`
  without `previewUrl` is not playable and must not be presented as an audition
  card. Always append one no-media `<visual-option value="clone_voice"
name="Clone Voice"/>` action, localized to the conversation language, as the
  final card. This clone option is required on every recommended-voice surface.
- An official avatar's paired default voice may still be used without listing the
  broader official voice catalog. Do not show that default voice as an audition
  card unless an actual audio `previewUrl` was returned for it. Never reuse the
  avatar image or video URL as a voice preview.
- Copy each returned `previewUrl` exactly. In particular, keep
  `/voice-samples/...` root-relative; do not expand it to `chatcut.com` or invent
  another host.
- When script text is also being confirmed, put the voice selector and script field
  in the same widget. Do not make the user type a voice name into the script field.

```text
<widget>
  <form-visual id="voiceRef" label="Please choose a voice and listen to its preview" media-kind="audio" required="true">
    <visual-option value="<voiceRef>" name="<voice name>"
      media="<previewUrl>" media-kind="audio" summary="<voice traits>"/>
    <visual-option value="clone_voice" name="Clone a voice"/>
  </form-visual>
  <form-textarea id="script" label="Please confirm the script" required="true" default="<script>"/>
</widget>
```

If the source began as a user video, ask whether the user wants that video's voice.
If yes, follow the Voice Skill's explicit voice-cloning authorization flow before
using it. An attachment alone is not permission to clone. If no, continue with the
normal voice picker.

An existing project audio asset may drive the avatar directly. When audio is the
speech source, do not invent or require text unless the user also wants a transcript
or script review.

### Resolve a script only for text-driven generation

The script may be pasted by the user, derived from selected project material, or
written collaboratively. When drafting:

1. Ask only for missing intent such as audience, goal, tone, facts, and duration.
2. Produce the complete proposed script.
3. Let the user edit it or approve it explicitly.
4. Submit exactly the confirmed content.

Each explicit text segment must contain 1–5000 characters. Omit explicit segments
for an ordinary script so the backend generates one continuous video up to 5000
characters. Use explicit segments only when the user requests meaningful paragraph
or shot boundaries. Longer text is split automatically and may create at most 10
segments. Never summarize, translate, drop, duplicate, or reorder content to fit a
limit. Preserve wording and
punctuation; non-semantic line whitespace may be normalized automatically.

Text-driven avatar generation is limited by the 5000-character segment boundary,
not by an estimated audio duration. ChatCut TTS and cloned voices are rendered to
audio before avatar-video submission. Long audio-backed text is prepared as smaller
ordered segments, and each generated audio file is validated from its real duration.
Existing project audio longer than 600 seconds is automatically split into ordered
parts before submission. Pass the original asset once; never split it manually or
submit one generation call per part. If a progress update is useful, say only that
ChatCut is splitting the long audio while preserving the complete content and order.
Do not add implementation details about where or how the work runs, and never expose
hidden derived audio assets. Never shorten or summarize approved content to satisfy
these limits.

### Resolve output settings from intent and available defaults

Preserve the selected avatar's original framing by default: omit `aspectRatio` and
let the backend resolve it to `auto`. Never use the current project ratio as the
avatar-video default. If the user explicitly asks for a different ratio, pass that
request instead.

For an official catalog avatar, resolve the default from the `hasBackground` field
returned by `manage_avatar action="catalog"`:

- `hasBackground: true` — pass `removeBackground: false` and preserve the original
  scene.
- `hasBackground: false` — pass `removeBackground: true` so the result is a
  transparent WebM when transparency is supported.

For a saved/custom avatar without catalog metadata, keep `removeBackground: false` as
the default and preserve the source image background. Pass `removeBackground: true`
only when the user explicitly asks for a transparent background or background removal.
Do not turn this into a blocking question. Before submission, briefly tell the user
whether the original scene will be preserved or the result will be transparent. An
explicit user request overrides the catalog default. If transparency is unsupported,
explain the limitation and keep the original background.

Do not promise crop, background removal, motion control, transparency, resolution,
or prompt-based identity creation until the live capability response confirms it.

### Submit as soon as the required constraints are resolved

Summarize the resolved avatar, voice or audio source, script state, aspect ratio, and
resolution before the first generation when any choice remains consequential. Then
call `submit_avatar_video` once.

Treat long-script output as an ordered batch of avatar-video segments, not as one
audio file or one opaque job. After submitting, tell the user that generation has
started and end the turn. Never keep the turn open for it: no Bash sleep and no
repeated `track_progress` or `manage_avatar action=get-batch` reads. When a follow-up
step in this request needs the completed videos and `track_progress` describes
`action=wait` as registering an automatic follow-up, call it once with the jobIds and
a note, then end the turn. The project library shows the in-progress generation and
receives the completed video assets in the background.

Call `track_progress` in a later user turn only when the user asks for status or resumes
a follow-up step that depends on the completed asset, such as placing it on the timeline
or reviewing the result. When a job is still non-terminal, say that generation is still
running without quoting its numeric progress: provider progress values are coarse
internal stages, not user-facing completion estimates. Use `manage_avatar
action=get-batch` when ordered segment and attempt state is needed. Keep the stable
segment key and original order.

For a failed segment, offer a targeted retry. Do not resubmit successful segments or
the entire batch without the user's instruction. Use the management tool for supported
segment regeneration, removal, reordering, attempt selection, and acceptance.

Generated results become normal ChatCut video assets. Add them to the timeline only
when the user requested placement or it is clearly part of the active editing task.
Do not export unless asked.

## Provider Selection

Provider selection is an internal ChatCut backend detail. Always call the
ChatCut-native tools and let the backend construct provider requests, resolve private
IDs, enforce capabilities, and persist results. Never call an underlying provider API
or CLI directly from this skill.

Select only through ChatCut capabilities, catalog results, saved bindings, and the
native tools. User-facing language is limited to concepts such as:

- **Official avatars** and **My avatars**
- **Official voices**, **cloned voices**, and **project audio**
- **Photo avatar** and **synthetic avatar**

Provider names, engine or model names, provider-specific avatar or voice IDs, raw
provider URLs, request payloads, and provider error messages are internal. Never show
them in prose, option labels, progress updates, or failure messages. Translate failures
into actionable product language while preserving the real status.

Do not route around ChatCut's feature gates, quotas, billing checks, safety policy,
catalog visibility, or provider registry.

## Consent and Safety

A real-person photo avatar requires an explicit affirmative confirmation immediately
before creation. Use the user's language and keep the meaning exact. For Chinese:

> 我确认拥有该肖像，或已获得创建和使用该数字人形象的授权，并承诺不将其用于
> 冒充他人、欺诈或其他违法用途。

For English:

> I confirm that I own this likeness or have permission to create and use this
> digital avatar, and I will not use it for impersonation, fraud, or unlawful activity.

En español:

> Confirmo que soy titular de los derechos sobre esta imagen o que tengo permiso para crear y usar este avatar digital, y no lo utilizaré para suplantar identidades, cometer fraude ni realizar actividades ilícitas.

Do not infer consent from an upload, a previous unrelated confirmation, ownership of
the project, or a third party's instruction. Record consent only through the native
tool's consent fields. Synthetic prompt-created identities do not require real-person
likeness consent unless the prompt or references identify a real person.

Refuse non-consensual impersonation, deceptive identity use, fraud, harassment,
sexual exploitation, or attempts to evade safeguards. Do not create a real-person
identity from uncertain authorization. Voice cloning has a separate consent gate;
follow the Voice Skill even when avatar consent was already obtained.

## Verification

Before reporting success, verify through live tool results:

1. The chosen identity revision was ready when submitted.
2. The job or batch reached a completed terminal state and returned output asset IDs.
3. Every expected segment key exists exactly once and appears in the confirmed order.
4. Text-backed segment manifests preserve the confirmed wording and punctuation,
   allowing only documented non-semantic whitespace normalization.
5. The generated videos exist as usable project or media-library assets.
6. Any requested timeline placement is present and ordered correctly.

Preview the generated assets or composed timeline when visual verification is available.
Do not claim the face, lip sync, framing, or background looks correct from status fields
alone. If visual inspection is unavailable, say what was structurally verified.

## Hard Rules

- Never expose provider, engine, or model identity to the user.
- Never call an underlying provider directly or construct provider payloads in the
  conversation layer.
- Never invent an avatar, voice, capability, usage count, saved binding, or asset ID.
- Never generate from a non-ready identity revision.
- Never treat a video as a supported identity source without an explicit live capability;
  prepare a representative still for the current photo-avatar contract.
- Never pass an external source URL to avatar creation; import the source into the
  target ChatCut project first.
- Never infer likeness consent or voice-cloning consent from an attachment.
- Never clone a video's original voice without the Voice Skill's explicit authorization.
- Never silently rewrite, translate, truncate, reorder, or duplicate confirmed script text.
- Never ask for information already available from the project, attachment, or live tools.
- Never run a fixed wizard or ask for avatar, voice, script, ratio, and resolution in a
  preset sequence; resolve only what the current user action still needs.
- Ask one most important missing question at a time; prefer structured visual choices.
- Never show provider-private IDs, URLs, payloads, or raw errors in user-visible output.
- Never bypass ChatCut tools, feature gates, billing, quota, or safety checks.
- Never retry a whole successful batch because one segment failed.
- Never claim visual quality without inspecting the generated result.
- Never place media on the timeline or export it unless the task calls for that action.
- For official catalog avatars, obey the returned `hasBackground` default: preserve a
  configured scene background and remove a configured absent background. For
  saved/custom avatars, preserve the source background unless the user explicitly asks
  for transparency or background removal. Explicit user intent always overrides either
  default.

---
name: digital-human
description: |
  Create and manage script- or audio-driven AI avatar videos from an official or
  saved presenter, an imported portrait, or a representative still prepared from
  video. Use for 数字人、数字分身、虚拟人、照片开口说话、人像口播、改稿不重拍,
  AI avatar, AI avatar video, avatar video, talking avatar, talking photo, photo
  avatar, video avatar, AI presenter, virtual presenter, virtual spokesperson,
  digital human, or a person's digital twin, including choosing or creating the
  avatar and deciding its voice, script, aspect ratio, and output quality. Do not
  use for a static profile-picture avatar, game or 3D character creation, an
  industrial digital twin, ordinary B-roll, generic image-to-video, video
  translation, talking-head editing, lip-sync dubbing alone, or TTS-only requests.
user-invocable: true
---

# Digital Human

Create a reusable presenter identity or generate a lip-synced presenter video
without exposing the underlying provider. Treat avatar selection, speech, script,
format, consent, generation, and verification as one stateful conversation.

## When to Use

Use this skill when the user wants to:

- Make an official or saved AI avatar, talking avatar, or virtual presenter speak.
- Turn a consented portrait into a reusable digital-human identity.
- Use a representative still from an imported video as a photo avatar.
- Create a synthetic AI presenter from a description, when live capabilities allow it.
- Draft or revise the narration for a digital-human video.
- Regenerate, reorder, remove, retry, or accept segments from an avatar-video batch.

Treat **AI avatar** as the broad default English concept. **Digital twin** means a
reusable likeness of a specific real person; **photo avatar** or **talking photo**
means a still-image source; **AI presenter**, **virtual presenter**, and **virtual
spokesperson** describe the presenter's role. **Digital human** is valid but is often
used for broader enterprise or interactive experiences.

Route adjacent requests elsewhere:

- Speech, voice audition, or voice cloning without avatar video: use the Voice Skill.
- Ordinary footage cleanup or presenter editing: use the Talking Head Guide.
- Generic image-to-video or video generation without a speaking avatar: use the
  Video Generation Skill.
- Translation or dubbing of an existing video: use the dedicated translation or
  dubbing workflow when available.

## Required Inputs

Resolve these slots before submission, but do not ask for them in a fixed order:

1. **Target project** — use the active project when it is unambiguous.
2. **Avatar identity and ready revision** — an official avatar, a saved avatar, or
   a newly created photo or synthetic avatar.
3. **Speech source** — one exact available voice, one cloned voice, or one imported
   audio asset. A text-driven source also requires the final script.
4. **Final script** — preserve the user's wording and punctuation. Show any AI-written
   draft in full and let the user edit or approve it before generation.
5. **Aspect ratio** — `auto`, `1:1`, `4:5`, `5:4`, `9:16`, or `16:9`. Explicit user
   choice wins; otherwise omit it so the backend uses `auto` and preserves the
   selected avatar's original framing. Do not substitute the current project ratio.
6. **Resolution** — `1080p` by default; use `720p` when requested or when live
   capabilities require it, and explain any fallback.
7. **Optional controls** — motion guidance only when the live capability response
   says it is supported. For an official catalog avatar, use its returned
   `hasBackground` value: preserve the original scene when true and request a
   transparent background when false. For a saved/custom avatar, preserve its original
   background by default. Request a transparent background only when the user explicitly
   asks to remove the background or use transparency. Do not ask the user to choose a
   background mode; briefly state the resolved default before submission. An explicit
   user request to preserve or remove the background always wins.

For avatar creation also resolve:

- A non-empty name. Keep numeric validation limits out of the question label;
  only explain a limit if the submitted name actually fails validation.
- One final avatar-creation source: an imported JPEG/PNG portrait, a
  representative JPEG/PNG still prepared from an imported video, or a prompt
  for a synthetic identity when supported.
- Explicit consent when a real person's likeness is involved.

Do not pass a video directly to photo-avatar creation unless the live capability
contract explicitly supports it. For an imported video, use the host's prepared
representative still or help select a clear, unobstructed, front-facing frame, then
use that image asset as the source.

When a user attaches or references a video containing a person and says "this
avatar", "this person", "use her/him", `这个形象`, `这个人`, `用她`, `用他`, or an
equivalent phrase, resolve the person in that exact attachment as the intended
likeness source. Do not treat the attachment as the requested speech source merely
because it has audio or a transcript. If the user also supplies a new topic or an
approved script, that new topic or script wins; do not read or reuse the video's
spoken content unless the user explicitly asks for it.

The attached video is a prospective avatar source, not a ready `identityId`. Enter
the video-to-avatar creation flow: prepare a clean representative still, obtain the
required likeness consent, create the identity, and then reuse that identity for the
requested generation. Do not show official or saved avatar choices while this
prospective source remains valid. Offer other identities only when the user declines
to use the person in the video or no eligible face frame can be prepared.

If "this" could reasonably mean the person's likeness, the video's existing pixels,
or its spoken content, ask exactly one targeted clarification before choosing a
workflow: "Do you want to use the person in this video as the avatar and have them
speak your new script?" Do not replace this with a generic "What do you want to do
with this video?" question.

When the user is about to upload or pick a video for avatar creation, tell them up
front that the chosen frame must show the face clearly with nothing covering it — no
burned-in subtitles, captions, watermarks, stickers, or hands over the face — and
prefer a frame with a neutral, front-facing pose. Never upload an inspection contact
sheet or any preview that carries an overlaid time label as the avatar source; use a
clean frame with no added markings.

A video source also carries the person's voice. After the avatar is created from a
video, offer to clone that voice from the same video so the avatar speaks with it:

1. Run the Voice Skill's cloning flow (`manage_custom_voice action=clone` with the
   video's asset and explicit voice-cloning consent — likeness consent alone does
   not cover the voice).
2. When the cloned voice is ready, call
   `manage_avatar action=set-default-voice identityId=<avatar> voiceRef=<cloned voiceRef>`
   so it becomes this avatar's saved default voice.
3. Later generations with this avatar should use the returned `defaultVoiceRef` by
   default, while still letting the user pick another voice.

This is an offer, not an automatic step: skip it when the user declines or the video
has unusable audio (music, multiple speakers, heavy noise).

## Workflow

This is an intent-driven constraint resolver, not a linear wizard. Do not walk the
user through every section or ask for fields in a preset order.

On every turn:

1. Extract all facts already supplied by the user, attachments, active project,
   selected media, saved avatar state, and prior answers in this request.
2. Resolve deictic phrases such as "this", `这个`, `这个形象`, and `这个人` against
   the attached or selected media and the user's action words before inferring a
   generic media workflow.
3. Infer the user's immediate requested action: explore, choose, create, revise,
   generate, inspect progress, retry, reorder, remove, accept, place, or export.
4. Compute only the blockers for that action. Defaults and live saved bindings count
   as resolved unless they conflict with an explicit request.
5. If nothing blocks the action, execute it immediately.
6. Otherwise ask about the single most important missing or ambiguous constraint,
   preferably with structured choices, then recompute from the new state.

For example, a user who names a ready avatar, supplies approved text, and accepts its
saved voice should not be asked to choose them again. A user inspecting a running
batch does not need to resolve a new script or aspect ratio. Consent is requested only
for the creation or cloning action that needs it.

### Load live capabilities and state when relevant

Use `ToolSearch` to load `manage_avatar` and `submit_avatar_video` if they are not
already visible. Call `manage_avatar` for live capabilities before
offering creation or advanced options.

If the user has neither selected an exact identity nor supplied a prospective
likeness source, list the current official and saved identities before recommending
one. Do not infer availability from chat history, examples, or provider knowledge.
For official avatars, use the live catalog's `tags` as factual selection filters and
its `description` as recommendation guidance. Match those fields against the user's
requested presenter and use case, and never infer a missing age, gender, ethnicity,
role, setting, or capability from the preview's appearance.
For the empty saved-avatar recommendation state, call the official catalog with
`limit: 5`; do not page through the catalog or turn a full catalog page into one
recommendation form.

An avatar attached from ChatCut's Digital Humans library or native visual picker is
already an exact selection. Reuse its attached ChatCut `avatarId` as `identityId`
across later confirmation and retry turns. An official attached identity is directly
usable by `submit_avatar_video`; it does not need to be imported or rediscovered in
the first catalog page. Before resolving speech for an attached identity, call
`manage_avatar` with `action: get` and that exact ID unless a live result in the
current turn already supplies its `defaultVoiceRef`. Never reject or replace an
attached avatar just because it is absent from the five-item recommendation page.

Only use identities and revisions reported as ready. Pending, failed, deleting,
deleted, or orphaned identities are not valid generation inputs.

If the digital-human tools are unavailable, explain that this generation capability
is not connected. Do not silently substitute generic video generation or call the
backend HTTP routes directly.

### Resolve the avatar when it is missing or invalid

Respect an explicit user choice. Otherwise:

- A person-containing video explicitly or provisionally resolved as the likeness
  source: continue the video-to-avatar creation flow. Do not enter the generic avatar
  picker and do not ask the user to choose among saved or official identities.
- No ready saved avatar: show at most five suitable official avatars and include the
  reserved **create** card in the same choice surface. This is a strict empty-state
  contract: never render a sixth official recommendation, and never omit the
  creation option merely because official avatars are available.
- Ready saved avatars exist: show them first (up to five total cards), then the
  reserved create card.
- Exactly one ready saved avatar: offer it first and ask whether to use it.
- Multiple ready saved avatars: prefer higher live usage count; when counts tie, prefer
  the newest creation. If usage metadata is absent, rank by newest creation only;
  never invent a frequency.

Load `widget-forms` for avatar selection. In GitHub Copilot CLI, surface live
preview video or image through a safe host-native capability when available,
then use one `ask_user` single-choice field. Map each live identity's exact
`identityId` to its current name, place ready saved avatars before official
recommendations, and keep `create_avatar` as the final label-only action.
Never emit raw ChatCut widget tags or invent identity ids or preview media.
Ask one most important missing question at a time and do not repeat answered
questions.
For a saved identity whose `list` row has no preview URLs, call
`manage_avatar action=get` for that exact candidate before presenting it; use
the selected ready revision's returned preview media and do not invent or copy
media from another avatar. If the user selects `create_avatar`, continue with
the attachment and creation flow below.

Creating an identity is separate from generating a video:

1. Resolve the source or prompt and name.
2. Obtain required consent.
3. Create the identity through `manage_avatar`.
4. Poll until it is ready or terminal.
5. Save it under **My avatars**. Do not auto-generate a video merely because avatar
   creation succeeded.

Copilot forms do not provide ChatCut's native avatar upload control. Ask the
user to attach one JPEG or PNG portrait to the conversation, collect the avatar
name through `ask_user`, then use `asset-import` and pass the returned ChatCut
image asset id to `manage_avatar`.

### Resolve speech only when the requested action needs it

For an official avatar, never silently use its paired voice and never
immediately open the broader voice catalog. When the live result provides
`defaultVoiceRef` and the user has not already made this choice, use
`widget-forms` to ask one blocking choice in the conversation language: use the
avatar's official built-in voice or choose another voice. Stop and wait. If the
user accepts, resolve speech with that exact `defaultVoiceRef` and do not call
`manage_avatar action=voices`. Call `action=voices` only after the user chooses
another voice, or when the live identity has no `defaultVoiceRef`.

For a saved or newly created avatar, reuse its saved voice binding when present and
confirm it; otherwise offer available voices. When the user settles on a voice they
want this avatar to keep, save it with `manage_avatar action=set-default-voice`;
`list`/`get` then return it as the avatar's `defaultVoiceRef`.

For voice discovery, audition, or cloning, follow the Voice Skill and reuse its live
voice list, consent gate, and generated voice asset. Do not duplicate voice-cloning
logic here.

When an exact voice still needs to be selected, use the exact `voiceRef`
returned by `manage_avatar` as the submitted value:

- A voice without a returned playable `previewUrl` must be omitted from an
  audition shortlist rather than presented as though it were playable.
- When the user wants to audition voices, prefer up to five suitable available
  official, preset, or custom voices that actually include `previewUrl`.
  Surface those previews through a safe host-native capability, then use one
  required `ask_user` string field whose stable values are the exact
  `voiceRef`s. `hasPreview: true` without `previewUrl` is not playable and must
  not be presented as an audition option. Always append `clone_voice`,
  localized to the conversation language, as the final label-only option.
- An official avatar's paired default voice may still be used without listing the
  broader official voice catalog. Do not show that default voice as an audition
  card unless an actual audio `previewUrl` was returned for it. Never reuse the
  avatar image or video URL as a voice preview.
- Copy each returned `previewUrl` exactly. In particular, keep
  `/voice-samples/...` root-relative; do not expand it to `chatcut.com` or invent
  another host.
- When script text is also being confirmed, ask for `voiceRef` and `script` in
  one `ask_user` form. Keep each exact `voiceRef` as the option value, use the
  localized voice name as its label, and prefill the script in a free-text
  field. Do not make the user type a voice name into the script field.

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
started and end the turn. Never call `track_progress`, `manage_avatar action=get-batch`,
or add a Bash sleep in the same turn merely to keep the turn open, including when a
queued follow-up step will eventually need the completed asset. The project library
shows the in-progress generation and receives the completed video assets in the
background.

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

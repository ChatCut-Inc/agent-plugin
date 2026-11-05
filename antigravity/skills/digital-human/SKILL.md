---
name: digital-human
description: Create and manage script- or audio-driven AI avatar videos from an official or saved presenter, an imported portrait, or a representative still prepared from video. Use for 数字人、数字分身、虚拟人、照片开口说话、人像口播、改稿不重拍, AI avatar, AI avatar video, avatar video, talking avatar, talking photo, photo avatar, video avatar, AI presenter, virtual presenter, virtual spokesperson, digital human, or a person's digital twin, including choosing or creating the avatar and deciding its voice, script, aspect ratio, and output quality. Do not use for a static profile-picture avatar, game or 3D character creation, an industrial digital twin, ordinary B-roll, generic image-to-video, video translation, talking-head editing, lip-sync dubbing alone, or TTS-only requests.
user-invocable: true
---

Before using this skill, read [the required continuation](references/avatar-generation-safety-and-verification.md) in full. It is part of this skill and contains mandatory workflow, tool-contract, and safety instructions; do not act from this entry file alone.


# Digital Human

If `manage_custom_voice`, `manage_avatar`, or `submit_avatar_video` are not loaded yet, load them with `ToolSearch` before calling them, so you use their real parameters instead of guessing.

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

In embedded ChatCut, avatar identity selection is media-preview-only and is a strict exception to the generic
single-branch `<choices/>` rule. Always use visual cards through the Widget Forms
Skill, including when exactly one ready saved avatar exists. Never ask a text-only
category question such as "use the saved avatar" versus "browse official avatars",
and never use `<choices/>`, `<form-single>`, or label-only identity cards for avatar
selection. For an avatar card in ChatCut's native widget — official or the user's own
saved avatar — write only its exact `identityId` as `avatar-id`; the host resolves the
current name, preview video or fallback image, aspect ratio, and submitted value from the live avatar
identity even when the tool payload does not expose a preview URL. Never copy `value`,
`name`, `media`, or `aspect-ratio` onto an `avatar-id` option. If the host cannot
resolve preview media, omit that identity rather than falling back to text. Prefer
the live preview video when available and use the preview image only as its poster
or fallback. When
the user has ready saved avatars, place their cards before official recommendations.
Ask one most important missing question at a time and do not repeat answered questions.

The raw tags and visual-card requirements below describe embedded ChatCut only. In Antigravity, the `widget-forms` host adapter takes priority: use concise text choices with stable `identityId` values mapped internally to returned names and descriptions, and direct the user to ChatCut's Digital Humans library for previews. Never emit raw ChatCut tags or promise chat avatar video. Preserve the separate `create_avatar` value; it returns to this workflow for a conversation attachment plus `asset-import`, rather than automatically opening a native dialog. This adapter changes presentation only; identity readiness, required inputs and consent checks remain mandatory.
For a saved identity whose `list` row has no preview URLs, call `manage_avatar
action=get` for that exact candidate before rendering it; use the selected ready
revision's returned preview media and do not invent or copy media from another avatar.

One reserved label-only option value opens a native editor surface instead of
submitting an answer. Write it with no `media`:

- `create_avatar` — opens the native creation dialog where the user uploads a photo
  and creates a personal avatar. Keep its card label a short "create your own
  avatar" phrase (e.g. 创建专属数字人); do not mention uploading a photo — the
  dialog explains that itself.

Clicking that card does not produce a form answer. When the user finishes in the
native dialog, their chosen or newly created avatar is sent back automatically as
this question's answer with the avatar attached; treat that reply as the avatar
selection and do not re-ask.

The selection shape is therefore one `<form-visual>` containing up to five avatar
preview cards (saved first, then official) followed by the creation card. Localize
the visible question and card label to the conversation language:

```text
<widget>
  <form-visual id="avatar" question="Please choose an avatar" required="true">
    <visual-option avatar-id="<saved-or-official-identity-id>"/>
    <visual-option value="create_avatar" name="Create your own avatar"/>
  </form-visual>
</widget>
```

Creating an identity is separate from generating a video:

1. Resolve the source or prompt and name.
2. Obtain required consent.
3. Create the identity through `manage_avatar`.
4. Wait until it is ready or terminal. Where `track_progress` offers
   `target=avatar`, call `action=wait` with the `identityIds` and do what its
   result says; otherwise re-read it with `manage_avatar action=get refresh=true`
   in a later turn.
5. Save it under **My avatars**. Do not auto-generate a video merely because avatar
   creation succeeded.

When asking for a portrait in an embedded ChatCut Widget, always mark the upload as an avatar source so
the host uses the same validation, JPEG normalization, private transport storage, and
upload-readiness behavior as the native Digital Humans dialog:

```text
<widget>
  <form-files id="avatar_source" label="Please upload a portrait photo"
    accept="image/jpeg,image/png" purpose="avatar-source"
    multiple="false" required="true"/>
  <form-text id="avatar_name" label="Name this avatar" required="true"/>
</widget>
```

Do not use an unmarked generic `<form-files>` upload for avatar creation.
Published plugin forms do not provide this native upload control. Ask the user to
attach the portrait through their host, then use the Asset Import Skill and pass the
returned ChatCut image asset id to `manage_avatar`.

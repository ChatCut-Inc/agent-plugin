# Agent-driven voice cloning

Use this flow when either:

- the native ChatCut Agent already has a reference the user supplied or
  identified for this cloning request: a readable attachment, a project audio
  or video asset, or a timeline item; or
- an external host such as Codex, Claude, or Grok Bot is cloning. It cannot open the native editor
  dialog, so collect the reference as a conversation attachment and never emit
  `<clone-voice/>`.

The hard gates in the main voice skill still apply: authorization before any
import or clone, no cloning of unrelated project speech, and provider privacy.

## 1. Preflight

Before asking for a name, recording, upload, or consent, call
`manage_voice voiceType="custom" action="check-create-access"` and treat that
fresh result as the creation gate. `list` is not an entitlement check;
`check-create-access` is what shows the runtime's upgrade card to an
ineligible free account.

- Free account with `freeTrialAvailable:false`: do not collect another
  reference. Explain that the Free cloned-voice slot is in use and the user must
  delete that voice or upgrade. The runtime's upgrade card is the purchase
  path; never invent a purchase URL or keep cloning behind it.
- Paid account with `activeVoiceCount >= voiceSlotLimit`: do not collect
  another reference. Say how many voices are active and that the plan limit is
  reached, then offer to upgrade (upgrade card) or to continue with an existing
  voice. Do not clone until the user upgrades or frees a slot.
- Otherwise continue. Do not use `providerAvailable:false` to block intake; the
  clone call is the authoritative availability check. If cloning itself fails
  as unavailable, say it is temporarily unavailable and keep the submitted name
  and reference asset in context for a later retry.

A stale preflight never overrides the clone call. If `clone` returns
`FEATURE_NOT_INCLUDED` or `CUSTOM_VOICE_QUOTA_EXCEEDED`, use the matching
explanation above and do not retry automatically.

## 2. Identify the reference

Reuse a reference already supplied for this request while it is still
readable; never ask the user to re-record, re-upload, or reselect a readable
reference. A deleted project asset cannot be cloned from again, so then ask for
a new reference through the intake below. Identifying a source is not
authorization: do not import or extract anything until step 4 passes.

- Timeline item the user chose: resolve it and its source range with
  `preview_timeline`.
- Project audio asset or readable attachment: note it for step 5.
- No readable audio: ask for it through the intake below.

Supported formats are AAC, FLAC, M4A, MP3, OGG, WAV, and WebM, 10 seconds to 3
minutes long. Recommend 30-60 seconds of clean solo speech without music,
reverb, or background noise. For a source over 3 minutes plan a clean 30-60
second excerpt; under 10 seconds, ask for a longer reference.

## 3. Intake

Explain in one sentence that the reference will be securely processed to
create a reusable cloned voice. Do not name the underlying service.

Load `widget-forms` and request only the missing fields of this host-neutral
contract, in one intake when the host supports media fields:

- `voice_name`: `short_text`, required.
- `voice_reference`: `audio_reference`, exactly one, only when no usable
  reference has been resolved.
- `preview_text`: `short_text`, editable, at most 100 characters, prefilled
  with the localized default preview text.
- `voice_consent`: `explicit_consent`, required, initially unselected, using
  the exact authorization text.

If the host collects attachments separately, follow its adapter; attaching a
file is never consent. Do not re-ask a field the user already supplied clearly
for this request, and do not ask the user to name the reference's language.

Use the authorization text and default preview text listed in the main voice
skill's Cloning section, verbatim, in the conversation language (the
authorization text matches the Create Voice dialog).

## 4. Authorization gate

After the intake returns, check that the user affirmatively submitted that
exact authorization option. Until it is present, stop: do not import the
reference, do not call `clone` or `preview`, and do not say cloning has
started. A name, an attachment, a generic "yes", an earlier unrelated approval,
or other completed fields are not authorization. If it is missing or
ambiguous, ask only for the full authorization again and wait.

Preview text: trim it; if blank, use the default preview text. It must be 1-100
characters. If it is longer, ask the user to shorten it; never truncate it or
swap in the default. Keep the user's wording. Do not add delivery cues to it
for the user, but keep cues they wrote themselves.

## 5. Prepare the audio and clone

Cloning here accepts a ChatCut audio asset only:

- An audio asset within the limits is used directly.
- For video or an over-long source, copy the file into your workspace with the
  current host's asset download tool, extract the chosen range as supported
  audio with ffmpeg, then import the result with the `asset-import` skill.
- For an attachment the host returned as a file rather than an asset id, load
  `asset-import`, import it into the targeted project, and use the returned
  audio asset id.
- Never pass a local path, attachment URL, or raw bytes to `manage_voice`.

Call `manage_voice voiceType="custom" action="clone"` with the resolved audio
asset id, the submitted name, the preview text, and the consent confirmation
(see the tool description for fields). Pass `languageCode` when the
reference's spoken language is known, for example from its transcript or the
user's own words; otherwise omit it and the backend uses the transcript
language. Ask the user for the language only if the tool says it is required.

The call waits for cloning and the preview. Then render one display-only
`playable_preview` with `widget-forms`: the full `customVoiceId` as its value,
the submitted name, the preview text as its summary, and the exact returned
`previewUrl` as audio. Never put the URL in prose, emit raw `<audio>`, or use a
Markdown audio link.

Right after the preview, ask one branch decision with `<choices/>`, not another
form: `Retry` / `重试` / `Reintentar` or `Apply` / `应用` / `Aplicar`. Keep the
`customVoiceId`, name, preview text, `previewUrl`, and returned `voiceRef`
mapped in context while waiting.

- **Retry:** collect a replacement recording or upload for this same voice. Do
  not use another slot and do not discard the previous ready voice until the
  replacement succeeds. If the tools cannot replace the source in place, say so
  instead of creating a second voice.
- **Apply:** keep this voice selected and continue. Call `submit_voice` with its
  exact `voiceRef` only when the user asks for final speech. Generation checks
  current access and readiness. On `FEATURE_NOT_INCLUDED`, do not synthesize
  through another route: the free clone can be previewed, while final narration
  requires current plan access and the runtime shows the upgrade card.

## 6. Plan rules

The backend is authoritative for all of these:

- Free accounts can make one clone and hear its preview, but cannot use it for
  final narration.
- A ready or processing cloned voice occupies one slot; the tools report the
  slot count and limit.
- Final cloned-voice narration costs normal voice-generation credits, charged
  only after success.

If `submit_voice` returns `FEATURE_NOT_INCLUDED`, say that final narration with
a cloned voice requires Pro. Do not retry, switch voices, or route around the
check with another tool; invite the user to upgrade and try again. For a quota
error on a paid account, say it has `activeVoiceCount` voices and has reached
its plan limit of `voiceSlotLimit`, and offer to upgrade or continue; do not
use the free-plan paywall wording.

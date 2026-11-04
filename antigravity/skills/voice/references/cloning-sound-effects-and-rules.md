## Custom Voice Cloning

Voice cloning is a separate consented flow. Proactively offering it during
voice selection is required and is not the same as starting a clone. Never
clone a third party's voice merely because a clip is present in the project.

### Agent-driven cloning from an available reference

Use this flow in either of these cases:

- the host already has a readable attachment or accessible ChatCut audio asset
  that the user supplied for this cloning request; or
- the host collects the reference as a new conversation attachment.

Never call the clone action until the user submits explicit permission. ChatCut
durably archives every submitted clone-source recording in its own user-file
storage before Fish Audio registration. This source is retained for future
provider migration even if the project asset is later deleted; never ask a
user to re-record or reselect an already accessible reference merely to create
the voice.

After the user chooses `clone_voice` or otherwise explicitly asks to clone from
an already available reference, resolve any reference already supplied for this
cloning request before asking for another upload. Do not use
`providerAvailable:false` to block intake; the provider integration may be
enabled after the choice was rendered, and the clone action is the
authoritative availability check. Use entitlement and slot fields to explain
an upgrade or a full quota before asking for unnecessary inputs when the
account cannot create another clone. If the clone action itself returns
`CUSTOM_VOICE_PROVIDER_NOT_CONFIGURED`, explain that cloning is temporarily
unavailable and keep the requested name and imported reference asset in context
so the flow can be retried later.

Before asking for a name, recording, upload, or consent, call `manage_voice
voiceType="custom" action="check-create-access"` and treat that fresh result as
the authoritative creation preflight. Do not use `list` alone as an entitlement
check: `check-create-access` deliberately emits the runtime's feature-gated
upgrade card for an ineligible free account.

- Free account with `freeTrialAvailable:false`: do not collect another
  reference. Explain that the Free custom-voice slot is occupied and that the
  user must delete the existing voice or upgrade to create another. Use the
  feature-gated upgrade card returned by the runtime. Do not
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
`manage_voice voiceType="custom" action="clone"` or `action="preview"`, and do
not claim that cloning has started. A supplied name, an attachment, a generic “yes”, a
previous unrelated approval, or other completed fields are
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
attachment URL, or raw bytes to `manage_voice`. If no readable audio is
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
manage_voice({
  voiceType: "custom",
  action: "clone",
  sourceAssetId: "<uploaded audio asset id>",
  name: "<submitted voice name>",
  confirmedConsent: true,
  previewText: "<submitted preview text or localized default>",
});
```

The tool waits for both cloning and preview generation. After it returns a ready
voice and `previewUrl`, do not render, download, attach, link, or expose that audio
in Antigravity. Tell the user that the cloned-voice preview is ready in ChatCut, provide
the clean editor link from the project workflow, and ask them to listen there.

Then ask for one text decision: `Retry` / `重试` / `Reintentar`, or `Apply` /
`应用` / `Aplicar`. Keep the full `customVoiceId`, submitted name, submitted
`previewText`, and `previewUrl` mapped internally while waiting.

- `Retry` means collect a replacement recording or upload for this same voice;
  do not consume another slot and do not discard the previous ready voice until
  replacement succeeds. If the current tool surface cannot replace the source
  in place, explain that limitation instead of creating a second voice.
- `Apply` means select the cloned voice for the current AI draft/request. Call
  `manage_voice voiceType="custom" action="apply"` with the selected
  `customVoiceId`. This action performs the authoritative Pro/readiness check without generating
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

Use `manage_voice action="list" voiceType="all"` for the current unified voice
candidate list, localized display names, previews, and submission ids.

### Voice presets are provider-specific — do NOT mix them

Official voice ids are provider-specific. Always keep the returned `provider`
and `voiceId` together; mixing values from different catalog tuples will fail.

If you need a specific voice and a particular language:

- For any narration language, query the catalog with that `language` and use a
  returned provider/voice pair. Do not guess a raw provider id.

## Hard rules — what you must NOT do

1. Never use a voice preset name from a different provider.
2. Never render official voice recommendations before the mandatory custom
   voice `list` gate when no concrete voice was named.
3. Never use explicit or inferred voice traits to exclude a ready custom voice
   from the combined choice set.
4. Never omit the final clone action option from an ordinary voice recommendation
   or selection list.
5. Never submit TTS when the voice is only described broadly and the user has
   not confirmed a concrete preset.
6. Never recommend or render a TTS voice option before calling `manage_voice
action="list" voiceType="all"` for the current request.
7. Never claim stable age, regional accent, pronunciation dictionary, or exact
   duration controls; the current tool does not expose those as reliable fields.
8. Never replace original recorded speech with TTS unless the user asks.
9. Never import or clone a reference voice until the user has affirmatively
   submitted the full ownership/permission and lawful-use commitment required
   by the cloning intake. Never infer this confirmation from an attachment,
   another completed field, a generic approval, or prior unrelated context.
10. Never bypass cloned-voice Pro checks by passing a provider voice id to
    `submit_voice` or another generation tool.
11. Never ask the user to reselect audio when
    the user has already supplied a usable reference for the current cloning
    request. Preflight access, collect the missing authorization, name, and
    preview text, then clone from its ChatCut audio asset id.
12. Never treat unrelated speech already present in the project as a cloning
    reference or as permission to clone it.
13. Never render, download, attach, link, or expose a cloned-voice preview in
    Antigravity. Direct listening to the clean ChatCut editor link, then ask for
    Retry / Apply in ordinary chat.
14. Never emit ChatCut editor-native clone markup. Use the published-plugin
    attachment and consent flow.
15. Never expose Doubao, ElevenLabs, Fish Audio, provider model names,
    provider-specific ids, or provider URLs to the user. Use `official voice`
    and `cloned voice` product terminology, and sanitize provider details from
    visible errors and status messages.

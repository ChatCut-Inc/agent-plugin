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

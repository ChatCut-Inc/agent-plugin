---
name: digital-human
description: |
  Create script- or audio-driven talking-head videos with a user's saved character,
  portrait, or a representative still from video. Use for 数字人、角色口播、数字分身、
  照片开口说话、人像口播, AI avatar, talking photo, AI presenter, or digital twin.
  Choose between direct-to-camera speech and short character performances by the
  requested shot. Do not use for static avatars, game or 3D characters, video
  translation, existing talking-head editing, lip-sync dubbing alone, or TTS alone.
---

# Digital Human

A character is a person saved in the user's My Assets (我的资产) with images, a description,
and an optional voice. Choose how to use that character from the requested shot.
Custom talking-head generation requires a paid plan. If the tool returns a paywall,
explain that requirement accurately; do not substitute another workflow to bypass it.

## Choose the performance

- **Direct-to-camera speech, any length:** use `submit_avatar_video` with
  `characterId`. The first use may require preparing the talking-head appearance.
- **Actions, changing scenes, multiple shots, or just one or two lines:** follow
  `video-gen` and use `submit_video`. Put the character's image URLs in `refImages`,
  main image first, and include the character description in the prompt to keep
  the person consistent. Each generated clip is short, typically about 5–15 seconds.

This choice belongs to the shot, not to the character. One video may use both:
product explanations can be talking-head segments while product scenes use video
generation. If the intent is unclear, ask one question explaining the difference,
for example:

> 你想让角色贴着镜头念稿，还是演动作、换场景？口播长度不限，第一次需要准备形象；
> 视频生成能演动作和场景，但每段很短，约 5–15 秒。

Talking-head generation creates a new performance; it does not preserve an original
video's shots, actions, or timing. For original-content translation use
`video-translation`; for new dialogue over existing footage use `voice` and optional
`lipsync`. Existing footage cleanup belongs to `talking-head-guide`.

## Resolve the character

Reuse the character the user attached through **＋ → 我的资产 → 角色**. Otherwise
read the context's `<assets>` section or call `manage_character action="list"`.
Use the exact `characterId`; call `manage_character action="get"` for its current
images, image URLs, description, and voice. Its `presenter` describes talking-head
preparation state; the submission tool handles that state.

When several characters could fit, ask the user to choose. Widget Forms can show
image choices using each candidate's main image URL from `manage_character get`,
or ask a concise text question. Keep each ID, name, and image from the same returned
character. An already attached character does not need another selection step.
If there are no saved characters, offer to create one from the user's portrait.

Use `manage_character` for `list`, `get`, `create`, `update`, and `delete`:

- Create with `name`, optional `description`, `addImages`, and optional `voice`.
- Each `addImages` entry is `{source, label?}`. `source` is a project asset reference
  or an HTTPS URL. The first image is the main image: a clear, front-facing JPG/PNG
  showing one person.
- Update the selected `characterId` to change its `name` or `description`, add images
  with `addImages`, remove them with `removeImageIds`, or set `mainImageId`.
- Save a voice as `voice: {id, name, provider}` using the selected voice's real
  values; `provider` is `custom`, `doubao`, or `elevenlabs`. Set `voice: null` to clear
  it. Keep provider values internal.
- Use `delete` only when the user requests deleting that character.

For a supplied photo and a request to make it speak, create the character with its
name and main image, optionally save its selected voice, then submit with the returned
`characterId`. Creating the library entry alone does not request video generation.
If an existing character has no main image, ask for a clear front-facing portrait
and save it with `manage_character action="update"` and `addImages` before submission.
Ask for it with a `<form-files>` upload in Widget Forms and save the submitted project
asset reference.

### A person in an attached video

When the user says “this person”, `这个形象`, `用她`, or `用他`, resolve that phrase
against the attachment and the requested action. A video is a prospective likeness
source, not a saved character. Prepare a clean representative JPG/PNG still and use
it in `addImages`. The face must be clear, front-facing, and unobstructed by captions,
watermarks, stickers, hands, or inspection time labels. Do not use a contact sheet.

If the user supplies a new topic or approved script, use that content. The video's
audio or transcript is not automatically the requested speech. If the intended use
is unclear, ask whether they want this person to speak the new script.

Offer to clone the video's voice when useful, following the Voice Skill and its
separate explicit voice-cloning consent. Skip this when declined or when the source
has unusable audio. Once ready, the selected clone can be saved with
`manage_character action="update"` and `voice`; likeness consent does not authorize
voice cloning.

## Resolve only what the next action needs

Reuse the active project, attachments, prior answers, and current character state.
Ask only about the most important remaining blocker; do not run a fixed wizard.
Progress checks do not require resolving another script or output format.

Before talking-head submission resolve:

1. **Character:** the user's chosen `characterId` and a usable main image.
2. **Speech:** final text with the character's voice or an explicit `voiceRef`, or
   a project audio asset containing the exact desired speech.
3. **Script approval:** preserve user-supplied wording and punctuation. Show an
   AI-written draft in full for editing or approval before generation.
4. **Framing:** omit `aspectRatio` to preserve the character image's framing with
   `auto`. Explicit choices may use `auto`, `1:1`, `4:5`, `5:4`, `9:16`, or `16:9`.
   Do not substitute the project ratio.
5. **Quality:** default to `1080p`; use `720p` when requested or required by the
   tool, explaining any fallback.

Omit `removeBackground` unless the user explicitly wants to keep or remove it;
the default preserves the source image background. Briefly state that default
without making it another question. Use `motionPrompt` for requested motion guidance
within the tool's supported behavior. Do not promise unsupported crop, transparency,
resolution, or motion control; report tool limitations plainly.

### Speech and voice auditions

Use `speech: {type:"voice", text}` to use the character's saved voice automatically.
Omitting `voiceRef` uses that binding; do not ask the user to confirm it again.
An explicit voice change overrides it. If there is no saved voice, let the user
choose through `manage_voice action="list"` and save the result with
`manage_character action="update"` and `voice`, or pass the selected `voiceRef`
in `speech` for this generation only. Keep the saved voice object and the returned
submission `voiceRef` distinct; do not invent one from a display name.

For discovery, audition, and cloning, follow the Voice Skill and use voices available
for avatar video. Keep each voice's returned name, reference, and preview together.
Show up to five suitable playable
voices through Widget Forms, with a localized clone-voice action. A `hasPreview`
flag without a playable `previewUrl` is insufficient. Copy URLs exactly and never
use a character's image or video as an audio preview.

Embedded voice choices use `<form-visual>` with `media-kind="audio"` on each
playable option. Do not replace auditions with text-only names. When the script
also needs confirmation, include the voice selector and script field in one widget.
An upload or choice is not voice-cloning authorization.

An existing audio asset drives speech with `speech: {type:"audio-asset", assetId}`.
It is the final spoken content, not a cloning sample. Do not require text unless
the user also wants transcription or script review.

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
or shot boundaries. Longer text is split automatically into ordered
segments; the tool rejects a script that exceeds its segment limit. Never summarize, translate, drop, duplicate, or reorder content to fit a
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

### Submit and prepare the appearance

Summarize consequential resolved choices, then call `submit_avatar_video` with
`characterId` and `speech`. Use `segments`, `aspectRatio`, `resolution`,
`removeBackground`, and `motionPrompt` only as needed. The tool shows the live credit
estimate in a confirmation card before anything is charged; do not calculate a separate
price.

On a character's first talking-head use, the tool may return that the appearance
needs preparation, the credit cost, and a request for authorization without creating
a video. Tell the user that returned cost and ask them to explicitly confirm their
right to use this person's likeness using the consent wording below. After the user
agrees, repeat the same submission parameters with `confirmedConsent: true`.
Do not set it based on a photo upload or character selection.

Preparation takes a few minutes. While it runs the tool says so and tells you how to
continue: tell the user, register the automatic follow-up it names with `track_progress`,
and end the turn. When the follow-up arrives, repeat the same submission parameters
without `confirmedConsent`. Do not report preparation as a completed video.
A paywall means custom talking-head generation requires a paid plan; report it
without claiming that preparation or generation succeeded.

After submission returns generation `jobIds`, call `track_progress` with
`target="generation"`, `action="wait"`, and those `jobIds`, unless the user only
asked to queue work. Follow its wait contract: if it registers an automatic follow-up,
end the turn normally; otherwise await its result. Do not add sleeps or busy polling.
Use `action="status"` for a later progress question. Do not quote coarse numeric
provider progress as a completion estimate.

Keep long-script segments in their original order. To redo a segment, call
`submit_avatar_video` again for that segment with the same character and the intended
speech/settings; do not regenerate successful segments without a request. Arrange,
remove, or replace generated clips on the timeline as the editing task requires.
Keep the old result until the user accepts a replacement. Generated clips are normal
video assets; place or export them only when the task calls for it.

### Completed videos that do not meet the likeness request

A completed avatar video can still fail the user's likeness requirements. When they ask to correct lips, cheeks or other facial proportions, check which changes the actual tools support before offering another generation. Do not describe the same character, photo and audio as a stricter facial correction unless a supported change plausibly addresses that specific correction; describe what will change and its limits. Explain any limitation plainly. A retry may cost credits and may not improve the likeness; retain the existing result until the user accepts a replacement. Honor an explicit, informed retry request, but do not keep proposing paid repeats of unchanged inputs after they have failed. If the user asks to stop, not export, or seek a credit review, follow that request and use the existing support route without requiring another generation or an export.

When a generation tool returns `FEATURE_NOT_INCLUDED` for a `generation.*` feature, use its payer and access details. If the project owner needs Pro, explain that the owner pays and must upgrade; the member's own Pro does not unlock the project. Do not give the member a personal upgrade link or send them to their own billing menu. They can find the owner in the project's existing members view when available. Otherwise share the returned upgrade link, or ChatCut’s avatar menu → Upgrade. Existing credits are preserved and generation still consumes credits after upgrading. This rejection does not charge for generation; existing agent conversation fees are separate, so do not claim the whole conversation was free. Preserve the exact original tool input and project, then stop. Do not automatically search for or substitute stock media; offer alternatives only if the user explicitly asks.

When the user returns with “continue”, “继续”, “jixu”, or says they upgraded, recheck current payer eligibility and credits for the original input with `estimate_generation` when supported, otherwise the original tool’s precheck. If there is no separate precheck, one retry of the original tool lets its server check current access. If eligible, submit the original input once; if still blocked, explain the current blocker and stop. Do not ask the user to choose between the original generation and stock media again or state the old rejection as current status without checking. If a job was already accepted, track it instead of submitting again. Never switch generation tools, providers or services to bypass a gate.

## Consent and Safety

Before preparing a real person's talking-head appearance, obtain explicit affirmative
consent after disclosing the tool's returned preparation cost. Use the user's language
and preserve the full meaning. For Chinese:

> 我确认拥有该肖像，或已获得创建和使用该数字人形象的授权，并承诺不将其用于
> 冒充他人、欺诈或其他违法用途。

For English:

> I confirm that I own this likeness or have permission to create and use this
> digital avatar, and I will not use it for impersonation, fraud, or unlawful activity.

En español:

> Confirmo que soy titular de los derechos sobre esta imagen o que tengo permiso para crear y usar este avatar digital, y no lo utilizaré para suplantar identidades, cometer fraude ni realizar actividades ilícitas.

Do not infer consent from an upload, a prior unrelated confirmation, project
ownership, or a third party's instruction. Pass `confirmedConsent: true` only after
the user's explicit agreement for this preparation. Follow the Voice Skill's separate
consent gate for voice cloning.

Refuse non-consensual impersonation, deceptive identity use, fraud, harassment,
sexual exploitation, or attempts to evade safeguards. Use ChatCut-native tools;
let them enforce access, billing, and preparation state. Do not call provider APIs
directly. Keep provider names, private IDs, URLs, payloads, and raw provider errors
out of user-facing copy; explain the actual failure and next step in product terms.

## Verification

Before reporting success, verify from live results that generation completed and
returned usable video assets, every expected segment is present once in the confirmed
order, and the text preserves approved wording and punctuation. Verify any requested
timeline placement. Preparation or queued jobs alone are not success.

Preview the generated assets or composed timeline when visual inspection is available.
Do not claim that likeness, lip sync, framing, or background looks correct from status
fields alone. State what was structurally verified if visual inspection is unavailable.

---
name: widget-forms
description: Ask for structured ChatCut input using the current plugin host's supported form surface.
---

# Widget Forms Host Adapter

The canonical agent's raw `<widget>`, `<choices/>`, and `<visual-option>` tags render only inside ChatCut. Never emit those tags from the published Codex or Claude Code plugin.

## Semantic contract mapping

This adapter owns how plugin hosts implement a caller's host-neutral form
contract. It does not decide which fields the workflow requires.

Map semantic field types as follows:

- `short_text`: one text input.
- `explicit_consent`: one explicit, initially unselected confirmation control
  using the caller's full localized copy. An attachment or another submitted
  field is never consent.
- `audio_reference`: plugin forms cannot record or upload media. Render the
  other fields, ask the user to attach the audio to the conversation, then load
  `asset-import`. Return the imported ChatCut audio `assetId` to the calling
  workflow; never return a local path, attachment URL, or raw bytes as an asset
  id.
- `playable_single_choice`: one choice surface with stable option values,
  localized labels, and playable media when the host supports it. Keep the
  value-to-label map in context when a host returns the visible label.
- `playable_preview`: one display-only, non-submitting audio surface using the
  exact caller-provided runtime media URL. Use only a host-supported safe media
  renderer; never emit raw `<audio>` HTML or expose the URL as ordinary prose.

## Codex

Call the ChatCut MCP tool `ask_followup_questions`. Put related fields into one form, write visible text in the user's language, and stop after the call until the submitted answer appears in chat. Use the current tool schema for field and option shapes.

Map `playable_single_choice` to one `single` field with `variant:"voice"`.
Use each stable value as the option id and keep its localized label,
description, and `audioUrl` tied to the same caller-provided item. An action
without playable media has no `audioUrl`. For voice selection, preserve the
caller's ready custom voices and official shortlist, followed by the localized
`clone_voice` action and one `__other__` option. Set `otherPlaceholder` for the
user's voice requirements. Other returns to discovery; it does not select a
voice or start cloning/TTS.

Map an MG reference style choice to one `single` field with `variant:"visual"`.
Use the reference ID as the option id, its short title as the label, and the
selected detail's `heroPreview.url` as `preview`. Include one `__other__` option
labeled "Other" in the user's language; the tool supplies its text input. That branch accepts
either a new preference or a request for another batch; do not add a separate
Show more option. Return the selected reference ID to the MG skill; it owns
application. Do not bind `apply_preset` directly to a reference ID.

Example field, replacing the reference placeholders with the fetched shortlist
and localizing the labels:

```json
{
  "id": "mg_style",
  "label": "Choose a Motion Graphics style",
  "type": "single",
  "variant": "visual",
  "options": [
    { "id": "REFERENCE_ID", "label": "TITLE", "preview": "HERO_PREVIEW_URL" },
    { "id": "__other__", "label": "Other" }
  ]
}
```

The Other answer returns to discovery, without applying a style or
starting production. Keep the image-option IDs unchanged in the next step.

Map an AI-avatar identity choice to one `single` field with `variant:"visual"`.
Use the live `identityId` as the option id, the returned `name` as its label,
`previewVideoUrl` as `previewVideo`, and `previewImageUrl` as `preview`. The
image remains the poster and automatic fallback if video loading fails. Keep
both localized `create_avatar` and `__other__` no-media options in the same
field, after the identity cards, and set `otherPlaceholder` for the desired
presenter. The host recognizes this avatar picker and uses 4:5 portrait framing.
`create_avatar` returns to the creation workflow; it does not open ChatCut's
native dialog, so request missing source attachments separately and use
`asset-import`. Other returns presenter requirements for a refined live catalog
search. Neither action is an identity or consent to generate a video.

For ordinary or MG caption style choices, load
[references/caption-previews.md](references/caption-previews.md). Use the live
catalog's exact identities, versions and languages with `captionPreview`; the
MCP App owns rendering and fonts. Always include one `__other__` option with
`otherPlaceholder`; do not add More or a browse-catalog card. The host displays
Other as a labeled card and its input below the choices. Keep previewing,
selection and actual application separate.

Do not call `ask_followup_questions` solely to display a `playable_preview`,
because a passive preview is not a question. Use Codex's supported audio
attachment/media rendering when available. If this host session has no safe
runtime-URL audio renderer, say that the preview is available in the ChatCut
project assets and continue with the caller's separate branch decision; do not
print HTML, a bare URL, or a fake widget tag.

Map `explicit_consent` to a single-select field containing only one confirmation
option. Use the caller's full confirmation copy as its label and do not
preselect it. Mark every blocking field as required and verify every required
answer after submission before continuing.

## Claude Code

Follow the structured-input recipe in `chatcut-plugin-basics-claude`: use one `visualize.show_widget` Elicitation form, submit only through `.elicit-submit`, and wait for the user to send the filled prompt. Never call ChatCut's `ask_followup_questions` in Claude Code because that host does not render its MCP-App result.

Map `explicit_consent` to an unchecked checkbox using the caller's complete
localized copy. Do not add a file chooser for `audio_reference`; request the
conversation attachment outside the form and load `asset-import` after the
user sends it.

For `playable_single_choice`, resolve the official voice's exact returned
`sampleMediaKey` (for example `voice/<voiceId>` or `voice/<voiceId>/ja`) through
`${CLAUDE_PLUGIN_ROOT}/assets/widget-media/manifest.json`. Resolve `entry.path`
against its immutable `baseUrl`. Preserve the language suffix; never substitute
a different voice or language when a key is missing. Use that exact label
without media when a key is absent, and never embed the original source URL.
Keep stable values in the label-to-id map. Runtime/private media URLs are not
public manifest entries: ready custom voices remain label-only choices here,
and their audition uses a supported host media surface or ChatCut before
applying. Never publish user media to the public CDN.

Keep the voice workflow's clone action and one Other control in that same form.
Use the host-wired Other shape below for voice, avatar, image and caption
choices. Localize the visible labels and placeholder. Keep a visible Other
label when selected; its text input goes below the choice group, not inside an
unlabeled selected card. Neither action starts generation.

```html
<div class="elicit-pills" data-name="voice" data-type="single">
  <!-- Insert the live choice cards and the caller's clone/create action here. -->
  <button type="button" class="elicit-pill" data-value="Other" data-other>
    Other
  </button>
</div>
<input class="elicit-other" data-for="voice" placeholder="Describe what you want" />
```

The input's `data-for` must exactly match its group's `data-name`. Preserve the
host's `.elicit-submit` flow; do not add custom scripts or event handlers.

For AI-avatar choices, keep the live `identityId` to `name` mapping and use only
the official catalog's returned `widgetPreviewVideoUrl` and
`widgetPreviewImageUrl` on `https://cdn.jsdelivr.net`. They are server-resolved
public previews and need not appear in the plugin's image/voice manifest.
Use a selectable non-button `.elicit-pill` card so a native video player can
sit inside it. Set the media to `display:block; width:100%; aspect-ratio:4/5;
object-fit:cover`. Use `<video controls loop playsinline preload="metadata">`
with the returned video URL and the image as its poster. When only an image is
returned, show that real image with the same frame. Never use the 16:9 style-card
frame for avatars or write scripts to emulate hover playback.

Omit identities without public widget media from the media cards and explain
that their previews are available in ChatCut. Never embed provider or saved/
private preview URLs, invent CDN paths, or limit support to a hardcoded set of
five identities: the digital-human skill owns the recommendation shortlist.
Append a localized label-only `create_avatar` action and Other with its adjacent
input in the same group. Creation follows the conversation-attachment plus
`asset-import` workflow; Other refines the presenter requirements.

The Codex `captionPreview` renderer is not a Claude `show_widget` renderer. Do
not call `ask_followup_questions`, embed its Web runtime, or recreate MG with
approximate CSS in Claude. For a caption-style comparison, use live catalog
names with Other in the Elicitation form and explain that animation/font
preview must be reviewed in ChatCut. Follow the same exact language/revision
and selection-versus-application rules in
[references/caption-previews.md](references/caption-previews.md). A successful
form submission is not proof of animation playback or caption application.

For MG reference choices, look up the exact reference ID in the same manifest
(`entries[referenceId]`, for example a `mg-reference:style:…` key). An image entry
provides `path`; resolve it against the manifest's immutable `baseUrl` and show
that image beside its short title in the Elicitation form. Keep reference IDs
mapped to the displayed labels. Do not substitute a similarly named preset.

The manifest may not include newly added references yet. For missing entries,
use label-only choices and say their image previews are available in ChatCut;
do not invent CDN paths, download or republish media during the conversation,
or embed the runtime S3 URL. Include a single label-only Other choice with a
text input. A preference or request for another batch returns to discovery,
not style application.

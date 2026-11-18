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
without playable media has no `audioUrl`. For voice selection, keep the
caller's ready custom voices and official shortlist, then the localized
`clone_voice` action and one `__other__` option with `otherPlaceholder` for the
user's voice requirements. Other returns to voice discovery; it is not a voice
and does not start cloning or TTS.

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

Map an AI-avatar identity choice to one `single` field with `variant:"visual"`
and `id:"avatar"`. Official avatars are retired, so the cards are only the
user's ready saved avatars, if any. Use each live `identityId` as the option id,
the returned `name` as its label, `previewVideoUrl` as `previewVideo`, and
`previewImageUrl` as `preview`. The image remains the poster and automatic
fallback if video loading fails. After the saved-avatar cards, add a localized
no-media `create_avatar` option and one `__other__` option with
`otherPlaceholder` for the presenter the user wants; the host recognizes this
picker and frames it 4:5. `create_avatar` returns to the creation workflow; it
does not open ChatCut's native avatar dialog, so request the source attachment
separately and use `asset-import`. Other returns the described presenter for
choosing among saved avatars or creating one. Neither is an identity or consent
to generate video.

Map a caption style choice (the user asks to see, compare, or choose caption
looks) to one `single` field with `variant:"visual"`. A simple "add captions"
request needs no chooser. Read `edit_captions action:"template"` with the
actual caption language in `json`, for example `{"languageCode":"zh-Hans"}`;
search with `json.query` or continue from `publishedNextOffset`. Choose a
focused set of `publishedTemplates` with `available:true`, including
`kind:"motion-graphic"` entries for animated or expressive requests. For each,
take its returned `previewOptions` entry: `presetId` as the option id, the
template's exact `name` as the label, and its `captionPreview` copied
unchanged. Add one localized `__other__` option with `otherPlaceholder`; do not
add More or a browse-catalog option.

Example field, replacing every placeholder with a returned catalog entry:

```json
{
  "id": "caption_style",
  "label": "Choose a caption style",
  "type": "single",
  "variant": "visual",
  "captionTarget": { "languageCode": "zh-Hans" },
  "otherPlaceholder": "Describe the caption style you want",
  "options": [
    {
      "id": "RETURNED_PRESET_ID",
      "label": "RETURNED_TEMPLATE_NAME",
      "captionPreview": {
        "kind": "catalog",
        "templateId": "RETURNED_TEMPLATE_UUID",
        "revision": 0,
        "languageCode": "zh-Hans"
      }
    },
    { "id": "__other__", "label": "Other" }
  ]
}
```

Caption languages are `en`, `zh-Hans`, `es`, `ja` and `zh-Hant`, independent
of the conversation language. A `captionTarget.languageCode` must equal each
option's language; compare languages in separate fields. Copy any
`timelineId`, `captionsItemId`, `trackId`, `cardId` or `sourceId` from project
reads, or omit them for a standalone sample. Never guess a UUID or revision,
substitute a legacy built-in preset, or send HTML, CSS, `serverResolved` or a
preview URL: the MCP App renders the preview and its fonts.

Check each option's returned `available` / `unavailableReason` before inviting
review. Correct a stale revision or language and retry, or report the
limitation; never stand in another style or a static image for an MG preview.
Previewing changes nothing and needs no transcription. After selection, follow
the returned application recipe for the recorded target, or re-read
`read_captions` and apply the selected `catalogTemplateId` and `languageCode`
with `edit_captions action:"template"`. If the host already applied it, verify
instead of applying again. Re-preview a changed revision. Other returns a new
style requirement and applies nothing.

Temporary workaround, to be deleted once the hosted server previews and applies
project-bound custom styles: an agent-composed caption style (`captionPreview`
with `kind:"custom"`) is a language sample only. In a form that contains one,
omit the call's `projectId` and give each caption field a `captionTarget` with
only `languageCode`, with no `timelineId`, `trackId`, `cardId`, `sourceId` or
`captionsItemId`; otherwise the preview comes back unavailable. After the user
picks a custom style, run `read_captions`, then write the same look to the
caption track with `edit_captions action:"style"`, its `trackId` and the
current revision, using the tool's documented `captionStyle` fields; do not run
a returned recipe for it. Forms with only published catalog templates keep the
project-bound target above.

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

For `playable_single_choice`, resolve each official voice's exact returned
`sampleMediaKey` (for example `voice/<voiceId>` or `voice/<voiceId>/ja`) through
`${CLAUDE_PLUGIN_ROOT}/assets/widget-media/manifest.json`, and resolve the
entry's `path` against its immutable `baseUrl`. Keep the language suffix; never
substitute another voice or language when a key is missing, and show that
voice label-only instead. Never embed or process the original source URL. Keep
stable values in the label-to-id map rather than exposing them as DOM audio
keys. Ready custom voices have private runtime previews that are not in the
manifest: keep them as label-only choices, and have the user audition them
through the host's supported media surface or ChatCut before applying. Never
publish user media to the public CDN.

Keep the caller's clone or create action and one Other control in the same
group for voice, avatar and image choices. Neither action starts
generation. Localize the labels and placeholder, and put Other's text input
below the group with `data-for` equal to the group's `data-name`; keep the
host's `.elicit-submit` flow and add no scripts or handlers:

```html
<div class="elicit-pills" data-name="voice" data-multi="false">
  <!-- Live choice cards, then the caller's clone/create action. -->
  <button type="button" class="elicit-pill" data-value="Other" data-other>Other</button>
</div>
<input type="text" class="elicit-other" data-for="voice" placeholder="Describe what you want" hidden>
```

For AI-avatar choices, official avatars are retired, so the choices are only
the user's ready saved avatars, if any. Their previews are private runtime
media and are not in the manifest: keep each live `identityId` mapped to its
`name`, use label-only selectable cards, and say that video previews are in
ChatCut's AI Avatars library. Never embed or print saved, provider or private
preview URLs, invent CDN paths, or hardcode identities; the digital-human
skill owns the shortlist. End the group with a label-only `create_avatar`
action and Other. `create_avatar` follows the conversation-attachment plus
`asset-import` path.

Claude Code does not render `captionPreview`, so a caption style choice is a
short chat reply, not a form: do not call `show_widget` or
`ask_followup_questions` for it. Read the same live catalog as the Codex
section and list a few available templates by their exact returned `name`,
some static and some `kind:"motion-graphic"` (more animated ones for animated
or expressive requests). End with one line saying the user can also describe
the look they want, and say that real fonts and animation are reviewed in
ChatCut. Keep each listed name mapped to its `presetId`, `templateId`,
`revision` and `languageCode`. A reply naming a listed template is the
selection, under the same revision and application rules; a description
returns to catalog discovery and applies nothing. Never approximate a template
with CSS or embed preview, runtime or font URLs.

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

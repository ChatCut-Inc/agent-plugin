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
without playable media has no `audioUrl`.

Map an AI-avatar identity choice to one `single` field with `variant:"visual"`.
Use the live `identityId` as the option id, the returned `name` as its label,
`previewVideoUrl` as `previewVideo`, and `previewImageUrl` as `preview`. The
image remains the poster and automatic fallback if video loading fails. Keep
`create_avatar` as a label-only option. Selecting it returns that value to the
workflow; it does not open ChatCut's native avatar dialog, so request the source
attachment separately and use `asset-import`.

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

For `playable_single_choice`, resolve bundled media keys through
`${CLAUDE_PLUGIN_ROOT}/assets/widget-media/manifest.json`; use a label-only card
when a key is absent and never embed or process the original source URL. Keep
the stable value in the label-to-id map rather than exposing it as the DOM audio
key. Runtime media URLs are not in the bundled manifest: do not embed them in
Elicitation HTML. Present them through the host's normal safe link/audio
surface, then use a label-only confirmation control.

AI-avatar previews are runtime catalog media and are not bundled in the plugin
manifest. Keep each authoritative `identityId` mapped to its returned `name`,
use label-only selectable cards in Elicitation, and tell the user that live
video previews are available in ChatCut's AI Avatars library. Never embed or
print the provider preview URL. A `create_avatar` selection returns to the
workflow and then follows the normal conversation-attachment plus
`asset-import` path.

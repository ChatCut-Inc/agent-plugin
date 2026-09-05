---
name: widget-forms
description: Ask for structured ChatCut input using the current plugin host's supported form surface.
---

# Widget Forms Host Adapter

The canonical agent's raw `<widget>`, `<choices/>`, and `<visual-option>` tags
render only inside ChatCut. Never emit those tags from the GitHub Copilot CLI
plugin.

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

## GitHub Copilot CLI

Use Copilot's `ask_user` tool for structured input. Put related fields in one
focused form, write visible text in the user's language, and stop until the
submitted answer appears. If `ask_user` is unavailable, ask the same
load-bearing questions concisely in ordinary chat.

Map fields to the `ask_user` schema as follows:

- `short_text`: a `string` property with a clear title and description.
- `explicit_consent`: a `boolean` property with `default: false`. Never infer
  consent from an attachment or another answer.
- `playable_single_choice`: a `string` property using `oneOf` entries whose
  `const` values preserve stable option ids and whose `title` values contain
  localized labels.
- Multiple independent choices: an `array` property with `items.anyOf`.

Copilot's form does not render audio or video previews. Before a
`playable_single_choice`, use a safe host-native media or link surface when one
is available, then present label-based choices while preserving the stable
value-to-label mapping. If no safe preview surface exists, say that previews
are available in the ChatCut project assets; do not emit raw HTML, expose a
provider URL, or fabricate a widget.

For an AI-avatar identity choice, use each live `identityId` as the submitted
value and the returned `name` as its label. Keep `create_avatar` as a separate
label-only option. Selecting it does not open ChatCut's native dialog; request
the source attachment separately and load `asset-import`.

Do not include a file chooser for `audio_reference`. Ask the user to attach the
audio to the conversation, then load `asset-import` and return the resulting
ChatCut `assetId` to the calling workflow.

Never call ChatCut's `ask_followup_questions` solely to render a form in
Copilot CLI because that MCP App response is not the host's structured-input
surface.

---
name: widget-forms
description: Ask for structured ChatCut input using Grok Build's supported form surface.
---

# Widget Forms Host Adapter (Grok Build)

The canonical agent's raw `<widget>`, `<choices/>`, and `<visual-option>` tags render only inside ChatCut. Never emit those tags from the Grok Build plugin.

Never call ChatCut's `ask_followup_questions` on this host. Grok Build does not render that MCP App result. Never call Claude Code `visualize.show_widget`.

## Semantic contract mapping

- `short_text`: one text question in chat, or one `ask_user_question` field.
- `explicit_consent`: one explicit, initially unselected confirmation. Use `ask_user_question` with a single option whose label is the caller's full localized copy, or ask the user to reply with the confirmation phrase. An attachment is never consent.
- `audio_reference`: plugin forms cannot record or upload media. Ask the other fields, then ask the user to attach the audio to the conversation, then load `asset-import`. Return the imported ChatCut audio `assetId`.
- `playable_single_choice`: numbered options in chat with localized labels. Keep the value-to-label map. If the host can play a local file the user attached, use that; do not embed raw `<audio>` HTML or dump unsigned media URLs as ordinary prose. For AI-avatar identity, list `name` labels, keep `identityId` as the value, and tell the user live previews are in ChatCut's AI Avatars library.
- `playable_preview`: say that the preview is available in the ChatCut project assets. Do not print HTML or a fake widget tag.

Prefer Grok's `ask_user_question` when several related fields must be answered together. Put related fields in one form, write visible text in the user's language, and stop until the user answers. If `ask_user_question` is unavailable, ask concisely in ordinary chat.

Never put a file chooser in a form. When source media is missing, tell the user to attach it in chat, then use `asset-import`.

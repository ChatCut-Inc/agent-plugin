---
name: widget-forms
description: Ask for structured ChatCut input on Grok Bot.
---

# Widget Forms Host Adapter (Grok Bot)

Never emit ChatCut `<widget>` tags. Never call `ask_followup_questions`. Never call Claude `visualize.show_widget`.

Ask related fields in one chat turn. Write visible text in the user's language. Stop until the user answers.

- `explicit_consent`: require the caller's full confirmation copy; do not preselect.
- `audio_reference`: ask the user to place audio in `/workspace` or the ChatCut editor, then load `asset-import`.
- `playable_single_choice` / `playable_preview`: use labels in chat. Live avatar previews live in ChatCut's AI Avatars library on the Agent Computer. Do not print HTML.

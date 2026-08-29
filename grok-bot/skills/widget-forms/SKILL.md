---
name: widget-forms
description: Ask for structured ChatCut input on Grok Bot. Use for voice choice, consent, style pickers, and other host-neutral form contracts.
---

# Widget Forms Host Adapter (Grok Bot)

Never emit ChatCut `<widget>`, `<choices/>`, `<visual-option>`, or `<clone-voice/>` tags. Never call `ask_followup_questions`. Never call Claude `visualize.show_widget`.

Ask related fields in one chat turn. Write visible text in the user's language. Stop until the user answers.

- `short_text`: one chat question.
- `explicit_consent`: require the caller's full confirmation copy; do not preselect. An attachment is never consent.
- `audio_reference`: ask the user to attach audio, place it in `/workspace`, or upload it in the ChatCut editor, then load `asset-import`. Return a ChatCut `assetId`.
- `playable_single_choice`: numbered options with localized labels. Keep the value-to-label map. For voices, tell the user they can audition in the ChatCut editor. Do not print HTML or dump media URLs as prose.
- `playable_preview`: say the preview is in the ChatCut project assets and send the editor URL. Do not print HTML.

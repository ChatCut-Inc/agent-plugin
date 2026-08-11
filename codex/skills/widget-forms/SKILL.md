---
name: widget-forms
description: Ask for structured ChatCut input using the current plugin host's supported form surface.
---

# Widget Forms Host Adapter

The canonical agent's raw `<widget>`, `<choices/>`, and `<visual-option>` tags render only inside ChatCut. Never emit those tags from the published Codex or Claude Code plugin.

## Codex

Call the ChatCut MCP tool `ask_followup_questions`. Put related fields into one form, write visible text in the user's language, and stop after the call until the submitted answer appears in chat. Use the current tool schema for field and option shapes.

Do not add media-upload fields. Ask for missing source media separately and then use `asset-import`.

## Claude Code

Follow the structured-input recipe in `chatcut-plugin-basics-claude`: use one `visualize.show_widget` Elicitation form, submit only through `.elicit-submit`, and wait for the user to send the filled prompt. Never call ChatCut's `ask_followup_questions` in Claude Code because that host does not render its MCP-App result.

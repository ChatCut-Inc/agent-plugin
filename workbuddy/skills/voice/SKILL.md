---
name: voice
description: Create and place ChatCut voiceover, narration, and custom sound effects from WorkBuddy while keeping timing, voice choice, and credit confirmation explicit.
user-invocable: true
---

# Voice and Sound

## Voiceover

1. Confirm the final narration text, language, intended tone, and placement. Reuse the user's chosen voice when one is already explicit.
2. Otherwise read `@references/voices.md` and present a short, provider-neutral shortlist in ordinary WorkBuddy chat. Keep each displayed voice tied to the exact preset ID in that reference; do not invent voice IDs or names.
3. State the selected voice and text scope and warn that generation may consume ChatCut credits; wait for explicit confirmation.
4. Call `submit_voice` with the selected preset ID and the current tool schema.
5. Track completion, then place or replace the audio with `edit_item` as requested.
6. Read back the audio item range and check sync against the visual timeline.

For long narration, split only at natural semantic boundaries and preserve consistent voice/settings. If visual timing changes later, retime visuals or regenerate only when necessary; do not silently stretch speech unnaturally.

## Sound effects

Search the built-in Sound Effects library with `browse_library` before generating. Use `submit_sound` only when the user needs a custom sound that the library cannot supply, and apply the same credit confirmation rule before submission.

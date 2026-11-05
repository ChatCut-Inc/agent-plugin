---
name: verification
description: Verify that ChatCut edits made from WorkBuddy are present in project state and, when possible, visually correct in the editor or rendered frames.
---

# Verification

Verification is part of the edit, not an optional afterthought.

1. Use `read_project` after every meaningful write to confirm the intended project, timeline, track, item/asset IDs, ranges, captions, and properties.
2. Use transcription/caption read tools for text and timing changes.
3. Use generation/upload/export progress tools until terminal status before claiming readiness.
4. For visual changes, inspect a composed timeline frame or preview when the current MCP surface provides one. Raw source frames prove source content, not final composition.
5. When WorkBuddy cannot display or inspect pixels, provide the exact ChatCut editor link and clearly label verification as structural rather than visual.

Do not equate a successful tool call with a verified user-visible result. If readback differs from the request, fix or report the specific gap before declaring completion.

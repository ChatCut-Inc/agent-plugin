---
name: motion-graphics
description: Add, directly author, edit, and place editable Motion Graphics in ChatCut from WorkBuddy using inline JSX, existing library assets, and timeline tools.
user-invocable: true
---

# Motion Graphics

## Direct-authoring contract

WorkBuddy authors new Motion Graphics directly. This path does not consume ChatCut generation credits.

- For a new asset, call `create_motion_graphic_from_code` with the complete React/JSX source inline. Do not write the code to a local file or pass a file path.
- For an existing Motion Graphic, read its current code and use `edit_asset` with the complete replacement source in `json.code`.
- Use `edit_item` to place, resize, move, or update the Motion Graphic on the timeline.
- Do not route ordinary Motion Graphic creation to `submit_motion_graphic` or describe direct authoring as credit-consuming generation.

## Workflow

1. Read the active timeline dimensions, fps, intended duration and placement, nearby visual language, captions, and subject-safe area.
2. Reuse a suitable existing asset from `browse_library` when it already performs the same viewer job and visual form; otherwise design a new editable MG.
3. Decide the purpose, exact content, settled-frame composition, animation beats, natural asset box, palette, typography, and editable properties before writing JSX.
4. Call `create_motion_graphic_from_code` with `code`, `name`, `width`, `height`, one duration field, and editable `properties` when appropriate.
5. Place the returned asset with `edit_item`. Overlay assets should use a natural box around the visible graphic; use timeline dimensions only for an intentional full-frame MG.
6. Read the project back and inspect composed settled frames when available. Verify timing, legibility, content, placement, caption clearance, and subject clearance.

Expose visible text, primary colors, and other likely-to-change values as editable properties. Use fonts that the cloud renderer can load, match the project visual language, keep motion purposeful, and avoid generic text-in-a-card layouts when the content calls for a more specific visual mechanism.

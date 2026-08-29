### Goal

Enrich visual layers and cover jump cuts left by A-roll editing.

### Where B-roll is useful

- **Cover jump cuts** — when A-roll editing leaves visible jump cuts the user wants to hide
- **Visualize specific references** — when the speaker mentions objects or scenes that benefit from showing

B-roll depends on having suitable footage and adds production effort — treat it as an optional enhancement, not a default. Apply only when the user opts in or there's a clear visual problem to solve.

### Sources

Footage can come from three places: clips already in the project library, stock via `search_stock_media` then downloading the selected result and importing it through `asset-import` (`import_media`), or AI generation via the `video-gen` skill (Seedance 2.0, ChatCut Pro only). Grok Bot cannot use Desktop `push_asset`. Pick based on the user's need; if unclear, align with the user upfront.

### How to place

Don't cut away in the first or last 3 seconds. For dense jump cuts (<3s apart), use one long cutaway covering multiple. Don't overlap with MG by default.

First decide the B-roll mode:

- **Full-screen cutaway** replaces the talking head for that moment. Use it when the user asks to show the B-roll full screen, cover jump cuts, or the B-roll needs the full frame to be readable.
- **PiP / small-window overlay** keeps the talking head visible. Use it when the user asks for overlay/PiP, the existing edit style clearly uses small-window B-roll, the user says the talking head can remain visible, or the B-roll is a quick supporting visual.

If the user only says "add B-roll" and the mode is not implied by the existing edit, ask once: "Should these be full-screen cutaways or small rounded-corner PiP overlays?"

For **PiP / small-window overlay**:

1. Inspect the target timeline frame first. Compare candidate destination rectangles in the actual shot. Exclude areas that would cover the A-roll's face/head, mouth, important gestures, captions/subtitles, existing overlays, products/logos, or other visible subjects. Among safe candidates, choose a rectangle that can show the B-roll at a useful readable size, preferring the largest blank or low-information area while keeping the composition balanced.
2. Inspect the B-roll source frame(s). Identify the primary subject/action, protected information, and safe-to-lose areas. Any readable text/UI, name/title, logo, brand strip, product edge, card, poster, or document boundary is protected by default unless the user explicitly approves losing that exact information.
3. Place the overlay at a useful size inside the chosen destination rectangle. Keep the B-roll's protected information visible/readable and the A-roll's protected content unobstructed. Do not default to a fixed corner or lower-third position when another candidate has more usable empty area.
4. Set the media item's native `borderRadius` to 24-36 by default unless the requested style is square/sharp. Do not add a mask/effect solely for ordinary rounded PiP corners; use effects only for special shapes or item types that cannot use native `borderRadius`.
5. Screenshot the affected frame before reporting success. If the only non-obstructive PiP would be too small to understand, switch to full-screen cutaway, choose a different source moment/asset, or ask the user to choose the trade-off.

For **full-screen cutaway**:

1. Compare the source aspect ratio with the canvas aspect ratio before choosing fit; do not default to cover without this check. For close aspect ratios, such as portrait source into portrait canvas or landscape into landscape with less than about 30% difference, use a full-canvas `fit:"cover"` first-pass so the B-roll owns the visual beat.
2. For substantially different aspect ratios, such as landscape media in a vertical canvas or vertical media in a landscape canvas, do not place directly with cover. Inspect representative source moments with `inspect_asset` before choosing fit if you have not already viewed them, and use the `visual-analysis` skill when the protected region is not obvious.
3. Identify whether protected information would be distributed across the area that cover would crop. Any readable text/UI, name/title, logo, brand strip, product edge, card, poster, document boundary, or subject on both sides of the frame is protected by default.
4. After inspection, cover or safe crop is acceptable only if protected information would survive the crop, such as a single centered subject with low-information edges. Low-information contextual media, such as scenery, crowd shots, or other mood/context footage with no specific text or subject that must be preserved, can use cover even with a substantial aspect-ratio difference.
5. If protected information would be lost, such as text/logos near edges, subjects on both sides, or a wide information layout like a fixture table or match poster, use `fit:"contain"` for the foreground and add a deliberate full-screen background such as an opaque MG background/matte that matches the edit or a blurred/enlarged duplicate/background layer. If a cover attempt only trims a compact subject/action that can be recovered without hiding other protected information, try a safer reframe/crop that moves the source protection frame fully into the canvas and closer to the intended center of attention.
6. Apply the fit strategy per source asset, not as a batch default. Even when the user asks for cutaways, do not batch-place multiple images or clips with `fit:"cover"` without checking each source's aspect ratio and protected content first.
7. Screenshot the final frame and compare it with the inspected source frame(s). Verify that the foreground still preserves the source's protected information, not just that the final canvas looks filled.

After editing, read back each exact item you changed with `inspect_item({itemId:"..."})`, or use `preview_timeline({views:["timeline"],tracks:["V1"]})` when several items changed on one track. An asset appearing in the library is not proof it is on the timeline. If the result involved crop, fit, scale, overlay placement, or a full-screen composition trade-off, verify the affected frame with `preview_timeline({views:["viewer"],viewerFrames:[...]})` or visual analysis before reporting success, then fix failed source/destination protection or state the unavoidable trade-off. Do not report success if the target items are unchanged.

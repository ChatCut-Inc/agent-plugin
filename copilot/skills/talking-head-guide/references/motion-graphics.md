### Visual identity

Design Style is the video's confirmed visual language. It gives MGs a shared tone, color logic, typography logic, visual density, and motion language. It keeps different MGs in one family without forcing them into the same shape. It does not decide which MGs are useful, when they appear, where they sit, or whether they are transparent / opaque; those remain per-MG editing decisions.

Resolve the visual language before planning MG moments. Use the active MG workflow for the actual style-alignment interaction and implementation details:

- **Active Design Style** — use it unless the user asks to change the overall style. If Project Context names an active Design Style but does not show details, inspect it once with `manage_design_style action="get"` before planning MG moments.
- **Specific user style / reference** — follow it. If it is custom and not yet confirmed for a batch, use a real planned MG as the sample when the user needs to approve the look.
- **Generic or vague direction** — quality words such as clean, premium, modern, professional, polished, or YouTube-style emphasis are goals, not a visual language. Follow the active MG workflow's style-alignment gate: prefer visual preset options, or use one representative MG for confirmation when the direction is textual / custom.
- **No visual direction** — use the active MG workflow to show relevant visual preset options. Talking-head can be used as a catalog filter when available.
- **"Directly do" / "don't ask"** — choose a concrete temporary direction from the transcript and footage, then continue without user style confirmation. Do not create or update a Design Style from this unconfirmed guess.

Picker is a visual Design Style selector. It shows preset thumbnails so the user can choose a visual direction by sight, instead of describing style in words.

1. Call `manage_design_style` with `action: "list_presets"`, `scenario: "talking-head"` when clear, and the user's `locale`. Use the scenario as a catalog filter, then choose reasonable visual options by preset descriptions and the actual video context.
2. Render reasonable returned presets as visual options using the active form/widget route; do not replace thumbnails with text-only style names when visual thumbnails are available.
3. The picker is a turn boundary: after showing it, stop and wait for the user's submitted selection.
4. When the user picks an option, call `manage_design_style` with `action: "apply_preset"` and the selected `presetId`, then inspect the applied Design Style with `action: "get"` before authoring.
5. If the user responds with text instead of picking, treat it as user direction and continue with the custom direction path.

Persist only confirmed visual language:

- **Picked preset** — the user confirmed it by choosing the visual option. Call `manage_design_style action="apply_preset"`.
- **Custom direction** — after the user accepts the sample, treat it as the confirmed direction for the current MG work. If the current environment supports saving project Design Styles and the user accepts it as the shared project style, save/apply it with the agreed style facts.
- **Unconfirmed guess** — do not create or update a Design Style, including when the user said "directly do it".

After applying a preset or confirming a custom direction as the project style, tell the user in one or two natural sentences that this is now the video's visual style, future MGs in this video will follow it by default, and it can be changed or adjusted later.

### Where MG is useful

MG meaningfully helps comprehension or orientation when the content has:

- **Identity / context labels** — speaker name, role, product name, date, source, or a small persistent section label.
- **Key information / quotes** — a core concept, definition, statistic, conclusion, or key sentence worth emphasizing.
- **Structured information** — multiple points, steps, comparisons, rankings, lists, or processes.
- **Chapter / topic markers** — opening titles, section titles, topic transitions, or visual dividers between sections.
- **Abstract concepts** — cause-effect relationships, cycles, systems, frameworks, or other ideas that are hard to follow verbally.

### Repeated Components

One video should usually have one visual language, but not one universal MG shape.

Reuse a Motion Graphic asset only for intentionally recurring instances of the same component: same viewer task, same information structure, same visual form, and content changed through properties. Repeated chapter markers, recurring section labels, or a repeated status badge can share one asset. Different jobs such as an opening title, chapter marker, quote, list, diagram, and CTA should usually be separate assets that share palette, typography, motion tone, spacing, and material treatment.

An accepted first MG proves the visual language works in frame. It is not automatically a template for unrelated MGs.

### Per-MG decisions

For talking-head videos, do not start MG creation from transcript timing alone. Inspect the target frame first: transcript tells you what and when; the frame tells you form, placement, and background.

Before creating the MG, make four linked editor decisions. They prepare the active MG workflow and the later timeline placement.

| Decision               | Question                                                        | Output                                                          |
| ---------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| **Content**            | What idea deserves a visual layer?                              | Message or visual fact expressed by the MG.                     |
| **Timing**             | When should it land with the speech?                            | Timeline start, duration, read time, and internal motion beats. |
| **Form and placement** | What kind of MG is it, and where can it live safely?            | MG form / size, then timeline placement after asset creation.   |
| **Background**         | Is this an overlay on the talking-head shot, or its own moment? | Transparent overlay or opaque / full-screen beat.               |

#### Only for generator workflows that require a brief

Use this subsection only when the active Motion Graphics workflow explicitly asks you to write a generation brief or request for another model or generator, such as Gemini / motion-graphic-gen.

Skip this subsection for Codex or GitHub Copilot CLI direct-authoring workflows.
If you are creating or editing JSX yourself with
`create_motion_graphic_from_code` / `edit_asset`, do not use
`referenceAssetIds`, `:template`, `:style`, role anchors, or Gemini brief
language.

For generator workflows, carry the visual language into the tool call. For now, templates are generation references, not direct-apply targets. Template refs from a Design Style are no different from any other template ID. For new MG assets, pass one code reference source: same-role role anchor with `referenceAssetIds: ["<roleAnchorAssetId>:template"]` only when the visual job, structure, and canvas role are the same; otherwise use the matched template ID directly, for example `referenceAssetIds: ["<templateId>:style"]`. If no template matches, write the confirmed Direction in the brief and use any accepted role anchor only for the same role. Template slot counts are not user constraints: if the user asks for more/fewer bars, rows, items, or data points than the template shows, generate a new structure instead of asking them to fit the slots.

When a template or role anchor is passed, keep the Gemini brief focused on content, role / broad form, background, and frame constraints. Let the reference carry detailed style and motion language.

Map the four shared decisions into a generator brief like this:

- **Content** -> `Content` in the brief.
- **Timing** -> timeline start, plus internal `Timing` only when the MG has its own beats. Internal `Timing` values say _when_ each element appears, not _how_ it moves; leave the motion style to Gemini.
- **Form and placement** -> `Size & shape` in the brief, not final canvas placement. Do not write final `left`, `top`, `right`, `bottom`, coordinates, or placement anchors such as "lower-left" / "top-right" into the Gemini brief.
- **Background** -> `Background: transparent` or `Background: opaque`.

#### 1. Content

Choose what the MG expresses, not just what text it repeats. The content may be a speaker identity, distilled quote, key term, statistic, list, comparison, relationship diagram, chapter marker, or another visual representation of the point.

#### 2. Timing

Choose the timeline anchor first. The MG should land with the relevant speech beat or section boundary, not trail after the speaker has already made the point. Use `find_transcript`; pass `includeWordTimestamps: true` when the MG has internal rhythm such as list items appearing one by one or multi-step reveals.

Write internal timing values relative to the MG's own start time. The timeline item start is the absolute video position; internal timing is the MG-internal rhythm after that start. Exit when the point is fully made.

#### 3. Form and placement

Choose the MG form and likely placement region before creating the asset. The active MG workflow creates the graphic; place the finished asset on the video canvas afterward.

Placement principles:

- **Protect the subject and safe zones.** Avoid the speaker's face, head, hair, glasses, mouth, chin, important products or objects, relevant hand gestures, captions/subtitles, and existing on-screen elements.
- **Keep the caption/subtitle area clear.** If captions may appear, bottom overlays must sit above the caption band, not compete with or cover subtitles.
- **Separate overlays from full-screen MGs.** Subject/safe-zone protection applies to overlays on top of A-roll. A full-screen MG is an intentional visual beat that replaces the A-roll for its duration, so it may cover the speaker and background.
- **Keep the composition intentional.** The MG should support the speaker and message. It should not look like a random sticker, compete with the face, or make the frame feel unbalanced.

Common forms and areas:

| Content type                 | Common form                                               | Common area                                                                                                                     |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Identity / context**       | Name tag or small context label                           | Lower-third first; lower-left or lower-right depending on the shot.                                                             |
| **Key information / quotes** | Typographic quote, pull quote, or emphasis treatment      | Lower-center / lower-third; side area if the bottom is crowded; full-screen for a major punchline, conclusion, or pause.        |
| **Structured information**   | List, step stack, comparison layout, or compact diagram   | Left/right side areas or bottom horizontal area; full-screen if the information is too dense for an overlay.                    |
| **Chapter / topic markers**  | Full-frame title, title overlay, or side title panel      | Full-screen for a strong intro or section break; lower-third for a light cue; side panel when one side has obvious open space.  |
| **Abstract concepts**        | Concept visual, relationship map, cycle, framework, chart | Lower-third if light and readable above captions; side area or full-screen if denser.                                           |
| **Tiny auxiliary labels**    | Badge, status label, logo-like mark, section marker       | Top corners can work here only. Do not use top-left/top-right as the default home for primary opening titles or chapter titles. |

Use the MG's intrinsic form constraints, not final canvas placement, when deciding asset shape. Good examples: "lower-third-style name tag", "compact side treatment", "bottom horizontal strip", "full-screen title beat". Do not bake final canvas coordinates into the asset unless the MG is intentionally full-frame.

For familiar forms like speaker name tags, give the form and content without forcing dimensions early. For constrained overlays, describe the intended rough form or usable area. For full-screen MGs, make the form explicit in **Size & shape** and choose `Background: opaque`.

From the target screenshot, include canvas tone only when it affects legibility: for example, `Other context: dark interior scene — keep the design bright/light enough to read clearly.`

#### 4. Background

Choose background from the form:

- Use `Background: transparent` for talking-head overlays: lower-thirds, side treatments, quote treatments, compact diagrams, and other graphics that sit over A-roll. A transparent root may still contain internal semi-transparent or solid panels.
- Use `Background: opaque` when the MG is its own visual surface: full-screen opening titles, strong chapter beats, full-screen information layouts, and full-screen emphasis moments.
- For full-screen opaque MGs, do not add a separate `solid` item underneath as a color matte. The MG owns the frame; change its `bgColor` / `transparentBackground` properties instead. Do not create temporary solid fallbacks; if you encounter an old transparent-MG-plus-solid fallback while replacing it with an opaque generated MG, delete both fallback pieces, not only the old MG.

Default to a transparent overlay unless a full-screen beat is intended — guessing full-screen/opaque silently is what covers the speaker's face or blanks the frame.

#### Place and review

- Place with `edit_item` (adds/updates). Prefer an explicit rectangle once you know the frame: `left/top/width/height` for direct placement, or `right/bottom/width/height` when right/bottom margins are clearer.
  - **`left`** — explicit x position. **`right`** — margin from the canvas right edge. Do not pass both.
  - **`top`** — explicit y position. **`bottom`** — margin from the canvas bottom edge, symmetric with `right`, e.g. `{ right: 80, bottom: 150, width: 500, height: 350 }` for a bottom-right overlay. Caption-safe defaults: `bottom: 162` (landscape 1080p) or `bottom: 576` (portrait 1080×1920). Do not pass both `top` and `bottom`.
- Use a natural-box asset for overlays: the MG asset `width` / `height` should tightly bound the local visible composition, not the project canvas. Place and scale that local asset on the timeline. Use timeline-sized assets only when the visible design intentionally spans the whole frame.
- Asset dimensions from `track_progress` / project state are practical aids for resizing and placement, not the final judge.
- Verify with screenshots. Pass multiple frames in one tool call — settled state appears alongside any transient mid-animation frames. **Compare frames before concluding**: apparent truncation, missing elements, or "broken design" visible in only some of the batch is animation, not a real flaw. If unclear, re-capture more frames around the suspect one before adjusting anything. Judge from the settled frames. For multiple placed MGs, batch their settled frames into a single call.
- Check the full frame: face/head is clear, important objects and gestures are clear, caption zone is clear when relevant, MG is fully visible, MG content is correct, text is legible, no readable text overlaps, and the composition feels balanced and intentional.
- If it fails, first adjust position and size. If position/size cannot make it work, edit the asset or change the design form. Verify each intentionally recurring component on a target frame before expanding it.

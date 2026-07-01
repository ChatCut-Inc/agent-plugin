---
name: create-motion-graphics
description: "Use whenever ChatCut Codex needs to create, edit, patch, or place Motion Graphic JSX assets directly in a ChatCut project, including overlays, title cards, callouts, diagrams, labels, animated emphasis, recurring visual components, or fixes to existing MG code. This is the Codex direct-authoring path: use create_motion_graphic_from_code / edit_asset / edit_item, not motion-graphic-gen or submit_motion_graphic. Follow the project visual direction, author editable JSX through ChatCut MG tools, place it on the timeline, and verify composed frames."
---

# Create Motion Graphics

This skill is for Codex direct authoring. Do not translate the request into a Gemini prompt, generation brief, `motion-graphic-gen` request, or `submit_motion_graphic` call. Create or patch editable JSX assets directly, place them on the timeline, and verify them in composed frames.

## MG Workflow

Treat every Motion Graphic as a visible design layer in the edit. Understand the video and frame first, choose the visual direction, design the moment, then author it as an editable ChatCut JSX asset and verify it in the real composition.

1. **Understand the edit.** Inspect the timeline, canvas size, fps, transcript or audio beats, target frames, existing Design Style, brand/reference media, and existing MGs. Do not start from code before you know what the graphic has to do in the video.
2. **Align the visual direction.** For one small MG, use the confirmed project/user direction. For multiple MGs, resolve the shared visual direction before batch work.
3. **Set the design bar.** Choose a concrete visual direction and design the settled frame first: the frame where the MG is fully readable, composed, and doing its job.
4. **Choose the right moments.** Add MG only where it helps the viewer understand, orient, compare, remember, or feel emphasis. Skip moments where the graphic would only repeat captions or decorate the frame.
5. **Design the moment.** Decide what the viewer should grasp, what visual mechanism makes it clearer than text alone, when it appears, how long it lasts, what natural box it needs, and how it relates to the footage, subject, captions, and frame role.
6. **Build, place, and verify.** Author the editable JSX asset, place it with `edit_item`, inspect composed frames, and revise the design, timing, size, or placement until it reads naturally in context.

Ask only for missing high-leverage preferences. Use project, transcript, frame, and asset tools for facts the tools can determine.

## Visual Direction

Before making user-facing MGs, align the design style with the user. Style alignment is the foundation for every later design decision: what to make, how varied the MGs should be, how they move, and how they fit the video.

For multiple user-facing MGs, do not call `create_motion_graphic_from_code`, `edit_asset`, or `edit_item` for new MGs until one of these is true: the project has an active Design Style, the user selected a preset card, the user gave a concrete text style, the user provided a reference image, or the user explicitly said to skip style confirmation.

Give the user practical ways to decide the style, then follow the path they choose:

- **Active project Design Style**: use it unless the user asks to change it. If the full spec is not in context, inspect it before authoring.
- **ChatCut Design Style preset cards**: when no direction exists, the default first step is visual alignment: call `manage_design_style` with `action: "list_presets"`, read `widget-forms`, render 3-6 relevant preset cards with `ask_followup_questions`, include an off-list custom direction option, then stop. Use text-only choices only when preset cards or thumbnails are unavailable. The user may pick a card, describe another direction, or provide a reference image.
- **User text direction**: respect the user's words. Broad quality adjectives such as clean, premium, modern, professional, polished, YouTube-style, or simple are goals, not a complete visual direction; help turn them into a concrete direction through visual choices, focused clarification, or one visual sample.
- **User image reference**: inspect the pixels and recreate the reference's visual language: palette, typography attitude, density, material, composition, and implied motion feel. Match the style, not unrelated readable content, unless the user asks for literal content reuse.
- **Explicit skip**: only a direct instruction about skipping style confirmation counts. A normal task request to add MGs is not permission to choose a temporary direction and continue.

After the direction is resolved, use the Design Quality Bar to execute it well. The quality bar is not permission to replace a user-chosen style or reference.

When you ask for visual direction, stop and wait. Do not apply a preset, inspect more frames, plan the batch, create MG assets, or place MG items in the same turn.

## Design Quality Bar

### 1. Design Stance

After visual direction is resolved, Codex is the designer and implementer for direct-authored MGs. The goal is not to satisfy constraints with a safe graphic; the goal is a distinctive, production-grade, intentional motion graphic that works in the edit. It should feel visually memorable, cohesive with a clear point of view, and refined in the details. Push the confirmed direction to its strongest appropriate expression without replacing it.

### 2. Make The Direction Concrete

If the user, Design Style, preset card, or reference image defines the style, work inside that style and translate it into concrete choices. If the Visual Direction gate is satisfied only because the user explicitly waived style confirmation, choose one concrete context-derived direction and state it before authoring. Use style families as inspiration, not defaults or a fixed menu. Bold maximalism and refined minimalism can both work; the key is intentionality, not intensity. Plain, clean, modern, or professional is not enough by itself.

### 3. Design For The Moment

Design for this video, this frame, and this content. Know what the viewer should understand faster, remember longer, or feel more clearly because this MG exists. Account for the real constraints: target size, duration, no interaction, Design Style or brand rules, and the footage the MG overlays or replaces. A good MG is a designed moment in the edit, not a reusable decoration looking for a place to sit.

### 4. Use The Full Design Surface

- **Typography**: use type with character, hierarchy, contrast, and video-scale readability. Pair a distinctive display voice with a refined supporting voice when the style calls for it, using fonts that ChatCut can render.
- **Color**: commit to a palette and accent logic; do not use color as timid decoration.
- **Composition**: use asymmetry, overlap, negative space, controlled density, or unexpected structure when it serves the idea.
- **Motion**: use motion to reveal hierarchy, show sequence, match rhythm, or create emphasis. Prefer purposeful choreography over scattered decorative effects.
- **Material**: use texture, depth, atmosphere, geometry, image, or graphic detail only when it belongs to the direction. For transparent overlays, atmosphere lives inside the MG's local forms; full-frame MGs may own the whole visual surface.

### 5. Layout Before Motion

Design the settled frame first: the frame where the MG is fully readable, composed, and doing its job. Animate into that composition. Layout is the destination; motion is the journey toward it. Do not use animation to hide unresolved layout.

### 6. Match Complexity To Direction

Expressive directions can earn richer code, denser graphics, stronger choreography, or more layered material. Minimal directions need restraint, spacing, typography, contrast, and timing executed with care. Do not collapse every style into the same card-like complexity.

### 7. Respect Brand And References

User-provided brand details, logos, screenshots, style notes, and reference images are authoritative visual input. Recreate their visual language instead of substituting a generic style. Apply the core identity consistently, but use logos and product images only where they strengthen the scene.

### 8. Anti-Slop Floor

Avoid generic AI aesthetics: default purple/blue gradients, fake glass everywhere, predictable feature-card grids, overused generic fonts, and cookie-cutter compositions. Do not invent readable labels, badges, numbers, system tags, edition marks, or fake mastheads. Do not add shine, sweep, glow, scan lines, glass, blur, grain, or heavy shadows as default polish; use them only when the visual direction or editorial job gives them meaning. Do not converge on one default look across unrelated MG jobs; share visual language, but vary form, composition, and rhythm when the job changes. These rules are the floor, not the ceiling.

### 9. Text And Layout Safety

For text-bearing MGs, use real layout: flexbox/grid, gap, padding, max width, line height, wrapping, and enough room for editable copy. Ordinary readable text should not collide, clip, overflow the natural box, or depend on animation transforms to become legible.

## Visual Language

Use the active Design Style, user direction, reference image, brand assets, or accepted sample MG as the video's visual language. A visual language is shared palette, typography logic, motion tone, spacing, density, material treatment, and level of polish.

One video should usually feel like one coherent visual system. That does not mean one universal MG shape. Let each MG's editorial job and information structure determine its form, size, placement, duration, and rhythm.

Treat Design Style structure, material, and template notes as visual vocabulary, not default containers. If the Design Style includes explicit motion, typography, color, or material rules, implement those rules literally.

Persist only confirmed visual language: a picked preset, an active project Design Style, or a custom direction accepted through a visible sample. Do not create or update a project Design Style for a one-off MG or an unconfirmed guess.

## Plan Useful MG Moments

MG should earn its place in the edit. Add one when it helps the viewer understand, orient, compare, remember, verify, transition, or feel emphasis better than the edit would without it.

MG may be a supporting overlay, a full-frame beat, or the main visual system of an explainer. Do not assume there is always A-roll or footage underneath; in voiceover-led explainers, the narration, pacing, and concept structure may be the primary anchors.

Useful MG jobs include identity/context, key ideas, quotes, data, lists, comparisons, diagrams, chapter or section markers, UI/product callouts, source/proof moments, transitions, and CTAs. Treat these as possible jobs, not a fixed menu.

Plan from the actual edit context: timeline moment, surrounding shots or scenes, voiceover/speech/music rhythm when present, target frame or visual canvas, existing on-screen elements, pacing, and viewer attention. Different video genres expose different signals; use the strongest available ones.

Skip an MG when it only repeats what is already clear, has no meaningful relationship to the edit beat, competes with the main subject or idea, or adds visual noise without improving comprehension or rhythm.

## Design Each Moment

Design each MG as a moment in the edit, not as a filled template. You do not need to report this as a table unless the user is reviewing the plan; use it to guide design before coding.

- **Viewer job**: what should the viewer grasp faster or feel more clearly?
- **Content**: what exact text, data, media, or visual fact must appear? Do not invent readable labels, badges, numbers, or system tags.
- **Visual mechanism**: how does the graphic make the idea visible beyond repeating words?
- **Timing and duration**: when should it land, hold, change, and leave? Internal motion beats must complete inside the placed item duration.
- **Settled frame**: what is the most readable frame, and what natural box does that local composition need?
- **Composition relationship**: how does it sit with the footage, subject, captions, objects, and visual weight? Use full-frame only as an intentional beat.
- **Editability**: which visible text, colors, numbers, booleans, fonts, images, or videos should become properties?

## Series And Reuse

Shared visual language is not the same as shared asset reuse. Reuse an MG asset only for an intentionally recurring component with the same viewer job, the same information structure, and the same visual form. Chapter title 01/02/03 can be one recurring component; an opening title, quote emphasis, UI callout, list, and CTA are different jobs.

When jobs differ, create separate MG assets that share palette, type logic, motion tone, spacing, and polish. Do not reshape an unrelated existing MG just because it already looks close.

For a multi-MG batch with only an unconfirmed text direction or image reference, create and place one real planned MG as the representative sample, then stop for user confirmation before expanding. That confirmation validates the visual language; it does not force later MGs to reuse the same form.

For a batch with an active Design Style or selected preset, you may continue end-to-end when the user asked for completion, but still compare settled frames and revise any accidental repetition before reporting done.

## Placement And Review

For overlays, inspect the target frame before authoring or placing. Timing tells you when; the frame tells you form, placement, background relationship, and what must stay clear.

- Use the MG's natural asset box around its local visible composition. Do not use a transparent timeline-sized asset for overlay placement. Use timeline dimensions only for intentional full-frame MGs.
- Place with `edit_item` using one horizontal anchor, one vertical anchor, width, and height. Let the target frame decide the rectangle.
- Verify real composed frames, preferably several frames around the settled state. Distinguish transient animation frames from actual broken layout.
- Check the full frame: subject, face/head when relevant, important objects, captions, MG visibility, correct content, legibility, text overlap, clipping, and overall balance.
- For batches, compare settled frames side by side. Repeated surfaces, anchors, or rhythms should point to a recurring viewer job; otherwise revise form, placement, timing, or asset choice.

If the result fails, first adjust placement or size. If that cannot make it work, change the MG form or code. If preview is fine but export is black/empty, use the canvas pipeline reference before editing further.

## Implementation Notes

Use current ChatCut tool schemas. Create new assets with `create_motion_graphic_from_code`; patch existing MG code with `edit_asset`; place, move, trim, and override instances with `edit_item`. Asset creation only creates the media-pool asset; timeline placement is separate.

## Motion Graphic Code Contract

Violations cause runtime crashes or export failures. Strict compliance required.

### Runtime Surface

- Write pure JavaScript JSX. Do not use TypeScript syntax, import statements, `export default`, browser APIs, or Node.js APIs.
- Define the component as `const Component = ({ item }) => { ... }`.
- Use only pre-injected standalone globals: `React`, `spring`, `useCurrentFrame`, `useVideoConfig`, `interpolate`, `interpolateColors`, `Math`, `random`, `Easing`, `AbsoluteFill`, `Sequence`, `Series`, `Loop`, `Img`, `Video`, `Audio`, `staticFile`, `delayRender`, and `continueRender`.
- React hooks are available through `React`: `React.useState`, `React.useEffect`, `React.useMemo`, `React.useCallback`, and `React.useRef`.
- Never use `Remotion.xxx` or `const { ... } = Remotion`; there is no `Remotion` global object.
- Define every helper locally before use. Use `interpolateColors` plural.

### Component Scope And Variables

- Read editable values from `item.props` near the top: `const props = item.props || {};`.
- Assign each used prop to a named local variable before calculations or JSX: `const titleText = props.titleText;`.
- Do not add fallback values after declared props, such as `props.titleText || "Default"` or `props.enabled ?? false`; runtime properties already have values.
- Pre-compute styles, transforms, opacity, text, booleans, and conditionals in variables before `return`. Do not put calculations or branching logic directly in JSX props.
- Keep variables in component scope unless they are true constants that do not depend on frame, video config, props, or timeline state.

### Timing And Animation

- Get the current frame from `useCurrentFrame()`, not from `useVideoConfig()`.
- Use `useVideoConfig()` only for config such as `fps` and `durationInFrames`.
- Do not use `Sequence` wrappers inside the component. Use flat frame-driven logic.
- `interpolate()` input ranges must be strictly increasing. Never repeat range values; if two transition boundaries collide, separate them by at least one frame.
- `spring()` config must use `damping >= 15`. When elements move together, share the same spring config so they stay synchronized.

### Root, Box, And Layout

- The root element must be `<div style={rootStyle}>`; never use `<AbsoluteFill>` as the root.
- `AbsoluteFill` is a component, not a style object. Never spread it with `...AbsoluteFill`.
- Root style should fill the MG asset box: `position: "absolute"`, `inset: 0`, and `backgroundColor: "transparent"` unless a real background is needed.
- The asset `width` / `height` are the MG's natural box around its visible local composition, not the timeline canvas. Timeline placement sets final screen size and position.
- Use flexbox or grid for text blocks and structured content. Use SVG or absolute geometry for spatial relationships, compound shapes, frame treatments, or drawn/animated marks.
- Allow text to wrap naturally with `whiteSpace: "normal"` and `overflowWrap: "break-word"` unless the request explicitly requires one line.
- If a design uses a non-transparent background surface, expose both a background color property and a `transparentBackground` boolean property that can override the background to transparent.

### Editable Properties And Assets

- Declare matching editable properties for all visible text, primary/accent colors, important numbers, booleans, fonts, and media slots the user may reasonably change.
- Property keys in code must exactly match property schema keys.
- Use `image` and `video` property types for rendered media. Do not hardcode media URLs in JSX.
- `<Img>` and `<Video>` `src` values must come from `props.<key>` only.
- Guard empty media URLs before rendering: `{imageUrl && <Img src={imageUrl} ... />}`. Empty `src` values can crash the runtime.

### Canvas-Safe Rendering

- Avoid CSS `filter`, `mixBlendMode`, `backdropFilter`, and `clipPath` on HTML elements; they can disappear or break when sampled into the video texture.
- Prefer paint-safe primitives: `boxShadow`, `textShadow`, gradients, semi-transparent overlays, and SVG shapes.
- For connected illustrations or compound shapes, render visually attached parts inside one `<svg>` with a shared coordinate space and named anchor constants.
- Inside SVG, keep transforms on the outermost relevant `<g>` when possible. Animate opacity on a wrapping HTML `<div>`, not directly on the `<svg>`.

Use this base component shape:

```javascript
const Component = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const props = item.props || {};
  const titleText = props.titleText;
  const accentColor = props.accentColor;

  const safeFps = fps || 30;
  const entrance = spring({
    frame,
    fps: safeFps,
    config: { damping: 15 },
  });

  const rootStyle = {
    position: "absolute",
    inset: 0,
    backgroundColor: "transparent",
  };

  return <div style={rootStyle}>{/* content */}</div>;
};
```

## References

- Read `widget-forms` before rendering visual Design Style cards or structured user input.
- Use `talking-head-guide` together with this skill for talking-head, interview, tutorial, podcast, or lecture videos. That skill owns speech editing, transcript rhythm, face/caption safety, and talking-specific placement judgment.
- Read `references/canvas-pipeline-rules.md` before asset-code updates involving SVG or when export differs from preview.
- If a tool call fails or returns an unexpected shape, use `known-errors` and the current tool schema before retrying.

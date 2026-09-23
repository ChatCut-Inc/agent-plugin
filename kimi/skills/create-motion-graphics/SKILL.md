---
name: create-motion-graphics
description: "Use when Kimi Work uses the ChatCut plugin (chatcut MCP server) to add, create, hand-author, patch, or place Motion Graphic JSX assets. Covers reference browsing, direct inline JSX authoring, editable properties, asset binding, timeline placement, and composed verification."
---

# Create Motion Graphics

## Plugin host and project

Use the `chatcut` MCP server and the project ID from the user's editor URL or
the plugin's project result. This plugin works with the Web editor, including
local development URLs. Do not open ChatCut Desktop or use `chatcut_desktop`
for a Web project. If `chatcut` tools are unavailable, report the connection
failure; do not submit the task to the editor's native Agent as a substitute.

## Find MG references before designing

### Browse and confirm a visual direction

For production, reuse an accepted project style or user-supplied brand/reference.
Use `manage_design_style get` when its full spec is not already known. Routine
text/placement edits need no new style selection or catalog rescan.

When a new direction is needed or the user asks to browse alternatives, start
with `browse_library` `references: {view: "style-overview"}`. Read ALL numbered
contact sheets, following `nextOffset` until `complete`. They contain published,
agent-enabled style representatives, including linked existing Design Styles.
`list_presets` is only the legacy catalog subset; it cannot replace this visual
overview. Retry a failed page; report an incomplete overview instead of silently
skipping it.

For speech-led video, understand the spoken content and inspect representative
video frames before shortlisting styles. Reuse transcript and frame evidence
already in context. Consider the topic, delivery tone, on-screen language, and
the footage's color, subject framing and background alongside the style previews.

When the visual direction is not yet agreed, shortlist up to 6 distinct fits
for the current content and footage, and read their `hero` parts. Load the
host's supported visual-choice surface and show actual `heroPreview.url` images
with short names. Tool-returned images are evidence for the agent, not a
user-facing picker; text-only choices do not show the visual differences.
Keep each choice mapped to its reference ID; use the form's Other branch
for preferences or another batch
without repeating choices or adding a separate Show more option.
Wait for the selection before applying a new style and producing the MG,
unless the user has already chosen a direction or explicitly delegated the
style choice. An Other answer is not acceptance.

### Apply the selected style

Read the selected representative's `summary`, `hero` and `members`. Follow its
`designStyleAction` with `manage_design_style`:

- `apply_preset`: use the returned `presetId` directly; do not clone or update
  the preset merely to save reference metadata.
- `apply`: reuse the returned `designStyleId` for an existing saved user style.
- `create`: only an independent reference needs a new user-owned style. Define
  and save its palette, fonts and reusable visual rules from the selected reference.
  Reuse the reference's documented palette; if absent, derive a coherent palette
  from its representative image. Save `designSpec.referenceSources: [{id: "<reference ID>"}]`
  and the individual `heroPreview.url` in BOTH `thumbnailUrl` and
  `designSpec.images: [{role: "style reference", url: "<heroPreview.url>"}]`.
  Use `applyToProject: true`; preserve existing images when patching an array.

After applying, call `get` for the fresh full spec and source IDs; do not carry
over the previous style's cached rules. For a new style, verify that its palette,
fonts, source, cover and reference image were saved. A source ID alone does not
save an image.
Reference images are visual evidence, not footage/backgrounds to embed or
example copy to reproduce.

Use `fontRecommendations["zh-Hans"]` / `.en` according to the actual on-screen
text, including bilingual text and Latin numbers. Reuse an accepted font plan;
an empty language group is unresolved. Match the reference's typographic character
and heading/body hierarchy, and check glyph coverage and runtime availability.
Save selected families/roles in `designSpec.fonts`, and language, weight, italic
and required axes in `styleGuide`. A cross-style form example cannot replace
this plan. Only when curating missing fonts or explicitly adapting typography,
read [Font matching](references/font-matching.md); Chinese matching starts from
a generated Chinese effect image, not English letterforms.

### Match instances to the needed MG forms

Use the spoken content and target frames to decide which MG forms are useful;
let the reference previews refine those choices. Keep the confirmed visual
language across the video, and find suitable instances for each needed form.
Choose instances yourself unless the user asks to compare them. Different forms
can use different instances; recurring components can reuse an inspected one.
Follow `nextReferenceSearch` when returned:

- With related members, browse `kind: "instance", styleId: "<representative UUID>"`
  or read relevant member IDs.
- If a needed form has no fitting member, search the WHOLE instance library by
  content/form `query` or `facets.form`, omitting `styleId`, `facets.style` and
  style-name terms, even if other forms already have same-style matches.
- Compare the cover collage, then read selected IDs with `parts: ["summary", "hero"]`.
  Add `motion` for animation and `code` for implementation. If a code-backed
  reference returns `templateInspection`, use its read-only call for saved
  property schema/defaults; JSX may read props without declaring their values.
  `legacyTemplateRefs` are template IDs: `manage_template get` reads metadata,
  and `list_assets` reads MG properties. Neither applies or copies a template.
  `inspect_asset` is for current-project media/MGs, not catalog source IDs.

Adapt the instance's composition, hierarchy, spacing and reveal structure to
the fixed project fonts, palette, materials and actual shot. If the broader
form search also has no fit, extend the style board and state that limitation.
Batch relevant detail reads; finding one instance does not cover unrelated forms.
Follow `pendingIds` for split responses; `known` may include only returned versions
and parts still in context. Each motion sheet is ONE design at real timestamps;
a montage is not one layout, and a static image does not establish animation.

For a new/substantially redesigned talking-head overlay, read
[Overlay composition](references/overlay-composition.md). Import only production
files from `materials` that will appear in the result; use their project asset
IDs. Review the MG composed with the target footage.

### Use the references when authoring

Read the selected instance's `code` when borrowing its implementation, or
read linked template properties with `manage_template list_assets`. Use it
as reference in the code workflow below while preserving the project style.

Inspect selected images as well: a URL, ID or search result alone is not a
viewed reference. Keep STYLE evidence for appearance
and cross-style FORM evidence for structure. If a selected reference fails,
retry or report the missing evidence rather than claiming it was inspected.

Use this skill when a ChatCut plugin task requires a Motion Graphic asset authored or patched as inline JSX. The built-in ChatCut Agent has its own `motion-graphic-gen` workflow; do not switch to it from this plugin task.

Kimi Work plugin Motion Graphics are direct-authored. Use `create_motion_graphic_from_code` for new JSX assets and `edit_asset` for existing MG JSX. This surface does not provide `submit_motion_graphic`; do not translate the request into a Gemini prompt or generation brief. If the direct-authoring tools are missing, stop and report the unavailable ChatCut plugin tools.

Pass Motion Graphic source inline through the `chatcut` MCP tools. Do not stage code in the ChatCut repository, `ai-working/`, `/tmp`, a local HTTP server, generated code files, or guessed application paths when the tool accepts inline JSX directly.

## Core Principles

- Inspect project state when canvas size, fps, existing visual language, placement, or timeline conflicts are not already known.
- Identify the required inputs in **Before You Code** before authoring JSX.
- Create or update Motion Graphic assets through the available inline-code asset workflow; use current tool schemas for exact payload shapes.
- Place or move assets through the timeline editing workflow when the edit requires timeline placement.
- Re-read project state and verify the visible frame after structural or visual changes.

## Before You Code

Before writing JSX, identify only the information needed for this edit:

- **Placement**: start time, duration, target layer if known, and the target frame the graphic must compose with.
- **Role in the edit**: what job this Motion Graphic performs in the video.
- **Content**: exact text, numbers, media, or visual facts that must appear.
- **Timing**: whether internal motion should sync to speech, music, or a visual event.
- **Visual source**: user-provided style, project Design Style, brand colors/fonts, or an accepted existing Motion Graphic.
- **Editable fields**: which text, colors, numbers, booleans, image, or video values should become properties.

Ask only for missing high-leverage inputs that would materially change the result.

## Visual system and placement

Use the confirmed full Design Style and inspected references above. For a new
custom direction, establish one composed result before batching; accepted
directions and routine fixes need no renewed style confirmation.

Choose each composition, position, size and reading time from the actual shot
and speech span. Keep shared typography, palette, materials and motion, while
adapting the reference's form to the content. A fixed left/right anchor or card
container is appropriate only when the composition calls for it.

Reuse an asset with per-item properties for an intentionally recurring component
with the same information structure. New structures need their own instance
reference and composition. Overlay bounds should tightly contain the graphic;
use timeline dimensions only for a design that visibly spans the frame.

Match asset duration and internal beats to the placed timeline span. If timing
changes materially, update the MG instead of truncating unfinished animation.
Review composed settled frames side by side for a batch, correcting collisions,
readability and unintended repetition before reporting completion.

## Editable Properties

Expose user-visible and likely-to-change values as editable properties.

- Visible text, primary colors, accent colors, and key numeric values should be properties.
- Font choices should be `font` properties when users may reasonably change them.
- Image and video sources must be `image` / `video` properties.
- Code keys must match the property schema keys exactly.
- Read values from `item.props`; do not hardcode visible content that the user may reasonably want to change later.
- Use item-level property overrides only for intentionally recurring components with the same viewer task, information structure, and visual form. If any of those differ, create another MG asset and share palette, type, and motion logic instead.

Property entries should declare a stable key, user-facing label, type, and default value. Supported property types include text, number, color, boolean, select, font, image, and video.

## Fonts

Motion Graphics must use fonts available to ChatCut's renderer so preview and local export stay consistent. Do not rely on machine-specific system fonts such as `STKaiti`, `PingFang SC`, `Microsoft YaHei`, `Arial`, `Helvetica`, `Comic Sans MS`, `system-ui`, `-apple-system`, or generic CSS families as the primary rendered font; availability differs between machines and may cause fallback.

When choosing or replacing a font, call `search_fonts` and use the returned canonical family name verbatim as the `fontFamily` value and matching `font` property `defaultValue`. Use Google Fonts or project custom fonts returned by the catalog. If a requested machine-specific font is not in the catalog, explain that consistent local rendering cannot be guaranteed, search for a supported alternative with a similar feel, and use it unless the user explicitly accepts font fallback.

## Assets and composition

One reference instance may describe a complete composition made from several timeline items. It does not imply one self-contained MG asset. Keep reference screenshots, production materials, and current-project footage distinct.

Default to separate items when the design combines ordinary media with graphics:

- Reusable paper/texture/background: an image or video item behind the composition.
- Current-project photo, product image, or footage: its own media item. The agent selects/replaces, crops, positions, and applies supported effects to it; the user is not expected to assemble the layers manually.
- Typography, shapes, and animated decoration: transparent MG item(s). Split background decoration from foreground text when media must sit between them.

Plan layer order, target media rectangle, start/duration, and entrance timing before authoring. State in the MG brief/code scope which layers already exist outside the MG, so the reference's photo or paper is not generated again. Apply black-and-white/color/grain to the intended media item rather than accidentally affecting foreground text. Verify effect support on the actual playback/export surface; splitting layers does not by itself prove Web/Desktop parity.

1. Reuse assets from `browse_assets` in the **current project**. Import only production files needed in the output into My Assets. Load `chatcut-media-guide` and follow its Kimi-supported import flow. Registering project media does not publish it to the public resource library.
2. Place normal production media through `edit_item`, using the returned current-project asset IDs. The agent handles replacing example people, copy, and data with the current task's content. Do not use the reference's complete effect screenshot as a background.
3. Embed media inside an MG only when its visual mechanism needs it, such as image-filled lettering or a tightly synchronized internal mask that available timeline tools cannot express. For this exception, bind `image` / `video` property defaults and overrides to **full current-project asset IDs**, never URLs, local paths, or reference-library IDs. Read via `item.props`, guard empty values, and let the runtime resolve the source. Declaring an image property does not import the file.
4. Verify the **composed timeline** at entrance and settled frames, including media presence, cropping, effects, layer order, and timing. A standalone transparent MG preview intentionally omits separately placed photos/backgrounds; judge the complete design on the timeline. For intentionally embedded media, a correct thumbnail alone does not prove playback works; check import, ID binding, and byte readiness when it is missing.

Library `hero` / `motion` images are study inputs and need no project import merely to be viewed. Missing production files must be reported or replaced with suitable available materials; never silently omit a required layer.

## Design Principles

Design the settled frame from the confirmed style and inspected instance, then
animate into it. Use the reference's hierarchy and visual relationships to make
the current content legible; do not add filler labels or a default card wrapper.

Treat explicit type, material and motion rules as constraints. A hard-cut style
should not acquire fades or springs; glass, grain, glow and other treatments
belong only where the accepted visual language calls for them. Preserve a
reference's expressive choices as well as its restraint.

A character, illustration, or compound shape is one visual entity. When multiple parts must visually connect, attach, or align, render those parts inside a single `<svg>` with one shared coordinate space and named anchors. Independent hardcoded `left` / `top` across separate wrappers produces visible gaps.

### Text Layout Safety

For text-bearing MGs, design the settled frame as a real layout before animating. Use flexbox or grid, `gap`, `padding`, `maxWidth`, `lineHeight`, and natural wrapping for related text blocks. Do not stack readable text with independent hardcoded `top` values unless the text is intentionally decorative or typographic art.

Editable text may become longer than the default. Reserve space for plausible longer copy, allow wrapping with `whiteSpace: "normal"` and `overflowWrap: "break-word"`, and reduce hierarchy, size, density, or change form when the content cannot fit cleanly.

Animated transforms do not affect layout. If text scales, pulses, slides, or staggers near other text, leave visual headroom for the largest animated state. Intentional overlap may be used for graphic layers, shadows, marks, or decorative typography; ordinary readable text must not collide.

Avoid forced `<br>` or manual line breaks for dynamic text unless each line is deliberately fixed. Prefer width-constrained wrapping.

Use this base component shape:

```javascript
const Component = ({ item }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const props = item.props || {};
  const accentColor = props.accentColor;

  const rootStyle = {
    position: "absolute",
    inset: 0,
    backgroundColor: "transparent",
  };

  return <div style={rootStyle}>{/* content */}</div>;
};
```

## Motion Graphic Code Contract

Violations cause runtime crashes. Strict compliance required.

1. **Syntax:** Pure JavaScript JSX. No TypeScript.
2. **Imports:** No import statements. Globals are pre-injected: `React`, `spring`, `useCurrentFrame`, `useVideoConfig`, `interpolate`, `interpolateColors`, `Math`, `random`, `Easing`, `AbsoluteFill`, `Sequence`, `Series`, `Img`, `Video`, and `Audio`.
3. **Use injected globals:** Hooks and components are available directly; do not reach through a namespace object.
4. **Exports:** No `export default`. Define `const Component = ...`.
5. **Timing:** No `Sequence` wrappers inside the component. Use flat frame-driven logic.
6. **Logic:** No inline logic in JSX props. Pre-compute values in variables before `return`.
7. **Helpers:** No undefined functions. Use `interpolateColors` plural. Define any helpers locally.
8. **AbsoluteFill:** `AbsoluteFill` is a component, not a style object. Never spread it. It may be used for inner layers, but never as the root.
9. **Root element:** The root must be `<div style={rootStyle}>`.
10. **Assets:** `<Img>` and `<Video>` sources must read from image/video editable props. Never hardcode URLs. If no assets are provided, design with shapes, text, and CSS.
11. **Hooks:** Get frame from `useCurrentFrame()`, not from `useVideoConfig()`.
12. **Local box:** Component must accept `({ item })` props. The asset `width`/`height` are the MG's natural box around its visible local composition, not the timeline canvas; fill that box with `position:absolute; inset:0`. Timeline placement sets final screen size and position.
13. **Layout control:** Use flexbox or grid for text blocks and structured content. Use SVG or absolute geometry when the design depends on spatial relationships, compound shapes, frame treatments, or drawn/animated marks. Allow text to wrap naturally unless the request requires single-line text.
14. **Editable props:** Component must read editable values from `item.props`. Never add fallback values like `|| "Default"` or `?? false` after `props.key`; declared runtime properties already have values.
15. **Property schema:** Declare matching editable properties. Include all visible text content and primary/accent colors.
16. **Image/video props:** Store project asset IDs in media properties, read runtime values from `item.props`, and render `<Img>` / `<Video>` only when that value is truthy.
17. **Background:** Default background is transparent. If a background surface is added, expose a `transparentBackground` boolean property.

## Renderer CSS Support

<!-- BEGIN generated:web-renderer-css-support -->
<!-- Generated by scripts/generate-web-renderer-css-support.mjs from @remotion/web-renderer 4.0.522. Re-run: pnpm gen:web-renderer-css-support (pnpm install also runs it). DO NOT EDIT BY HAND. -->

Layout is safe: flexbox, grid, `gap`, padding, margin, `position`, `width`,
`height`, `inset`, `whiteSpace` and `overflowWrap` are resolved by the browser
before the export renderer measures the result. These paint-time properties are
not. The export loses or changes them, while the editor preview still shows
them correctly:

- `backdropFilter` — the renderer cannot sample what is already painted behind an element. Instead: build frosted glass from a semi-transparent backgroundColor plus a border and a soft boxShadow, not from a live blur of the footage.
- `mixBlendMode / isolation` — layers are drawn with the normal blend mode only. Instead: pick the final colors directly, or overlay a semi-transparent fill.
- `zIndex` — the renderer paints elements in DOM order. Instead: order the elements themselves so the one meant to sit on top comes last.
- `visibility: 'hidden'` — the element can still be painted into the export. Instead: hide with display: 'none' or opacity: 0.
- `backgroundBlendMode` — background layers are drawn with the normal blend mode only. Instead: pick the final colours directly, or stack a semi-transparent gradient over the colour.
- `perspectiveOrigin` — the renderer never reads it (nor the perspective property it tunes). Instead: move the vanishing point with transformOrigin on the element that carries perspective() in its own transform.
- `perspective (the style property)` — the renderer never reads it, so children rotated in 3D come out flat, as if squashed. Instead: put perspective() first in the rotated element's own transform, e.g. transform: 'perspective(800px) rotateY(30deg)'.
- `transformStyle: 'preserve-3d'` — nested 3D scenes are not composited, so children turned by a parent's rotation disappear. Instead: give every face its own full transform as a sibling (perspective(), the shared camera rotation, then its own rotation and translateZ), add backfaceVisibility: 'hidden', and list faces back to front.
- `gradient interpolation hints and color spaces` — color hints (red, 30%, blue) and explicit interpolation spaces (in oklch) are not preserved by the export renderer. Instead: use explicit intermediate color stops with ordinary gradient syntax.
- `boxShadow with inset` — inset shadows are skipped, only outer shadows are drawn. Instead: shade the inside with a gradient background or a semi-transparent border.
- `url() in background / backgroundImage` — image backgrounds are not drawn, only the flat backgroundColor survives. Instead: put an <Img> behind the content.
- `vertical writingMode` — vertical text is not drawn at all. Instead: stack one element per character in a flex column, or rotate a horizontal line by 90deg.
- `filter: url(...) on an HTML element` — SVG filter references are ignored, so the element is drawn unfiltered. Instead: use CSS filter functions (blur(), drop-shadow(), brightness(), …), or apply the SVG filter to shapes inside their own <svg>.
- `clipPath: url(...) on an HTML element` — clip-path references are ignored, so the element is drawn unclipped. Instead: use a basic shape: circle(), ellipse(), inset(), polygon() or path('…').
- `URL masks with unsupported sources or layout` — the mask loader requires raster images (SVG masks fail), and rejects unsupported size, repeat, position, origin, clip or non-alpha mode. Instead: use a PNG/WebP raster mask with maskSize: '100% 100%', maskRepeat: 'no-repeat', maskPosition: '0% 0%', maskOrigin: 'border-box', maskClip: 'border-box', and maskMode: 'alpha' or 'match-source'; or use a gradient mask.
- `currentColor inside <svg>` — every <svg> is rasterized as an image cached by its markup plus the inherited color, so a color that changes per frame forces a fresh decode of each SVG on every frame (a grid of a few hundred took the export from 10 fps to a standstill). Instead: give SVG fills and strokes an explicit color or a prop value, and draw grids of many small shapes with CSS (border-radius dots, bordered triangles) instead of one <svg> per cell.

Safe in the export: `filter: blur()` glows and `boxShadow` glows spread past their element; `<svg>` roots may be absolutely positioned, percentage-sized, and contain `<image>`; comma-separated and tiled gradient backgrounds (`backgroundSize` + `backgroundRepeat`) draw every layer. Prefer a `boxShadow` glow over a large blurred layer: it is cheaper to export. Each `<svg>` on screen costs an image decode when its markup or inherited color changes, so keep SVGs to a few dozen per frame and build repeated grids of dots, bars or triangles from plain divs.

Canvas: `<canvas>` (2D and WebGL) exports exactly as drawn, so use it for particle fields, procedural drawing, noise and anything that would otherwise need hundreds of elements. Give it `width` / `height` attributes equal to its CSS size, and draw in `React.useEffect(() => { ... }, [frame, props])` or in a callback ref: clear and redraw the whole canvas from `frame` and props every time, synchronously, because seeking and chunked exports render frames out of order. Never use timers, `requestAnimationFrame` or async work, and never accumulate state from the previous frame. Build expensive static layers once with `new OffscreenCanvas(w, h)` inside `React.useMemo` (`document` is not available) and `drawImage` them each frame. Canvas text only uses a font that is already loaded, so also set the same `fontFamily` on a DOM element. Images cannot be drawn into a canvas; layer an `<Img>` above or below it instead. Keep per-frame drawing light: it adds directly to export time.

**Motion toolkit.** These helpers are pre-injected globals (Remotion packages under their export names, plus `Icon`, `d3`, `culori` and `useGsapTimeline`); never import them.

- Lines that draw themselves and shapes that morph (`@remotion/paths`): `getLength(d)`, `getPointAtLength(d, length)` and `getTangentAtLength(d, length)` move things along a path; `interpolatePath(progress, fromD, toD)` morphs one shape into another; `evolvePath`, `parsePath`, `scalePath`, `translatePath`, `reversePath`, `cutPath`, `getSubpaths`, `normalizePath`, `warpPath` and `getBoundingBox` edit path data. SVG markup must stay frame-invariant, so animate strokes and morphs on a `<canvas>`: `ctx.setLineDash([len, len]); ctx.lineDashOffset = len * (1 - progress); ctx.stroke(new Path2D(d))` draws a line on, and `ctx.fill(new Path2D(interpolatePath(progress, a, b)))` morphs.
- Shapes (`@remotion/shapes`): `makeStar`, `makePie`, `makeHeart`, `makeArrow`, `makeCallout`, `makeSpark`, `makeCircle`, `makeEllipse`, `makeRect`, `makeTriangle` and `makePolygon` return `{ path, width, height }`; the components `<Star>`, `<Pie>`, `<Heart>`, `<Arrow>`, `<Callout>`, `<Spark>`, `<Circle>`, `<Ellipse>`, `<Rect>`, `<Triangle>` and `<Polygon>` draw them as static SVG. For a shape that changes every frame (a filling pie), fill its `path` on a canvas instead.
- Organic motion (`@remotion/noise`): `noise2D(seed, x, y)`, `noise3D` and `noise4D` return a deterministic value in [-1, 1]; feed `frame / fps` as one axis for drift, wobble and floating particles instead of `Math.random`.
- Text layout (`@remotion/layout-utils`): `measureText({ text, fontFamily, fontSize, fontWeight })` returns `{ width, height }`; `fitText({ text, withinWidth, fontFamily, fontWeight })` returns the `fontSize` that fills a width; `fitTextOnNLines` and `fillTextBox` wrap. Use them for kinetic type (place each word by its measured width), underlines and highlights that grow to the text, and titles that fill a line exactly. Measure with the same fontFamily and weight you render with. `createRoundedTextBox` (`@remotion/rounded-text-box`) returns `{ d, boundingBox }`, a highlight shape behind multi-line text.
- Styles and transforms (`@remotion/animation-utils`): `interpolateStyles(value, inputRange, [styleA, styleB])` interpolates whole style objects (colors, opacity, sizes); `makeTransform([Transform.translate(x, y), Transform.rotate(deg), Transform.scale(s)])` builds a transform string from the builders on `Transform` (translate, rotate, scale, skew and their X/Y/Z variants, perspective, matrix).
- Motion trails (`@remotion/motion-blur`): `<Trail layers={6} lagInFrames={0.6} trailOpacity={0.9}>…</Trail>` leaves echoes behind fast movement; its children must animate from `useCurrentFrame()`. There is no camera motion blur: the export cannot blend its samples.
- Icons: `<Icon name="rocket" size={56} color="#ffca28" strokeWidth={2} />` draws any Lucide icon by its kebab-case name ("arrow-right", "chart-line", "shield-check", "coffee", "users", "globe", "lightbulb", "brain", …). Always pass an explicit `color`; animate the wrapper (scale, opacity, position), not the icon's own props. An unknown name is rejected with the closest real names.
- Charts (`d3.*`): scales (`d3.scaleLinear`, `d3.scaleBand`, `d3.scaleTime`, `d3.scaleOrdinal`, …), shapes (`d3.line`, `d3.area`, `d3.arc`, `d3.pie`, `d3.stack`, curves such as `d3.curveMonotoneX`), arrays (`d3.max`, `d3.extent`, `d3.range`, `d3.bin`, …) and layouts (`d3.hierarchy` with `d3.treemap`, `d3.pack`, `d3.partition`). d3 only computes numbers and path strings: draw bars and tiles as positioned divs grown by `frame`, and stroke or fill the generated paths on a `<canvas>` with `new Path2D(d)` (a growing donut is `arcGen({ ...slice, endAngle: slice.startAngle + (slice.endAngle - slice.startAngle) * progress })`). Never use d3-selection, transitions or timers; they are not available.
- Colour (`culori.*`): `culori.interpolate([a, b], 'oklch')` returns a function of 0–1 whose result goes through `culori.formatHex`; blending in OKLCH stays vivid where RGB passes through grey. `culori.wcagContrast(a, b)` picks a readable text colour for a background; `culori.samples(n)` gives evenly spaced stops for a palette.
- GSAP timelines (`useGsapTimeline`): `const scope = useGsapTimeline(({ timeline, selector }) => { timeline.from(selector('.word'), { y: 40, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.08 }, 0); })`, then `<div ref={scope}>…</div>`. The timeline is paused and seeked to the current frame, so it is deterministic; author durations in seconds, target elements by className through `selector`, and never call play(), seek(), callbacks or random values (they throw). The DrawSVG (`{ drawSVG: '0%' }`), MorphSVG (`{ morphSVG: targetPathElement }`) and MotionPath (`{ motionPath: { path, align, alignOrigin: [0.5, 0.5] } }`) plugins are registered. DrawSVG and MorphSVG rewrite SVG markup every frame, the one exception to keeping SVGs frame-invariant: use them on at most two paths per graphic, and draw anything more on a canvas. Let GSAP own the properties it animates: do not also set that element's transform or opacity in its React style.
- `<FitText maxFontSize={56} minFontSize={32} lines={1} style={{ width: 360 }}>{props.value}</FitText>` shrinks its text until it fits its box on at most `lines` lines; its box needs a bounded width.
- 3D: the export projects `perspective()` only from an element's own transform, so write `transform: 'perspective(800px) rotateY(30deg)'` on the rotated element itself. For a solid (a cube, a flipping card with two sides), make each face a sibling with the full chain `perspective(800px) rotateX(a) rotateY(b) <face rotation> translateZ(d)`, set `backfaceVisibility: 'hidden'`, and list faces back to front.
- Call injected globals such as `useCurrentFrame`, `spring` and `interpolate` directly: destructuring them from `React` yields undefined.

**Shared web validation.** `create_motion_graphic_from_code` and source/schema changes through `edit_asset` use the same web validator. Syntax/API errors and known renderer incompatibilities must be fixed before granting `metadata.renderContract: "web-renderer-v1"`. Uncertain static findings are non-blocking warnings, not rendering failures: make at most one best-effort repair, then accept the stamped result instead of repeatedly rewriting it. Asset edits may apply reported autofixes. Generation retries known incompatibilities within its bounded attempt budget and may finish unstamped if they remain. `edit_item` placement and instance changes never revalidate source or write stamps. `validateOnly` never writes. `inspect_asset` and `preview_timeline` remain read-only and never grant stamps. Desktop uses its separate native policy.

<!-- END generated:web-renderer-css-support -->

## Placement And Review

Do not author JSX from timing alone. Inspect the target frame first: timing tells you when; the frame tells you form, placement, and background. For a batch of overlays, make one target-frame screenshot/contact sheet and decide each MG's settled frame, speech span, read time, and placement relationship before choosing final anchors, sizes, and durations.

Design the settled frame first: choose the moment when the MG is most readable, place the final layout there, then animate into that composition.

Before authoring JSX, make four linked editor decisions. They prepare the Motion Graphic asset and the later timeline placement.

| Decision               | Question                                                               | Output                                                           |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Content**            | What idea deserves a visual layer?                                     | The message or visual fact the MG expresses.                     |
| **Timing**             | When should it land and leave?                                         | Speech span, read time, duration, and any internal motion beats. |
| **Form and placement** | What kind of MG is it, and where does it belong in the composed frame? | MG form/size, then `edit_item` placement after asset creation.   |
| **Background**         | Is this an overlay on the footage, or its own moment?                  | Transparent or opaque background.                                |

Placement principles:

- Compose the footage and MG together from the frame you inspected: subject, camera framing, visual weight, captions/subtitles when present, and the MG's job.
- Place the MG where it makes the frame read best for that moment.
- Keep necessary information readable at video scale without zooming; if the MG feels detached, change form, timing, scale, or skip.
- Account for captions only when captions are present or planned.
- Treat full-frame MGs as intentional beats, not as a workaround for awkward overlay placement.

Default to a transparent overlay unless a full-frame beat is intended. A transparent overlay still uses a natural-box asset; do not use a transparent timeline-sized asset just for placement.

Place and review:

- Place with `edit_item` (adds/updates). Prefer an explicit rectangle once you know the frame: one horizontal anchor, one vertical anchor, width, and height.
- Verify with screenshots. Pass multiple frames in one tool call — settled state appears alongside any transient mid-animation frames. Compare frames before concluding: apparent truncation, missing elements, or "broken design" visible in only some of the batch is animation, not a real flaw. If unclear, re-capture more frames around the suspect one before adjusting anything. Judge from the settled frames.
- Check the full frame: necessary information is clear at video scale, captions remain readable when present, MG content is correct, text is legible, and the composition feels balanced and intentional.
- For text-heavy MGs, inspect the settled frame where the most text is visible. Check for text-on-text overlap, clipped lines, overflow outside the natural asset box, and readable content covered by animated scale or translate states.
- If it fails, first adjust position and size. If position/size cannot make it work, change the design form. Verify each recurring component form on a target frame before expanding it.

## Asset And Timeline Flow

### Create A New Asset

Create new Motion Graphic assets by passing inline JSX and editable property metadata through the current ChatCut asset-creation tool. Use the tool schema for the exact field names and accepted duration format.

Choose the MG's natural box, duration, asset name, description, and property schema from the edit requirements. The asset duration should match the intended placed span, including internal entrance, hold, and exit timing. The asset creation step only creates the asset; timeline placement is separate.

For `create_motion_graphic_from_code`, pass that natural box as `width`/`height`; use timeline dimensions only for intentional full-frame MGs. If the content occupies only part of the screen, place and scale the bounded asset with `edit_item` instead of baking screen coordinates into a full-canvas MG.

### Patch An Existing Asset

Before patching, inspect the existing asset code and property schema. Preserve unrelated behavior, property keys, and timeline timing unless the requested change requires otherwise.

Patch with full inline replacement source through the current asset-update tool.

### Place On The Timeline

Use the timeline editing workflow for placement, movement, trimming, and per-instance property overrides. Dry-run large or uncertain transactions when the tool surface supports validation.

## Verification

A successful tool call is not verification.

- Re-read asset state after asset creation or update.
- Re-read timeline state after placement, movement, trimming, or property overrides.
- For visible changes, inspect a real composed frame using the normal ChatCut visual verification path.
- For a batch, compare the composed settled frames side by side; verify that each visual job has a fitting form, repeated surfaces/anchors/rhythms are intentional, and each placement works for its own target frame.
- If the result is wrong, classify the failure before retrying: invalid tool shape, invalid JSX, missing/incorrect property key, timeline placement, async asset readiness, or canvas/export safety.
- Fix placement with timeline edits and bad rendering with JSX/property changes.

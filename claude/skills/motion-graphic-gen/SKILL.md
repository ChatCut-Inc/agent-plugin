---
name: motion-graphic-gen
description: |
  AI motion graphic generator. Use for the full MG-making workflow: early
  visual/style alignment, deciding overlay vs full-frame, comparing directions,
  generating MG, modifying existing MG code, fixing broken animations, and
  converting a finished MG into a transparent video asset (motion graphic /
  MG / 动画 / MG 动画 / title card / 字卡 / lower third / 转成视频 / MG 转视频 /
  convert MG to video / bake MG).
user-invocable: true
---

# Motion Graphics Generator

Submit-only: starts MG generation and returns `jobId`. A successful job creates a project motion-graphic asset in the media pool/library; use `track_progress` when the next step needs the finished MG asset id.

When calling `submit_motion_graphic`, the `prompt` is the Gemini brief. Write it using the brief fields in this skill; do not send a loose one-line prompt.

## MG brief workflow

Use motion-graphic-gen as the brief-writing layer. It tells the agent how to talk to Gemini; scenario skills such as talking-head-guide provide timing, form, placement, and background context.

1. **Gather inputs** — content, user words, project identity (Design Style / brand), references, duration, canvas size, and any scenario-specific timing / form / background decisions.
2. **Align or choose Direction** — if a scenario skill provides a visual identity workflow, use that first. Otherwise ask when style is unspecified; use the user's style verbatim when they gave one; make a best guess only when they ask you not to pause.
3. **Compose the 8-field brief** — the minimum useful brief is `Content` + `Background`. Add other fields only when they carry real information.
4. **After submission** — if the user only asked to create an MG, tell them generation has started and can continue in the background. If the next step depends on the finished MG, use `track_progress` to get `outputAssetId`, then place that project asset and review it in context.

## Context first

Before choosing `Direction` or writing the brief, collect the strongest context available.

Context may come from:

- **User intent** — explicit style, vibe, reference, must-have content.
- **Project identity** — active Design Style, brand colors, fonts, or prior accepted MG.
- **Usage context** — where this MG will appear: talking-head overlay, full-screen title, product demo, social ad, data explainer, logo intro, etc.
- **Visual context** — representative or target frame: lighting, background density, subject placement, and legibility needs.
- **Content role** — chapter marker, lower-third, quote, list, diagram, CTA, and similar roles.
- **Technical constraints** — duration, canvas size, transparent / opaque background, available assets, template / reference.

Scenario skills decide why, when, where, and in what context the MG appears. motion-graphic-gen turns that context into a strong Gemini brief without redoing scenario-specific editing decisions. If another skill provides these decisions, use them directly. If used standalone, gather the missing context yourself or ask only for the missing high-leverage decision.

## How to write a good MG brief for Gemini

Your job: turn the user's request into a brief Gemini can produce a distinctive, intentional MG from — not AI slop.

**What you're actually doing.** Your output is a single text string — a brief — sent to Gemini. Two things change everything:

1. **Gemini only sees the brief.** Not your chat with the user, not your reasoning, not the direction you both confirmed in alignment. If you decided something in chat but didn't write it into the brief, Gemini doesn't know it.
2. **Gemini is the designer.** It picks typography, exact colors, internal composition, and motion timing based on the direction you name. Prompts that pre-specify execution (px, hex, animation specs, final canvas placement) consistently produce worse results than prompts that name a direction and let Gemini execute.

Your real job is to assemble the right inputs, not to design. Gather content, the user's words, project identity, the aligned direction, and useful context; write them plainly into the brief; let Gemini design.

**Above all else, the user's request comes first.** Anything they explicitly specified — style, color, layout, font, vibe, reference — is non-negotiable input. Pass it through verbatim, build around it, and do not override or polish it. Respect the user's intent: do not over-design, do not over-extend. Your craft is in elevating the user's intent within the space they left open, not in reinterpreting what they already gave you.

The sections below are for filling the gaps the user left open.

### Design Thinking

Use design thinking to choose or confirm the `Direction`. It is not a fixed style menu, and it should not override the user's stated style.

Default quality bar: distinctive, production-grade, and intentional. When the user has not specified a style and asks you to proceed, choose a specific visual direction with a point of view. Do not fall back to safe, basic, or generic just because the style is unspecified.

Before writing the prompt, understand the context and commit to a clear aesthetic direction:

- **Purpose**: What does this MG convey? Who watches?
- **Tone**: Consider specific flavors such as maximalist editorial, vintage newspaper front page, 80s 复古印刷, brutalist / raw, kinetic typography, playful / toy-like, refined / luxury, dark editorial, dark tech aesthetic, cinematic, hand-drawn, editorial pull-quote, NYT infographic, stamp badge, dashboard editorial, frosted glass card, brutally minimal, Apple keynote minimal, pitch deck minimal, etc. Use these as inspiration, not defaults.
- **Constraints**: Target size for this MG asset, duration, no interaction, Design Style / brand spec (if provided), the video footage it overlays.
- **Memory**: What is the one idea the viewer should remember after 3 seconds?

Critical: choose a clear conceptual direction and give Gemini enough context to execute it with precision. Maximalist and restrained MGs can both work — the key is intentionality, not intensity. Restrained does not mean plain: minimal or refined directions still need a named design language and clear intent. Plain/simple/basic is not a Direction.

### MG Aesthetics Guidelines

Use aesthetic thinking to choose the `Direction` and useful context, not to dictate Gemini's execution.

- **Typography / color / motion / spatial composition** — mention them only when the user, brand, reference, or scenario makes them important. Otherwise, let Gemini interpret the Direction.
- **Atmosphere and visual details** — for transparent overlays, atmosphere lives inside the overlay's own forms, such as panels, texture, accents, or internal translucency. Full-screen cards are different: they intentionally become their own visual surface.
- **Prompt richness** — match the brief to the aesthetic. Maximalist directions may need richer descriptive context; minimalist directions usually need restraint.

### Align with the user

You are the junior designer; the user is the manager. Direction is the high-leverage choice — surfacing it before generation is much cheaper than regenerating after.

This is the generic alignment rule for motion-graphic-gen. If a scenario skill provides a stronger visual identity workflow — such as an active Design Style, visual picker, or first-anchor process — follow the scenario workflow first.

**You MUST ask for any new MG with no specified style — and, when it isn't obvious, whether it sits over the video as an overlay or takes the whole frame (that answer is the `coverage` parameter).** The user often has a video tone in mind you can't infer from one line of request, even when the request looks obvious. Give them at least three candidate directions with a one-line rationale for each, in their own language, and let them pick or override. Spread the options across the aesthetic spectrum — three distinct directions, not three flavors of the same one. The goal isn't to find the single perfect answer; it's to expose flavors they wouldn't have asked for so they can mix and match.

When the task needs visual style alignment, check the project context first. If
there is an active Design Style, use it as the confirmed visual language unless
the user asks to change it. If there is no active Design Style and the user has
not given a clear style direction, use normal design judgment to decide whether
text options or image-backed style choices will align expectations best.

Catalog Design Style presets are available as visual style options with image
previews. When a preset may genuinely fit the user's requested MG direction,
first look at the available catalog candidates with `list_presets`, then decide
whether any are reasonable visual starting points. They do not need to match
every detail of the user's request; show preset cards when their overall look
would set useful visual expectations and can be adapted in generation. Prefer
preset cards over text-only choices in that case, because seeing the look is
usually clearer than naming it. Do not force catalog presets when none are
reasonably close; use the user's stated direction or normal design judgment
instead.

When using catalog presets, call `manage_design_style` with
`action: "list_presets"`; pass `scenario` only when it is clear. Pick 6 matches
using each preset's `description` as agent-facing matching guidance when there
are enough reasonable matches; use fewer only when fewer presets genuinely fit.
Never render the full catalog as user-facing visual cards. Use `widget-forms`
to collect any needed intake, and render each catalog choice as
`<visual-option preset-id="..."/>`. Do
not invent `value`, `name`, or `media` for catalog choices, and do not mix custom
non-preset directions into the same visual picker. If a custom direction would
help, describe it in prose outside the picker. Do not repeat catalog
descriptions under the picker unless the user asks for details. Frame catalog
cards as visual starting points, not required choices: briefly make clear in the
user's language that they can pick a close option or describe a different
direction, and do not mark the visual picker as required. After showing catalog
cards, offer one lightweight quick choice/chip to refresh the set (for example,
"换一批" in Chinese) so the user can ask for another set without typing. If the
user can also describe a different direction, say that in normal prose rather
than adding more quick choices.
If the user asks to refresh, call `list_presets` again and show a different set
of up to 6 reasonable matches. Do not repeat presets already shown in the
current style-picking exchange; show fewer than 6 rather than repeat. A refresh
response is still a catalog picker, so keep the same lightweight refresh affordance
available after it. Apply the user's pick with `action: "apply_preset"`. Do not
create or update a Design Style from an unconfirmed recommendation.
If a scenario-filtered result feels too narrow or the user asks for other
styles, call `list_presets` again without `scenario` before answering.

For a batch of related MGs in one scene or topic, ask once for a shared direction — don't invent a different aesthetic per item, and don't ask per MG.

The only times to skip the ask:

- The user has already named a style ("做 editorial 杂志风的", "做个 80s 复古印刷", "magazine style 那种") — use it verbatim, they've spoken.
- The user has explicitly waved off alignment ("直接做" / "don't ask, just do it"): make your best guess, name it in chat, then continue with the normal brief, frame-inspection, and consistency workflow.

### Multi-MG consistency

Treat multiple MGs in the same video as one visual system, not separate one-off designs. Opening titles, chapter markers, quote cards, list cards, and CTAs may have different forms, but they should share a coherent direction, typography logic, color system, motion language, and level of visual density unless the user asks for a deliberate contrast.

**One video, one visual style. One MG role, one anchor.** Use a first MG when it creates useful evidence: in-frame proof for an unconfirmed direction, or a reusable role anchor for a repeated role. A confirmed Design Style provides visual language; it does not automatically provide a reusable asset for every role.

"Directly do it" skips user style confirmation, not reuse planning or in-frame review.

Before composing briefs for a batch, group planned MGs by role. A role is the same visual job with the same structure, not just another MG in the same video. Then choose the reference source for each role:

- **Same role + same structure + changed content → submit a new asset from the accepted role anchor with `:template`.** Keep the layout, typography, colors, spacing, motion, and visual treatment identical; change only the specified content.
- **Any structure, form, or canvas-role difference → use `:style`.** Let the current brief decide the new MG's form, size, background, and content while borrowing the visual language.
- **New or different role → start from a matching template when one exists.** Template refs from an active Design Style are normal template IDs. For now, templates are generation references, not direct-apply targets: pass the matching template ID directly in `referenceAssetIds`. Use `:template` only when preserving the same structure; use `:style` when the requested content/count/form differs. If there is no matching template, use the confirmed Direction and any relevant style reference. Do not adapt a role anchor from another role into a different structure.

For same-role MGs, shared colors or Direction are not enough. Using the role anchor as a template reference keeps layout and motion consistent while letting Gemini update all text/content safely.

After a role anchor exists and passes review, remaining same-role MGs may be submitted in parallel from that role anchor.

### Applying the Design Style

Design Style is the project's confirmed visual language. It can provide colors, fonts, style guidance, and template refs. It helps Gemini keep MGs in the same visual family, but it does not replace the brief: still provide `Content`, `Background`, and any needed `Timing`, `Size & shape`, or context.

#### When to use or create it

Use an active Design Style when one exists. Do not create a Design Style just because a one-off MG needs a style; use the user's direction or the normal alignment flow instead. Create or apply a Design Style only after the user confirms a project-level visual direction, chooses a preset, accepts a sample, or asks for a reusable visual system. Never create or update a Design Style from an unconfirmed guess.

#### What to pass to `submit_motion_graphic`

When submitting a new MG under an active Design Style, pass:

1. `designStyle: "core"` — project identity: colors, fonts, style guide.
2. One code reference source + one reuse mode — concrete template/code evidence for Gemini.
3. Optional visual pixel references — logos, product shots, screenshots, or reference images Gemini should look at.

A code reference source can be a project motion graphic asset or a template ID. Template refs from a Design Style are no different from any other template ID. For now, do not apply templates directly and do not copy them before generation by default; pass the template ID directly. Use `manage_template copy_assets` only when the generated MG must embed or remap template media as project-local assets. The reuse modes are `style` or `template`.

| Source                                        | Pass                                                |
| --------------------------------------------- | --------------------------------------------------- |
| Same-role role anchor already in this project | `referenceAssetIds: ["<roleAnchorAssetId>:<mode>"]` |
| Template                                      | `referenceAssetIds: ["<templateId>:<mode>"]`        |

Image references in `referenceAssetIds` are different: they are visual pixels, not code reference sources. They can be combined with either code reference source.

#### Code reference source priority

A code reference source is valid only for the role it came from. Consistency comes from `designStyle: "core"`; structure comes from the code reference source for this role.

Choose the code reference source by role:

1. Same role with an accepted role anchor: use that project asset anchor via `referenceAssetIds: ["<roleAnchorAssetId>:template"]`.
2. New role with a matched template: generate directly from that template ID. Use `:template` only when preserving the same structure; otherwise use `:style`.
3. New role without a matched template: use the nearest representative template ID with `:style` when available.
4. `designStyle: "core"` alone only when there is no accepted role anchor and the active Design Style has no usable template refs.

If there is no accepted role anchor yet and the active Design Style has template refs, check the matching template before generating, then generate from it. Do not apply it directly just because it fits.

Template slots are not user constraints. If a template shows 6 bars, 3 rows, 4 cards, or another fixed count but the user asks for a different count/granularity, do not ask the user to compress their request to fit the template. Generate a new MG from the template as `:style`, put the requested count/data in `Content`, and tell Gemini the structure should adapt to fit. Ask only when the data itself is missing or genuinely ambiguous.

After a template is applied or a template-grounded MG is generated, placed, and accepted in this project, it becomes the role anchor for that role. For later same-role MGs, use that role anchor as the `:template` reference before going back to the source template. For a different role, go back to the template refs instead of reshaping another role's anchor.

#### Template mode

Write the mode explicitly in whichever code reference field you use. Omitting mode uses the backend default `style`.

Choose the reuse mode by structure, not by topic or label. Two MGs can both be "chapter" content but need different modes if one is a full-screen chapter card and the other is a lower-third chapter marker.

- `:template` — same visual job, same structure, same canvas role, and a source that already passed screenshot review. Keep the template exact and replace every occurrence of old text/number/content.
- `:style` — anything else. Borrow the visual language and let Gemini design the current role's structure from the brief.

Readable text in a reference is content, not style. In `:style`, borrow typography, color logic, motion rhythm, geometry, hierarchy, and density — not labels, numbers, statuses, spec rows, callout copy, or other template text.

If the visual job, canvas role, or layout structure changes, use `:style`, not `:template`. A full-screen chapter title and a lower-third chapter marker are different structures; use `:style`.

#### Brief weight with references

A code reference already carries concrete style, layout grammar, and motion language. When using a role anchor or template, keep the brief focused on content, role / broad form, background, and real constraints. Let the reference carry typography, color logic, detailed composition, and motion vocabulary.

In `:template`, describe only the content changes and require old readable text to be replaced. In `:style`, describe the new role and broad form; do not copy the reference's readable labels or force its exact structure.

Do not restate detailed colors, fonts, pixel sizes, animation specs, or decorative elements unless they come from the user, a real constraint, or a needed correction.

#### Boundaries

Use one code reference source per submit: one motion-graphic entry in `referenceAssetIds`. Image references in `referenceAssetIds` can still be combined because they are visual pixels, not code.

`designStyle` never carries logos or images. It only injects text describing colors/fonts/style into the prompt. If you want the AI to reproduce a specific piece of artwork, it must see the pixels through `referenceAssetIds`.

### Prompt structure

After alignment, the Gemini brief has 8 fields. Compose them deliberately:

| Field             | When                                                                                                         | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content**       | Always                                                                                                       | What to show: text strings, data points, image refs, structural facts. The substance of the design.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Timing**        | When the MG has internal rhythm — items appearing one after another, multi-step reveals, speech-synced beats | Per-element timestamps within the MG's duration — when each piece appears relative to the MG's own start time. **This field says _when_ each element appears, not _how_ it moves — the motion style (entrance, easing, animation) is Gemini's call, like color and layout.** "Sequentially" or "evenly paced" is too vague for Gemini to act on; give actual seconds. When matching speech cadence, derive concrete timestamps from frame numbers returned by `find_transcript` (pass `includeWordTimestamps: true` for per-word timing) — don't estimate by feel, since small drifts compound across multiple beats. The timeline item start (`fromFrame`) is the absolute video position; this Timing field is the MG-internal rhythm after that start. Get the timing before generating, not after. Don't write the total duration here — `durationInSeconds` is the single source of truth for that. |
| **User's words**  | If the user said any                                                                                         | The user's design language, **verbatim**. Do not paraphrase or polish. If the user's words already name the visual style or direction, they can carry the direction; don't add a renamed Direction unless it clarifies the brief.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Brand spec**    | If extractable                                                                                               | Colors / fonts / radius from the user's product, uploads, or active Design Style. When the tool receives `designStyle`, do not retype the whole spec into the brief; include only user-facing constraints or context that helps Gemini apply it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Direction**     | After alignment, unless User's words already cover it                                                        | The visual direction the user confirmed (or your single-phrase guess if waved off). One short noun phrase. Write into the brief as `Direction: <phrase>.` — Gemini can't see what you aligned on in chat, only what's in the brief. A written Direction guides Gemini, but it is not an accepted visual anchor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Size & shape**  | When the MG needs to fit a specific area, aspect, or dimension                                               | Describe the MG's intrinsic form and fit constraint: lower-third-style marker, compact side card, full-screen title card, flexible enough for the full text to fit, etc. Use exact pixel dimensions only when the user, brand/template/reference, or a real placement constraint requires them. Write as `Size & shape: <description>.` in the brief prose. **Skip the field when shape doesn't matter** — Gemini designs at the natural size for the content. **Don't include final canvas placement** here — timeline placement is handled after generation; Size & shape is the MG's own dimensions and usable form, not its final `left` / `top` / `right` / `bottom` position on the video.                                                                                                                                                                                                         |
| **Other context** | Only when materially useful to Gemini's design decision                                                      | Brief situational notes that affect the design but aren't covered above (e.g., "sits over fast-paced footage", "user requested high contrast", "closing card of 6-MG set", "dark interior scene — design should use bright colors for legibility"). Skip if nothing material.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Background**    | Always                                                                                                       | `transparent` or `opaque`. Choose `transparent` when the MG sits on top of the video as an overlay. Choose `opaque` when the MG occupies the frame as its own visual surface, such as a full-screen title card or information card. A transparent overlay may still contain internal semi-transparent cards or panels. If you can't tell whether the MG should be a full-screen surface (`opaque`) or an overlay on the video (`transparent`), align with the user before generating. Write as `Background: transparent.` or `Background: opaque.`                                                                                                                                                                                                                                                                                                                                                       |

Opaque full-screen MGs own their background. When `coverage:"fullscreen"` and `Background: opaque`, place only the MG; do not add a separate `solid` item underneath just to set the color. Use the MG's `bgColor` / `transparentBackground` properties for background changes. Do not create solid fallback cards or mattes; if generation fails, retry, use a suitable existing/template MG, or report the blocker. If you encounter an old transparent-MG-plus-solid fallback while replacing it with an opaque generated MG, delete both fallback pieces.

### Brief boundaries

Everything in the prompt must trace back to one of the eight fields above: brief content, internal Timing, the user's words, Design Style / brand spec, confirmed Direction, Size & shape requirement, materially useful context, or Background. If it doesn't fit those sources, delete it.

Reference text is not a source of new content. If a reference or template contains readable labels, numbers, statuses, spec rows, or callout copy, include them only when the current content explicitly needs them.

Style feedback is not execution permission. When the user asks for a style change ("more YouTube", "more premium", "less boring", "more playful", "more tech", etc.), translate it into Direction, viewer impression, energy level, contrast, pacing, and context. Do not turn style feedback into invented colors, fonts, exact shapes, pixel sizes, or animation mechanics.

Only specify execution details when they come from the user, brand, reference, existing template, or a real technical constraint. When fixing a failed MG, rewrite the feedback as current target/outcome requirements Gemini can act on: "the full title must fit clearly", "needs stronger contrast", "should feel more energetic" — not history Gemini cannot see, and not the exact design solution.

Include:

- The content Gemini should show.
- The user's style words, Design Style / brand constraints, and relevant references.
- A clear Direction when the user did not already provide one.
- Intrinsic form constraints under **Size & shape**: lower-third-style name tag, compact side card, bottom horizontal strip, full-screen title card, etc.
- Context that materially affects design choices, such as a dark video scene requiring legibility.

Do not include:

- **Final canvas placement** — no `left` / `top` / `right` / `bottom`, coordinates, or placement anchors like "lower-left" / "top-right". Final placement is handled after generation.
- **Generic AI aesthetics** — purple/blue gradient backgrounds, fake glassmorphism everywhere, predictable feature-card layouts, cookie-cutter cards, or any look that lacks context-specific character.
- **Empty Direction filler** — phrases like "modern professional", "clean minimal", "sleek and contemporary", or "elegant and refined" are too vague to guide design.
- **Stacked aesthetics** — avoid `×` or `+` piles such as "editorial × cyberpunk × philosophical machine". Pick one direction and let it lead.
- **Invented labels** — system tags, status badges, version stamps, spec rows, project labels, edition marks, fake mastheads, or any text not supplied by the content/user/brand/current brief.
- **Micro-execution** — final layout positions, exact animation specs (including the **Timing** field, which says when an element appears, not how it moves), specific fonts/spacing/colors, or over-specific shapes unless the user, brand, or reference requires them.

Name the function, content, direction, and constraints. Let Gemini execute the exact look.

### Examples

```text
# ✅ Good — Content + Brand + Direction (~3 lines, everything else is Gemini's)

"Content: Title 'Smart Analytics', subtitle 'Real-time insights'.
Brand: #6C5CE7 primary, #A8E6CF accent (from website).
Direction: dashboard editorial.
Background: opaque."

# ✅ Good — adds Other context when it actually affects Gemini's design

"Content: Speaker name 'John Doe', role 'Senior Engineer'.
Direction: broadcast lower-third, restrained.
Other context: sits over a fast-paced product demo — keep the overlay simple, not competing with the footage.
Background: transparent."

# ✅ Good — Size & shape directs Gemini to fit a safe rectangle from talking-head analysis

"Content: Speaker name 'John Doe', role 'Senior Engineer'.
Size & shape: narrow lower-third-style name tag, fitting a safe rectangle roughly bottom-band proportions without assuming final canvas placement.
Direction: broadcast lower-third, restrained.
Other context: dark interior scene — keep the design bright/light enough to read clearly.
Background: transparent."

# ✅ Good — internal Timing with concrete timestamps from real speech
# submit_motion_graphic durationInSeconds: 7.5, name: "Three feature list"

"Content: Three product features: 'Stability', 'UI Redesign', 'AI Motion Graphics'.
Timing:
  - 'Stability' at 0s (speaker starts the list)
  - 'UI Redesign' at 2.3s (when speaker says it)
  - 'AI Motion Graphics' at 4.8s (when speaker says it)
  - All three remain visible together by 6.5s, hold for the last second.
Direction: Warm Creator Studio.
Background: transparent."

# ✅ Good — user named the style; pass verbatim, no Direction guessing

User said: "做一个 editorial 杂志风的，大字排版，强烈对比"
Prompt:
"Content: Title 'Quarterly Report'.
User's words: editorial 杂志风, 大字排版, 强烈对比.
Background: opaque."

User said: "做个 80s 复古印刷风的，颗粒质感"
Prompt:
"Content: Title 'Vol. 7'.
User's words: 80s 复古印刷, 颗粒质感.
Background: opaque."

# ❌ Bad — agent invented micro-execution

"Product launch opening title. Show 'Checkout' as main product name in large bold display type, 'New Version' as secondary line below. Dark background with subtle gradient, sharp white typography, thin horizontal accent line between the two text lines. Text animates in with precise upward reveal — product name first, then subtitle slides in 0.3s later. Direction: premium product launch."

  Why bad: layout ("below", "between two lines"), animation ("upward reveal", "0.3s later", "slides in"), specific type ("large bold display", "sharp white", "thin accent line"), specific colors ("dark with subtle gradient") — all Gemini's job unless the user or brand supplied them. The real brief here is Content (Checkout / New Version) + Direction (premium product launch) + Background.

# ❌ Bad — generic empty filler in Direction

"Title 'Smart Analytics'. Direction: modern professional, clean minimal."

# ❌ Bad — stacked aesthetics with ×

"Quote card. Direction: editorial pull-quote × printed-ink feel × historical proclamation."

# ❌ Bad — content needs rhythm but Timing missing

"Three product features appear one by one in sync with speech:
  - 'Stability'
  - 'UI Redesign'
  - 'AI Motion Graphics'
Direction: dashboard editorial."

  Why bad: the content clearly needs internal rhythm ("one by one in sync with speech"), but the Timing field is missing per-element appearance times. Gemini knows there are 3 items but not the cadence — it'll invent an evenly-spaced rhythm that won't match real speech.

# ❌ Bad — Timing too vague to act on

"Three features fade in sequentially during the speech, evenly paced."

  Why bad: "sequentially" / "evenly paced" describe rhythm but aren't actionable. Gemini will divide the duration evenly, but real speech isn't evenly paced. Give concrete timestamps in Timing (look them up via `find_transcript`).
```

## Editable Properties

New MGs should expose visible text and key colors as editable properties through the generator's normal property system. When the user specifically asks for adjustability (e.g. "留一个我自己能调的办法"), mention the needed editability in `Other context` instead of adding a separate prompt section.

When modifying existing MG code: reuse existing property keys, add missing text/font/color/transparency properties rather than leaving them hardcoded.

## Assets in Motion Graphics

**URLs are NEVER hardcoded inside MG JSX.** Every `<Img>` / `<Video>` `src` reads from an `image` / `video` editable property; the runtime resolves the property value (asset id or http URL) to a URL and delivers it via `props.<key>`.

If the user wants a specific asset rendered:

1. Register the asset to the project library first (upload / generate / import) and capture its asset id.
2. Pass the asset id via `availableAssetIds: [<id>]`. The id flows into `<available_assets>` and Gemini will declare an `image` / `video` / `audio` / `gif` / `svg` property whose `defaultValue` is that asset id — the new MG already renders the right media with no extra binding step.
3. To swap the asset later on a specific item, use `edit_item` with an `updates[]` entry and `propertyOverrides: { <propertyKey>: "<otherAssetId>" }`.

If Gemini should learn from a logo, product shot, screenshot, or other real image without embedding it as the rendered asset, pass that id in `referenceAssetIds`. Image references are pixels, so they can combine with a role anchor or template.

If you only have a URL and the user has not registered it as a project asset, download it into the sandbox workspace, then import the local file through `asset-import` + `push_asset` — there's no direct-URL escape hatch on `submit_motion_graphic`.

## Usage

Always pass `name` as a one-sentence content summary.

When creating a new same-role MG from an accepted role anchor in `:template` mode (via `referenceAssetIds: ["<roleAnchorAssetId>:template"]`), the brief should say exactly what content changes and explicitly preserve the template: `only change the specified content; replace every occurrence of old text/numbers; keep layout, typography, colors, spacing, motion, and visual treatment identical.` For a template, use the template UUID instead: `referenceAssetIds: ["<templateId>:template"]` when preserving structure, or `referenceAssetIds: ["<templateId>:style"]` when the requested count/form/content structure differs.

```ts
// Pass width/height explicitly. For fullscreen MGs, use the target timeline
// composition; for overlays, use the intended intrinsic overlay size.
// `coverage` declares the frame role: "fullscreen" = the MG IS the whole frame
// for its duration; "overlay" = it sits on top of the video.

submit_motion_graphic({
  prompt: `Content: Opening title "Hello World".
Direction: kinetic typography.
Background: opaque.`,
  name: "Hello World opening title animation",
  coverage: "fullscreen",
  width: 1080,
  height: 1920,
  designStyle: "core",
});

// availableAssetIds = assets the MG output should embed. Each becomes an
// editable image/video/audio/gif/svg property in the generated code; the user can swap
// them later in the inspector. Pass project asset ids (full or short prefix).
submit_motion_graphic({
  prompt: `Content: Brand logo intro using the provided logo asset.
Direction: brand intro.
Background: opaque.`,
  name: "Acme Corp logo brand intro",
  coverage: "overlay",
  width: 720,
  height: 720,
  designStyle: "core",
  availableAssetIds: ["86b0f6c70a"],
});

// Image referenceAssetIds = images the model should LOOK AT for style
// inspiration. They do NOT end up inside the MG — they only shape what Gemini
// generates.
submit_motion_graphic({
  prompt: `Content: Product launch title using the provided screenshot as visual inspiration.
Direction: match the screenshot's clean product UI tone.
Background: transparent.`,
  name: "Product launch UI-inspired title",
  coverage: "overlay",
  width: 900,
  height: 500,
  designStyle: "core",
  referenceAssetIds: ["86b0f6c70a"], // image asset id
});

// MG/template referenceAssetIds = code references. Pass either a role-anchor
// project MG id or a template UUID with a mode suffix:
// "<id>:template" for same structure, "<id>:style" for different structure.
submit_motion_graphic({
  prompt: `Content: Speaker name "John Doe", role "CEO".
Size & shape: lower-third-style name tag.
Direction: broadcast lower-third, restrained.
Background: transparent.`,
  name: "John Doe lower third",
  coverage: "overlay",
  width: 760,
  height: 220,
  designStyle: "core",
  referenceAssetIds: ["<mgId>:style"],
});
```

## Strategy

- If the user only asked to create an MG, tell them generation has started and can continue in the background.
- If the next step depends on the finished MG, use `track_progress` to get `outputAssetId`; in video editing workflows, place that project media-pool asset and verify it in context.
- For batches or repeated MGs, follow **Multi-MG consistency** before submitting. Same-role repeated MGs should usually generate from the accepted role anchor with `referenceAssetIds: ["<roleAnchorAssetId>:template"]`.

## Editing Existing Properties

Any time you're about to edit `asset.properties`, `item.propertyOverrides`, or promote a hardcoded value the user wants to tweak, read [`references/property-changes.md`](references/property-changes.md) first. Two habits it reinforces:

- Promote hardcoded values to editable properties the first time the user asks to tweak one — otherwise they'll come back for every adjustment.

## Parameters

`submit_motion_graphic({ ... })` takes:

| Field                                     | Description                                                                                                                                                                                                                                                           | Default                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `prompt: string`                          | Gemini brief using the fields in this skill. Include `Content` and `Background`; add Timing / User's words / Brand spec / Direction / Size & shape / Other context when they materially apply. Do not use a loose one-line prompt.                                    | -                           |
| `name: string`                            | Asset name (required)                                                                                                                                                                                                                                                 | -                           |
| `coverage: "fullscreen" \| "overlay"`     | Frame role (required). `"fullscreen"` = the MG IS the whole frame (full-screen card, edge-to-edge infographic) — use the target timeline composition as width/height. `"overlay"` = sits on top of the video. When unclear, align with the user; overlay is safe.     | -                           |
| `width: number`                           | Design canvas width in pixels. For fullscreen, use the target timeline width; for overlay, use the intended intrinsic overlay width.                                                                                                                                  | -                           |
| `height: number`                          | Design canvas height in pixels. For fullscreen, use the target timeline height; for overlay, use the intended intrinsic overlay height.                                                                                                                               | -                           |
| `durationInSeconds?: number`              | Seconds                                                                                                                                                                                                                                                               | 5                           |
| `tier?: "fast" \| "balance" \| "quality"` | Model tier. The tool also accepts legacy `"speed"` as an alias for `"fast"`; prefer `"fast"` in new calls.                                                                                                                                                            | balance                     |
| `mgModel?: "gemini" \| "kimi-k3"`         | Which LLM generates the MG code. `"gemini"` keeps the tier-based Gemini routing; `"kimi-k3"` pins Moonshot Kimi K3 with the same system prompt (tier maps to its reasoning effort). Follow the `motion_graphic_model` value from `<agent_settings>` when present.     | gemini                      |
| `availableAssetIds?: string[]`            | Current-project asset ids to **EMBED** in the MG output. Each becomes an editable image/video/audio/gif/svg property. Full UUIDs or short prefixes. Do not pass motion-graphic assets here.                                                                           | -                           |
| `referenceAssetIds?: string[]`            | Reference ids the model uses. Image project asset id → model LOOKS AT it as pixels. Role-anchor MG project asset id with `"<roleAnchorAssetId>:<mode>"` or template UUID with `"<templateId>:<mode>"` → code reference source. At most one code reference per submit. | -                           |
| `designStyle?: DesignSelector`            | Inject the active project's colors / fonts / style tone. Pass `"core"` for the normal project Design Style. Never carries logos or images — use `referenceAssetIds` for those. See "Applying the Design Style" above.                                                 | active project Design Style |

## Output

Returns a text MCP result with a short `jobId`, asset name, the submitted canvas, the coverage behavior, and a reminder that the completed job creates a project motion-graphic asset in the media pool/library. It does not return a structured `{ success, job, manage }` object; read the `jobId` from the text and call `track_progress` to wait for completion and get `outputAssetId`.

## Validation & Verification

### Backend Validation

When generating via `submit_motion_graphic`, the backend handles validation automatically:

1. Auto-fix common model mistakes
2. Validate structure and safety
3. Retry only when errors cannot be auto-fixed

### Manual Code Verification

**NEVER write MG code from scratch.** Use `submit_motion_graphic` for new MGs. This section is ONLY for modifying existing MG code that was already generated.

When the code validates but the visual result is wrong, or you are stuck on a tricky pattern, read [`guide/README.md`](guide/README.md) before iterating further.

Route an existing-MG change before choosing tools:

1. Position, size, timing, crop, or layer order of one placed instance: use `edit_item`. Do not read source code.
2. Text, color, font, media, boolean, or numeric value already exposed by the asset schema: use `edit_item propertyOverrides` for one instance or `edit_asset propertyDefaults` for the asset default. Do not read source code.
3. Internal animation, easing, layout, element order, or a new editable property: use the file-native workflow below. Do not start a generation job.
4. A fundamentally different visual mechanism, information structure, or overall design: use `submit_motion_graphic` to redesign it.

File-native revision workflow:

1. `inspect_asset` with the MG `assetId` and `includeCodeFile: true`. It materializes the source and returns only its workspace path, revision, byte size, and property schema.
2. Read the returned path once, then use native `Edit` for the smallest localized source change while preserving unrelated behavior and editable properties.
3. `edit_asset` with `action=update`, the same `assetId`, `codeFile`, and `expectedRevision`. Do not put the full source in `json.code`; the backend reads the edited file and validates it.
4. If the revision is stale, materialize again and reapply the localized edit to the fresh file instead of overwriting it.
5. Inspect targeted timeline frames for entry, settled state, and exit (or the exact user-reported failure frame) before claiming the visual change is complete.

## Convert an MG to a plain video

Bakes a motion graphic into a transparent video asset (vp8/WebM alpha) in the media pool. Use when the user wants the MG as a real video — to overlay on footage, or to replace the MG clip with a real video clip (convert / bake / MG 转视频 / 转成视频 / 转成视频素材). One MG maps to one deterministic video asset, so re-converting the same MG dedupes to the existing asset (no duplicate render). The converting/completed state shows up in the media pool exactly like a manual convert.

Do NOT use this for exporting/downloading — that's `export_motion_graphic_prores`. Convert produces an in-project video asset, not a download. Convert is Pro-gated (same entitlement as MG ProRes export); a non-Pro user gets a feature-gate error.

Three steps:

1. **Kick the render.** `convert_motion_graphic_to_video({ assetId })` with the MG asset id — returns `{ renderId, mgAssetId }` and starts a cloud render at the MG's native length. If it returns `status: "already-converted"` with a `videoAssetId`, the video asset already exists — skip straight to placing it. If a convert for the same MG is still rendering, it returns that in-flight `renderId` instead of kicking a second render.
2. **Wait for completion.** Poll `track_export({ renderId })` until that render's entry is `status: "complete"`. Renders take seconds to a couple of minutes — poll, don't assume instant. (No download URL needed — the next step resolves the output server-side.)
3. **Import as a video asset.** `register_converted_video({ mgAssetId, renderId })` — promotes the render into the media pool and returns `{ videoAssetId, deduped }`.

Placing / replacing on the timeline:

- To place the new video: `edit_item` add a video item referencing `videoAssetId`.
- To replace the original MG clip in place: in one `edit_item` call, delete the MG item and add a video item referencing `videoAssetId`. Preserve the MG clip's `from` / `durationInFrames`; if the MG clip was stretched or shrunk, set the video item's `playbackRate` so the video spans the same timeline duration.
- The output keeps the MG's transparency (alpha), so it overlays cleanly on any background.

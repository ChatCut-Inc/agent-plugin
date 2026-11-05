---
name: "制作产品 / App 宣传片"
displayName: "制作产品 / App 宣传片"
name_en: "app-promo-guide"
name_zh: "制作产品 / App 宣传片"
description: "为软件产品、App 或网站制作宣传片，结合真实品牌素材、视频、MG 动画、配音与音乐。"
description_en: "Create a promo for a software product, app or website using verified brand assets, video, motion graphics, voiceover and music."
argument-hint: "为这个产品制作一条宣传片，结合 AI 视频、MG、配音和音乐，保留可编辑版本。"
user-invocable: "true"
version: "2.0.4"
---
执行前先读取同套件 chatcut-plugin-basics 和 widget-forms，检查 ChatCut 连接器，确认目标项目并使用千问支持的提问方式。不能直接输出其他宿主的交互标签。


# App Promo

## What this skill covers

Create professional short promo videos for software products: SaaS, apps, and websites. Confirm the target duration with the user before scripting.

Two generation paths, which may be combined with separate TTS and music when the confirmed brief calls for it:

- **Motion Graphics (MG)** - Generate segmented MG clips, TTS voiceover, background music, and timeline assembly. Best for high information density, text emphasis, and strict brand consistency.
- **AI video** - Generate video using the models and duration limits currently supported by the video-gen skill and tool schema. Best when visual impact matters most, a realistic scene texture is needed, and text requirements are light.

## Required inputs

Before production starts, collect:

1. **Product information** - Product name, main selling points, target audience, target platform, etc.
2. **Visual assets** - Logo (required), product screenshots, feature images, demo video.

The source can be either path. **Ask which path the user wants as the first step of Phase 1**:

- **A. Product website URL** - The agent uses Firecrawl to extract information and assets automatically.
- **B. User-provided materials** - The agent asks for product information and has the user upload assets.

## What shapes the promo

Before writing the script, align with the user on these dimensions:

- **Target platform + length + aspect ratio** - YouTube, Twitter, WeChat Channels, TikTok, etc.
- **Tone** - Premium, energetic, minimal, cinematic, etc. Clarify vague wording with concrete options in the user's language.
- **Generation path** - MG or Seedance, based on asset type and style preference.
- **Audio driver** - TTS voiceover mode vs music-only beat-sync mode.
- **Narrative structure** - Introducing, Problem-Solution, Copy + UI Loop, Pure Visual Impact, Feature Deep Dive. See the narrative-mode table in Phase 2.

### Preset mode, if present

If the prompt context contains `<preset_directive>`, the user selected a preset from the template entry. The preset also provides these context variables, and **you must follow them** instead of bypassing them:

- **`<creative_guidance>`** - Creative direction template: style, narrative, visual tone. In Phase 2, adapt the script to this direction by writing a tailored version; do not freestyle.
- **`<execution_path>`** - Generation path identifier: MG, Seedance, etc. In Phase 3, follow this path and load the matching reference; do not ask the user to choose MG vs Seedance again.
- **`<reference_assets>`** - Internal production reference assets. In Phase 1, **do not register these in the asset library** because the user should not see them. In Phase 3, pass them directly as URLs for generation, through the reference fields supported by the current submit_video schema.

**What still needs user alignment** - The preset already fixes creative direction and execution path, but you still need to align on target platform if the preset did not specify it, duration, and product information confirmation.

## Flow

There are 3 phases. **You must get user confirmation at every key checkpoint before continuing**, unless the user explicitly asks you to run the whole process end-to-end without stopping. Key checkpoints:

- **Product information and assets** (end of Phase 1) - Is the information accurate? Are the selected assets correct?
- **Creative direction** (inside Phase 2, before writing the script) - Are platform, duration, tone, generation path, etc. aligned?
- **Full script** (end of Phase 2, before generation) - Is the script ready to generate?
- **Generation result** (end of Phase 3) - Is the result OK, or should it be iterated?

**Do not bundle multiple checkpoints into one reply.** Send one checkpoint per reply and wait for the user's response before moving to the next. Do not show product information + creative direction + script all at once and ask for one combined confirmation.

Upstream mistakes make downstream work useless: wrong product information -> wrong script; wrong script -> wasted generation credits.

### Phase 1 - Gather and align product info & assets

1. **Ask for the source path** - Use the host question UI or a plain-language question; this is a classic two-option choices scenario. Write option labels in the user's conversation language. English example:

   Ask whether the user wants to provide a product URL or upload assets. Use a native question control if available; otherwise ask in plain conversation.

2. **Path A: URL**
   - Call the available `web_browser` connector tool to extract branding + images + product information. See the Firecrawl command in `references/info-gathering.md`.
   - Extract the logo and product screenshots. See the logo extraction rules and data URI handling in `references/info-gathering.md`.

   **Path B: user-provided materials - collect everything in one widget flow**: uploaded assets (logo + product screenshots + feature images), product name, main selling points, target audience, target platform, and desired tone. Multi-dimensional inputs + file upload is the textbook widget case; do not split it into multiple rounds. See the `widget-forms` skill and load it before rendering the form.

3. **Download and batch-register assets into the asset library**. See `references/info-gathering.md`. **This step is a hard prerequisite for confirmation**: users cannot confirm assets they cannot see in the asset library, and text descriptions such as "img1: front view" are not a substitute. Unregistered assets are invisible to users and cannot be referenced for generation.
4. **Save the brand as this project's Design Style**. In a promo the brand _is_ the visual language, so it must live in the project's Design Style, not in chat text. Map `branding.colors` into `colors[]`, `branding.typography.fontFamilies` into `fonts[]`, and the extracted logo into `logos[]`, then call `manage_design_style` with `action: "create"`, named after the product. Read the saved project Design Style and explicitly apply its brand values to direct MG code and video prompts. **A promo with a known brand never goes through the catalog style picker** - presets are the fallback for a promo whose brand cannot be obtained at all. See the mapping and the fallback rule in `references/info-gathering.md`.
5. **Confirm product information, brand, and assets with the user**. Before confirming, make sure the assets render in the asset library.
   - Is the product description / target audience / main selling point accurate? Should anything be corrected or added?
   - Are the brand colors, fonts, and logo captured correctly? Name the saved Design Style and list what went into it, so a wrong extraction is caught here rather than after generation.
   - Are the logo and product images the right assets to use? Should any be replaced, removed, or added?

Preset reference assets inside `<reference_assets>` **must not be registered in the asset library**. They are internal production references. Pass them directly by URL during generation, through the reference fields supported by the current submit_video schema, and do not show them to the user.

### Phase 2 - Plan and confirm script

1. **Align creative direction** using the five dimensions in "What shapes the promo". Ask only for key missing inputs and provide concrete choices. **If the preset provides `<creative_guidance>`, adapt to that direction; do not freestyle.**

   **Confirm creative direction with the user** - Platform, duration, tone, generation path, audio driver, and narrative structure must be aligned before moving to step 2 and writing the script.

2. **Choose narrative structure** based on available assets. In preset mode, follow the structure from `<creative_guidance>`:

   | Asset situation                     | Recommended structure  | Notes                                                                                        |
   | ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
   | Multiple clear feature images       | **Copy + UI Loop**     | One-sentence intro -> Slogan -> Feature loop with alternating copy and visuals -> Logo + CTA |
   | Clear pain point to solve           | **Problem-Solution**   | Hook pain point -> Product appears -> Outcome after use -> CTA                               |
   | Product launch / homepage           | **Introducing**        | Logo + product name -> One-sentence positioning -> Core capability showcase -> CTA           |
   | UI design is the core selling point | **Pure Visual Impact** | Logo entrance -> Rapid multi-screen switching synced to music -> Slogan + CTA                |
   | One killer feature                  | **Feature Deep Dive**  | Hook + slogan -> Deep demo of the main feature -> Briefly cover other features -> CTA        |

3. **Write copy**. For detailed rules and examples, see `references/script-templates.md`:
   - **The first 3 seconds decide everything**. Use the PAS framework: Problem -> Agitate -> Solve.
   - **Word count guide**: 15s is about 30-40 Chinese characters or 25-35 English words; each sentence should be <= 10 Chinese characters or 8 English words.
   - **Say outcomes, not features**. **One idea per sentence**. **Read the full script aloud as a self-check**.
4. **Plan the storyboard** and show it to the user as a markdown table. See `references/script-templates.md` for format:

   ```
   | # | Time | Visual | Copy | Reference Asset |
   ```

   Each row: Visual (visual content + motion), Copy (on-screen text or voiceover), Reference Asset (`@Logo`, `@img1`, or mark pure MG as `-`).

5. **Confirm the full script with the user**. Generation consumes credits and is irreversible. Show the full User Script, then end the reply with the host question UI or a plain-language question for the next step. Write option labels in the user's conversation language. English example:

   Ask in ordinary conversation, preserving the choices and waiting for the answer.

### Phase 3 - Generate visuals

Execute according to the generation path. In preset mode, route by `<execution_path>`; otherwise use the choice aligned with the user in Phase 2:

- **MG path** -> `references/execution-mg.md` for TTS mode, music-only beat-sync mode, brand injection, and timeline assembly.
- **Seedance path** -> `references/execution-seedance.md` for script-to-prompt conversion, omni_reference, and text-rendering precautions.

In preset mode, pass `<reference_assets>` directly into generation as URLs, through the reference fields supported by the current submit_video schema; do not route them through the asset library.

**Confirm the generation result with the user** - Show the result and ask whether it is OK or should be iterated.

## Core principles

### Brand consistency

> **The video is a visual extension of the user's product, not an independent artwork.**

- Brand elements - colors, fonts, border radius, spacing, button styles, etc. - **must be extracted from the user's page or provided by the user**. Do not invent them.
- **The project's Design Style is where the brand lives.** Save it there in Phase 1 and read it back before writing MG code or generation prompts. Do not assume brand values are automatically injected into direct JSX authoring.
- All generation calls, MG or video, must use the same brand specification.
- For Web MG, follow create-motion-graphics to author JSX directly. Use confirmed brand elements and storyboard timing; do not call the built-in agent MG generator.

### Asset rules

> **Always extract or obtain original images first. Screenshots are not a substitute for original images.**

- Logo -> must be extracted or provided by the user. **Never redraw it with AI.**
- Original images -> required for product images, feature images, and template previews. They are the core visual generation assets.
- Functional demo assets -> extract if available, including GIFs, videos, and animated previews.
- Page screenshots -> optional, only for showing the overall web interface.

**Usage rule**: Feature showcase -> use original images | Interface showcase -> use screenshots | Logo -> use the real logo.

### Pacing

**Fast pacing is the core trait of a promo.**

- One visual change every 2-3 seconds.
- 15s video: 6-8 change points. 30s video: 12-15 change points.
- A single MG should not exceed 3 seconds.

**Fast pacing does not mean fragmentation**: changes should stay around one theme, use rapid switching to reinforce the message, and keep the visual style consistent.

### Copy principles

- **The first 3 seconds decide everything.** Whether it is a pain-point hook, an "Introducing..." title, or a striking visual, the opening must create curiosity or desire.
- **Say outcomes, not features.** "Write smarter. Ship faster." beats "AI-powered writing assistant with style learning."
- **One idea per sentence.** Keep it short, forceful, rhythmic, and natural to say aloud.
- **Every second must earn its place.** A 15s promo has room for about 40 words; delete any sentence that does not add information or emotion.
- **The ending should close the idea, not hard-sell.** The CTA should be a natural conclusion. Do not introduce new information in the last 3 seconds.

### Less but better

Do not over-add motion effects or decorations. One right element beats three forced elements.

## Tools

- **Phase 1: information gathering** - `web_browser` connector tool + `asset-import` for cloud asset registration.
- **Phase 2: script planning** - reasoning + the host question UI or a plain-language question to confirm the script; see the example at the end of Phase 2.
- **Phase 3: visual generation**
  - MG path: `create-motion-graphics` + `voice` for TTS / music + timeline edits.
  - Seedance path: `video-gen` (Seedance 2.0) + timeline edits.

## References

- `references/info-gathering.md` - Firecrawl command details, data URI logo handling, parallel download, batch registration.
- `references/script-templates.md` - Narrative-mode details, copywriting examples, storyboard table format.
- `references/execution-mg.md` - Full MG generation flow: TTS mode, music-only beat-sync mode, brand injection, examples.
- `references/execution-seedance.md` - Seedance prompt conversion, brand integration, text rendering.

## Error handling

| Scenario                    | Handling                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Firecrawl extraction failed | Check the live web_browser schema for supported retry options. If unavailable or still failing, ask for product screenshots or brand assets. |
| Logo extraction failed      | Ask the user to provide it manually. **Never redraw it with AI.**                                                                          |
| Style extraction incomplete | Use a default modern style plus the extracted brand colors.                                                                                |
| MG style inconsistent       | Check the actual MG code and saved brand values, then revise the code and verify the rendered result.                                                                          |

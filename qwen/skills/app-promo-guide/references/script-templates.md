# Script Templates - Narrative / Copy / Storyboard Reference

The main SKILL.md already covers the narrative-mode table, core copy principles, and storyboard table format. This file is a **detailed reference** for copy refinement examples, audio-mode selection details, complete storyboard examples, and asset usage principles.

---

## Audio mode selection

Choose the audio driver before writing the script. It affects the whole storyboard structure.

| Mode                          | Best for                                                                | Pacing source                                                |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| **TTS voiceover mode**        | Product promos that need voice explanation and high information density | TTS drives visual rhythm; visuals follow the voiceover       |
| **Music-only beat-sync mode** | Products with strong visual impact that do not need voiceover           | Music drives visual rhythm; MG transitions align to the beat |

After choosing the mode, mark it in the storyboard table. During Phase 3, execute the matching mode in `execution-mg.md`.

---

## PAS framework, first 7 seconds

P -> A -> S:

- **Problem** - The user's current pain point or situation.
- **Agitate** - Make the impact or consequence of that pain clearer.
- **Solve** - Bring in the product as the solution.

Example:

> "Still drowning in sticky notes and scattered tasks?" (P + A)
> "Meet ProjectFlow." (S)

---

## Copy refinement examples

| Plain wording                                    | Premium promo style                           |
| ------------------------------------------------ | --------------------------------------------- |
| "Our product has AI writing features"            | "Let AI write for you"                        |
| "Supports multiple export formats"               | "One click. Publish anywhere."                |
| "Our product uses AI technology"                 | "Write smarter. Ship faster."                 |
| "Provides data visualization analysis"           | "See the story behind the numbers"            |
| "Supports team collaboration and real-time sync" | "Build together. See together. Win together." |

**Self-check**: read the whole script aloud in one pass. If it feels rushed, delete a line. If it feels slow, tighten the wording.

---

## Complete storyboard example

15-second SaaS product promo for a project management tool:

| #   | Time     | Visual                                                                    | Copy                            | Reference Asset                             |
| --- | -------- | ------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| 1   | 0-2.5s   | Logo icon bloom on dark bg, gradient glow expands                         | _(visual hook)_                 | @Logo (logo.svg)                            |
| 2   | 2.5-5s   | Large headline fades up on dark bg                                        | "One dashboard for everything." | -                                           |
| 3   | 5-7.5s   | Product UI enters, feature areas highlight one by one, text labels appear | "Drag, drop, done."             | @img1 (dashboard.webp)                      |
| 4   | 7.5-10s  | Multiple screenshots fly in as a fast carousel, with swipe transitions    | "Track in real time."           | @img2 (kanban.webp), @img3 (analytics.webp) |
| 5   | 10-12.5s | Data counter rolls up over a warm background                              | "10x faster shipping."          | -                                           |
| 6   | 12.5-15s | Centered logo + CTA button glow entrance                                  | "projectflow.com"               | @Logo (logo.svg)                            |

Each row must clearly specify:

- **Visual** - What appears on screen and how it moves. Do not write "place an image"; write "screenshot enters + feature area highlight animation".
- **Copy** - On-screen text or voiceover content.
- **Reference Asset** - Which collected asset to use, such as `@Logo`, `@img1`, plus filename; mark pure MG as `-`.

---

## Asset usage principles

| Shot type                                           | Asset to use                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Product feature showcase                            | **Must** bind real screenshots / feature images as MG references |
| Logo entrance                                       | **Must** use the real logo file; do not redraw it with AI        |
| Opening hook / abstract transition / text animation | Pure MG generation; no asset needed                              |

---

## MG animation tone

Use speed and force: fast in and fast out, with acceleration/deceleration variation, like Apple keynote text motion. Write the motion direction into the Visual description during storyboarding.

---

## How to present the script to the user

- **Describe the video structure directly**, for example: "Product launch style: Logo opening -> core value -> feature showcase -> CTA ending". Do not use internal category labels such as "narrative mode C" or "Phase 2".
- **Explain the brand color plan and source**, for example: "Primary color #1E3A5F comes from your website navigation bar."
- **Use the storyboard table format above** so the user can see which asset each shot uses.

---
name: widget-forms
description: Use when a ChatCut plugin session (Codex, Claude Code, or another MCP host) should ask the user for structured input with an in-chat form, including single-select, multi-select, text fields, visual style cards, voice audition cards, or native ChatCut scenario cards.
---

# Widget Forms

Host scope: the `ask_followup_questions` MCP-App widget below renders in hosts that support ChatCut form widgets (Codex). Claude Code does not render MCP-App widgets — use the Claude Code recipe below for the same moments with the same content. The question-design rules (single question per field, user-language labels, no media-upload questions) apply to every host.

## Claude Code Runtime (verified 2026-07-15)

Hard boundary: Claude Code does not render ChatCut MCP-App results. Never call
`ask_followup_questions` in this runtime. Use the host-native `show_widget` tool
on the `visualize` server:

1. Discover `visualize.show_widget`, then load its `read_me` with the
   `elicitation` module for the current desktop platform. Follow the current
   contract rather than examples remembered from an earlier session. Load it
   once and reuse it for the rest of the session; do not rediscover or reread it
   for each form. Read
   [references/elicit-recipes.md](references/elicit-recipes.md) only when the
   form contains visual or voice media cards. A plain single/multi/text form
   needs only the current `read_me` contract.
2. Infer first from the conversation, project state, and attachments. Ask only
   for information that is both necessary for the next step and not already
   known. Then render exactly one host-wired `<form class="elicit">` using the canonical header, body,
   group, footer, and fixed
   chrome from `read_me`. Put all related questions, media previews, and the
   single submit action in this one widget; never render a preview widget plus a
   second question UI. Claude Desktop already draws the outer `show_widget`
   frame, so keep the required `.elicit` structure but flatten only its visual
   wrapper with
   `style="border:0; border-radius:0; box-shadow:none; background:transparent"`.
   Do not remove or rename the form, header, body, or footer classes; they remain
   required for answer collection and submission.
3. Map single/multi choices to
   `.elicit-pills[data-name][data-multi]` containing
   `.elicit-pill[data-value]`; use the documented Elicitation controls for
   text and Other values. For an off-list answer, use exactly one
   `.elicit-pill[data-other]` and one adjacent `.elicit-other[data-for]`;
   `data-for` must exactly match the pill group's `data-name`. Visual, voice,
   and scenario cards remain selectable `.elicit-pill` controls with clean
   `data-value` attributes. Ordinary and visual choices use buttons. A voice
   choice uses one non-button `.elicit-pill` card that directly contains its
   title, description, and native audio player; current Claude Desktop wires
   selection by the `.elicit-pill` class rather than the element tag.
4. Submit only through `<button type="button"
class="elicit-submit">...</button>`. In Claude Code Desktop this fills the
   composed answer into the user's prompt box; it does not press Send. Use an
   honest fill-oriented action label such as "Fill editing brief".
   Never claim "sent" before that user message appears in chat. Stop the current
   turn and wait for the user to send the filled prompt.
5. Build canonical option tuples before reading media or writing HTML. This is
   a hard preflight gate; do not call `show_widget` until every visible media
   option has an authoritative `(id, display label, description/tags)` source:
   - Design Style cards: call `manage_design_style` with
     `action: "list_presets"` and `locale` matching the conversation language.
     Choose from that result and copy each returned `id` and `name` exactly.
     Never derive, translate, shorten, or improve a preset name from its image.
   - Voice cards: load the `voice` skill and read
     `${CLAUDE_PLUGIN_ROOT}/skills/voice/references/voices.md`. Choose one row per
     card; keep its preset id, official/localized display name, tags, and sample
     binding together. Never create a voice name from broad traits or a sample
     filename.
     If either authoritative source is unavailable or times out, do not fabricate
     options and do not render a misleading form. Report the catalog problem
     concisely and retry only after the source is available.
6. Read `${CLAUDE_PLUGIN_ROOT}/assets/widget-media/manifest.json` only after the
   canonical tuples exist. The manifest is a media resolver, not a naming
   catalog. Resolve media by the same tuple id using `scenario/<scenarioId>`,
   `design-style/<presetId>`, or `voice/<voiceId>`, then concatenate the
   manifest `baseUrl` and entry `path`. Ignore caller-provided S3, CloudFront,
   `app.chatcut.io`, relative, or other non-manifest URLs. If a key is absent,
   render that exact authoritative label without media in the same form. Never
   download, resize, transcode, base64-encode, print, or save media or build
   intermediate HTML/JSON files at runtime.
7. Keep visual sets focused: show 3 strong choices by default and expand toward
   6 only when the user asks to browse more broadly or the decision genuinely
   needs that range. Keep the HTML payload small; remote media bytes must never
   enter the prompt or widget arguments.
8. Write zero event handlers and zero custom scripts. Voice audition uses a
   single non-button `.elicit-pill` card with its native `<audio controls>`
   nested directly inside. Clicking the card or its player selects that voice
   through the host's delegated `.elicit-pill` handler, while playback remains
   browser-native. Do not wrap the player in a `<button>` and do not create a
   separate selector card above it. Do not use
   `sendPrompt(...)`: live testing shows that it also only fills Claude Code
   Desktop's prompt box despite its read-me wording.
9. Do not add file input to an Elicitation form: one file group currently breaks
   handoff for every answer. Ask for missing source media outside the form by
   telling the user to drag it into the chat input, then follow `asset-import`.
10. In the structured collection scenarios covered by this skill, do not replace
    the combined form with `AskUserQuestion`; that modal is more interruptive and
    loses the single multi-question intake experience. This does not restrict
    normal `AskUserQuestion` use in unrelated workflows. If `show_widget` is
    genuinely unavailable, ask concisely in ordinary chat.

For media forms, minimize first-render latency by starting all independent
preparation together after this skill loads: load the current Elicitation
`read_me`, read this skill's media recipe and manifest, and fetch only the
authoritative catalogs actually needed by the form. Read the voice
catalog only for voice cards; call `list_presets` only for Design Style cards.
Do not serialize independent reads, inspect unrelated skills, probe media URLs,
or create intermediate files. Reuse all loaded local contracts and catalogs for
later forms in the same session. The only expected network wait before a mixed
MG/voice form is the Design Style catalog call; `show_widget` is the final call.

Claude Elicitation file attachments are not ChatCut project imports; use the
`asset-import` workflow when project media is missing.

Use user-language readable copy for `data-name` and `data-value`; the host puts
those strings directly into the filled answer line. Keep preset ids, voice ids,
and scenario ids out of those attributes, and retain a label-to-id map from the
tool results in context. The host formats the answer as `<header> details —
<data-name>: <value> · ...`, with comma-separated multi-select values. Once that
line appears as a user message, map each visible label back to the internal id
from the candidate list and continue without asking the same questions again.

Immediately before `show_widget`, audit every media card in both directions:
the visible label must map to exactly one authoritative id, and that same id
must resolve the card's manifest key. A label copied from a different id, an
invented alias, a shortened official name, or an image chosen before the catalog
lookup is a failed preflight. Fix the tuple instead of rendering it.

## Codex Runtime

Hard boundary: use the ChatCut MCP Apps form tool in Codex. Do not copy Claude
Code's Elicitation HTML or `show_widget` recipe into a Codex conversation, and
do **not** output raw ChatCut native `<widget>...</widget>` HTML; Codex cannot
render that editor-only protocol.

### Runtime Rule

Call `ask_followup_questions`. This is the Codex/external-MCP equivalent of the
native ChatCut widget form protocol.

Plan the whole questionnaire before calling the tool. Send one final form, not a
trial form followed by a corrected form. The tool supports at most 12 fields; if
the user asks for more questions, merge related prompts into combined fields
before the first call.

After calling `ask_followup_questions`, stop the turn and wait for the submitted
answer to appear in chat. Do not apply a choice, create assets, or continue
planning from a recommendation until the user's selection is present in the
conversation.

### Supported Field Mapping

Build a `fields` array. Write every visible string in the user's conversation
language.

- Native `<form-single>` -> `{ type: "single", variant: "default" }`
- Native `<form-multi>` -> `{ type: "multi", variant: "default" }`
- Native `<form-text>` / `<form-textarea>` -> `{ type: "text" }`
- Native `<form-visual>` -> `{ type: "single", variant: "visual" }`
- Voice audition cards -> `{ type: "single", variant: "voice" }`
- Native start-scenario cards -> `{ type: "single", variant: "scenario" }`

### Form Copy Tone

For form-level text (`title`, `prompt`, `fields[].label`, `submitLabel`, and
`messagePrefix`), write like ChatCut is a capable video-making partner inviting
the user to describe what they want, not like a rigid survey.

Aim for:

- Warm, open-ended, and action-oriented. The copy should imply "choose the
  closest video need or just tell me your idea; we can figure it out together."
- Short and scannable. Use one natural sentence for `prompt` and concise
  question labels.
- Honest capability framing. ChatCut can help with many video workflows, but do
  not claim unsupported abilities or guarantee a result before inputs are known.
- The user's language and local product terms. Keep "ChatCut", "B-roll",
  "Motion Graphics", "MG 动画", model/product names, and platform names in their
  established forms.
- User-facing creative wording. For early planning or creative-intake forms,
  prefer natural terms such as idea, direction, plan, story, shot list, audience,
  mood, or video need over internal production-document language.

Avoid stiff labels such as "Select video type", "Please choose the video type
for this project", or "What type of video do you want to make?" for scenario
intake unless the host has no room for warmer copy.

For a scenario-intake form, prefer copy like:

```json
{
  "title": "What do you want to make?",
  "prompt": "Choose the closest video scenario, or choose Something else and describe your idea.",
  "submitLabel": "Start creating",
  "messagePrefix": "I want to start with this video direction:",
  "fields": [
    {
      "id": "scenario",
      "label": "Which scenario fits your video best?",
      "type": "single",
      "variant": "scenario",
      "otherPlaceholder": "For example: turn my travel footage into an atmospheric vlog / make a launch video for a new product"
    }
  ]
}
```

Do not include file-upload questions in Codex forms. If a task actually needs
source media and the project/chat does not already have it, ask the user
separately to upload files through the Codex composer Add files flow or directly
in the ChatCut editor. File upload is not a default prerequisite for every
questionnaire; only ask for it when the next editing step depends on missing
media.

For choice fields:

- Use `id` for the internal value the next tool call needs.
- Use `label` for what the user sees.
- For ordinary single-select and multi-select cards (`variant: "default"`), keep
  options label-only. Do not add per-option `description` unless the user cannot
  distinguish the choices from labels alone.
- Use `description` mainly for voice cards. Visual style cards should usually
  use only `preview` + `label`.
- When an off-list answer is acceptable, add an explicit option with
  `id: "__other__"` and a `label` in the same language as the rest of the form,
  using the word the user would expect for an off-list answer. The widget will
  turn this option into a text entry when selected. Use `otherPlaceholder` if
  the text entry needs a placeholder.

For visual cards:

- Use real image URLs or data image URLs in `preview`.
- For Design Style catalog choices, call `manage_design_style` with
  `action: "list_presets"` first, then map each returned preset to
  `{ id: preset.id, label: preset.name, preview: preset.thumbnailUrl }`.
- Never hardcode catalog preset ids unless the user already selected one.

For voice cards:

- Use `audioUrl` for the sample file.
- Prefer the documented sample path such as `/voice-samples/doubao-liuchang.mp3`
  or a public HTTPS URL. Do not pass localhost sample URLs; MCP host iframes do
  not reliably resolve editor-local media.
- Keep user-visible descriptions provider-neutral. Describe the voice the same
  way the native ChatCut audition UI does: gender / age range / tone / use case,
  such as `Female / young / friendly, general` or `男 / 中年 / 低沉知识解说`.
  Do not show provider names like ElevenLabs or Doubao in option descriptions.
- Keep the option `id` equal to the provider voice id needed by `submit_voice`.

For native start-scenario cards:

- Use this when the user should choose which ChatCut video workflow to start,
  such as talking-head editing, MG animation, long-video-to-shorts,
  product/app promo, AI short film, or explainer video.
- Present these as common video needs/scenarios, not as the only possible video
  workflows. The form must also let the user describe a different video need.
- Use exactly one single-select field with `variant: "scenario"`.
- Provide options using the canonical ids below and localized labels in the
  user's language. Include `id: "__other__"` only when you need to customize the
  off-list label; otherwise the backend appends a localized Other option.
- English, Chinese, and Spanish scenario labels/descriptions/starter prompts are
  built in. For any other user language, faithfully translate each scenario's
  English `label`, `description`, and starter prompt into the user's language
  and pass those localized values in the option objects. Preserve ChatCut
  product terms and workflow meaning; do not add new requirements. Use
  `submitPrompt` for the translated starter prompt. This override is specific to
  `variant: "scenario"`; ordinary option cards, voice cards, and visual style
  cards already get their visible text from the values you pass.
- Do not provide custom `preview` or `audioUrl`; the backend fills the native
  first-screen preview image.
- Canonical ids: `talking-head`, `motion-graphics`, `long-video-to-shorts`,
  `app-promo`, `ai-cinematic-short-film`, `explainer`, plus `__other__` for a
  free-form video need.
- Example options:
  `{ "id": "talking-head", "label": "Talking Head Editing" }`,
  `{ "id": "motion-graphics", "label": "Motion Graphics" }`,
  `{ "id": "long-video-to-shorts", "label": "Long Video to Shorts" }`,
  `{ "id": "app-promo", "label": "Product / App Promo" }`,
  `{ "id": "ai-cinematic-short-film", "label": "AI Short Film" }`,
  `{ "id": "explainer", "label": "Explainer Video" }`,
  `{ "id": "__other__", "label": "Something else" }`.

### Current Gaps

`ask_followup_questions` is for structured answers only. It does not support native
custom HTML, timeline parameter bridges, editor item selection, or file upload
fields. For files already held by the agent runtime or attached directly to the
chat outside this card, the media-import workflow is still valid: call
`import_media` and run the helper/direct upload path. For files the user wants
to place directly in a project, ask them to use the ChatCut editor upload UI.

### Example

```json
{
  "title": "Your video idea",
  "prompt": "Choose or fill in what you have in mind so ChatCut can pick a good starting direction.",
  "submitLabel": "Send idea",
  "messagePrefix": "Continue with this video direction:",
  "fields": [
    {
      "id": "goal",
      "label": "What's the main goal of this video?",
      "type": "single",
      "options": [
        { "id": "product_intro", "label": "Product intro" },
        { "id": "social_ad", "label": "Social ad" },
        { "id": "__other__", "label": "Something else" }
      ]
    },
    {
      "id": "elements",
      "label": "What should it include? (Select all that apply)",
      "type": "multi",
      "options": [
        { "id": "broll", "label": "B-roll" },
        { "id": "logo", "label": "Brand logo" },
        { "id": "__other__", "label": "Something else" }
      ]
    }
  ]
}
```

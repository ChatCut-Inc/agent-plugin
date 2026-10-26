# Web caption style previews

Use this for a request to see, compare, or choose ordinary or MG caption styles,
including a widget showcase. A simple "add captions" request still applies
Plain directly. Previewing samples does not require creating a project,
transcribing audio, generating media, or changing a timeline.

## Catalog and language

Read the live `edit_captions action:"template"` catalog without `templatePreset`
or `preset`. Pass the intended caption language in `json`, for example
`{"languageCode":"zh-Hans"}`. Use returned names and IDs, including
`publishedTemplates` for published ordinary/MG templates. Select relevant
candidates for the request; do not hardcode a template, a language variant, or
a fixed number of choices.

All caption previews use `en`, `zh-Hans`, `es`, `ja`, or `zh-Hant`. The caption
language is independent of the conversation language. When comparing languages,
use separately labeled fields. A catalog candidate's `languageCode` and its
field's `captionTarget.languageCode`, if present, must match. Do not use a
separate `zh` convention for ordinary captions or substitute a different
language when a template lacks the requested variant.

## Codex MCP App

Use `ask_followup_questions` with `type:"single", variant:"visual"`. First
check its live schema supports `captionPreview`; if the connected server lacks
this feature, report that limitation and use ChatCut for preview instead of
inventing an image/video URL. The MCP App supplies the renderer and fonts.

Map each offered candidate to one option:

- Ordinary built-in:
  `captionPreview:{kind:"preset",presetId:"<returned preset ID>"}`.
- Ordinary custom candidate:
  `captionPreview:{kind:"custom",styleId:"<stable draft ID>",basePresetId:"<returned base ID>",style:{...}}`.
  Use supported caption-style data; `basePresetId` is optional.
- Published ordinary or MG template:
  `captionPreview:{kind:"catalog",templateId:"<exact UUID>",revision:<returned revision>,languageCode:"<supported language>"}`.
  Preserve the exact live revision and name. Do not pass a built-in preset ID
  or an MG reference-library ID as a published template ID.

For project-content previews, use exact `timelineId`, `captionsItemId`,
`trackId`, `cardId`, or `sourceId` from project reads in `captionTarget`; never
invent a target. Ordinary previews use actual content when available and
otherwise clearly labeled language samples. Published-template previews show
sample text, not project content; omit `captionTarget` for standalone catalog
samples or specify only their matching language.

Always include one localized `__other__` option and `otherPlaceholder` in the
same visual field. Other is a labeled card whose text input appears below the
choices. Do not add More, a browse-catalog option, or a second custom text card.
Other returns a new style requirement; it does not apply a template.

Example shape only: replace the UUID, revision and name with one live catalog
entry, add the relevant candidates, and localize all visible copy. Do not use
the placeholder UUID as a real template.

```json
{
  "title": "Choose a caption style",
  "fields": [
    {
      "id": "caption_style",
      "label": "Which caption style fits your video?",
      "type": "single",
      "variant": "visual",
      "captionTarget": { "languageCode": "zh-Hans" },
      "otherPlaceholder": "Describe the caption style you want",
      "options": [
        {
          "id": "00000000-0000-4000-8000-000000000000",
          "label": "Live catalog name",
          "captionPreview": {
            "kind": "catalog",
            "templateId": "00000000-0000-4000-8000-000000000000",
            "revision": 0,
            "languageCode": "zh-Hans"
          }
        },
        { "id": "__other__", "label": "Other" }
      ]
    }
  ]
}
```

Supply identities and style data only. Never send HTML, scripts, CSS renderer
code, `serverResolved`, a guessed runtime URL, or hand-written `edit_captions`
`onSubmit` bindings. Do not generate a GIF/video or use an unrelated thumbnail
to stand in for a live caption preview.

Check returned preview availability before telling the user it is ready. For
an unavailable option, read `unavailableReason` and correct its identity,
language or revision, or explain the remaining limitation. Tool success alone
does not prove animation/font playback. Keep the exact submitted choice and
target in context while waiting for the user's answer.

## Claude Elicitation

Use `widget-forms`' existing `visualize.show_widget` Elicitation flow with live
catalog names and its labeled Other control. Do not call
`ask_followup_questions`: Claude does not render its MCP App. The Codex Web
renderer and its runtime/font URLs are not an approved Claude inline-MG route.
Explain that animation and font preview must be reviewed in ChatCut before
applying; never claim label-only choices or approximate CSS show the animation.
Preserve exact catalog identity, revision and caption language in the
label-to-choice map. Do not download or republish project previews to the
public CDN to work around host resource restrictions.

## After selection

Previewing does not mutate the project. Catalog samples never auto-apply.
For ordinary previews, a standalone MCP App picker may receive a host-derived
application binding when it resolves an existing target; combined intake and
sample choices return selections to the workflow. Use the tool-returned
preparation/application recipe and recorded scope. If the host already applied
it, verify the result instead of applying it again.

Before applying a published template, inspect `read_captions`, confirm the
intended existing target and current published revision, then use the live
tool's exact application contract. A changed revision needs a fresh preview.
Do not claim a sample choice was applied to a timeline or that choosing Other
authorizes a project mutation.

Published MG previews here are a Web capability. A connection to
`chatcut_desktop*` uses Desktop's own synced skills and capabilities; this
adapter does not enable MG on Desktop or replace its renderer.

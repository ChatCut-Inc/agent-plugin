# Web caption tracks

The current Web caption tools are **v2-only**. If a tool says the project is v1,
call `edit_captions {"action":"refresh"}` once to convert saved captions without
regenerating them, then read again. Do not try legacy Program/Cue operations,
disable/re-enable, or reset as a migration workaround. Reads never migrate.

## Read identities before editing

`read_captions` returns native caption tracks, items, revision and global CC.
`captionTrackSummary` labels C1/C2 identify caption tracks; `availableSources`
labels V1/A1 identify **media** tracks. Copy actual returned ids. A caption item
owns one caption trackId; its optional source binding is not its owning track.
Do not invent a UUID or fields such as `suppression` or a stored track-level
`languageCode`. `track_items` creation and patch operations supply storage defaults.

For caption spelling, punctuation and wording fixes, use `set_card_text` with
the returned Card id and revision. For grouping, emphasis, style, placement and
translation, stay in the caption tools. Do not require a source-transcript
audit, source FIX or raw transcript-file edits for caption polish. Caption text
changes what viewers read, not reusable source transcription or audio. Source
repair is a separate explicit request. Preserve meaning, negation, units,
conditions, uncertainty and the user's existing edits.

## Add original or translated captions

For an absent original track, inspect availableSources, then call:

```json
{
  "action": "track_items",
  "json": "{\"operation\":\"create-track\",\"name\":\"Original\",\"source\":{\"trackId\":\"<media source id>\"}}"
}
```

Generate with the returned **caption track id**, not the media V1/A1 id:
`track_items {operation:"generate",trackId:"<caption track id>"}`. Omitted trackId
generates all sourced unlocked caption tracks. Never start paid ASR merely by
reading or enabling CC; obtain missing speech transcription through its actual
transcription tools when the task requires it.

For “Cut looks good, add Chinese and Japanese captions”, preserve the cut and
original captions, then use **two translation calls**, not manual track rows:

```json
{"action":"translate","json":"{\"languageCode\":\"zh\",\"mode\":\"bilingual\"}"}
{"action":"translate","json":"{\"languageCode\":\"ja\",\"mode\":\"bilingual\"}"}
```

Read back original + both language tracks. Existing translations are reused
unless the user explicitly requests retranslation with force:true. Translation
creates independently styled pages with aligned/estimated target-word timings;
never claim measured target-language speech alignment. Use mode:"translation"
only when the user wants to hide the selected original. Languages already present
can be shown/hidden with update-track hidden:false/true without translating again.
If the original already is one requested language (for example Chinese speech),
keep that original track and translate only the missing language; do not add a
duplicate Chinese translation of already-Chinese captions.

## Move, style and delete native captions

- Move a Card: `track_items {operation:"move",itemIds:["<item id>"],trackId:"<destination caption track id>"}`. Identity and visible appearance survive; incompatible source bindings detach, and old automatic generation is suppressed atomically.
- Style one track: `style {trackId:"<caption track id>",captionStyle:{version:1,token:{color:"#ffffff"}}}`. Native style/layout/template actions target the returned caption track id, not a legacy sourceId from a Program.
- Position a track: `layout {trackId:"<caption track id>",top:760,width:1400}`. Geometry is not captionStyle.
- Delete a track and its Cards: `track_items {operation:"delete-track",trackId:"<caption track id>"}`. This never deletes its source media. Respect track/item locks.
- Create or patch tracks/items with `create-track`, `update-track`, `create-item`, `update-item`. Caption reads omit renderer source and reconciliation internals; do not use those compact projections as full `upsert-track`/`upsert-item` rows.

Card actions `set_card_text`, `set_card_style`, `set_card_layout`,
`set_card_tokens`, `set_card_span_style`, `split_card`, and `merge_cards` use a
native item id as cardId and the current revision **inside json**. Words expose
their real token ids and Card-relative frame timing. For a split, beforeWordKey
must be an interior timed token. Do not guess frame units or token identities.
Send edits sequentially. Batch synchronous Card edits with one top-level revision
and edits array; the native batch is atomic and a failed edit writes nothing.
Reread after structural edits for fresh ids.

Exact-word emphasis uses set_card_span_style with sibling style/activeStyle.
Normal style remains visible throughout; put an animated highlight's paint in
activeStyle. Preserve negation and meaning, and apply emphasis only when requested.
For a swipe, encode bounded inset or typed transform keyframes, not a made-up
animation name. Do not change every Card when only one span was requested.

For relative word sizing, use `style.fontSizeScale` (1.15 means 15% larger)
rather than guessing a pixel `fontSize`. Keep normal `style` static; animation
belongs in its sibling `activeStyle`. For example, pass this object inside
`set_card_span_style`'s `json`, replacing the Card id, revision and exact text
with values from `read_captions`:

```json
{
  "cardId": "<item id>",
  "revision": "<current revision>",
  "spans": [
    {
      "text": "exact words",
      "style": { "color": "#ffffff", "fontSizeScale": 1.15 },
      "activeStyle": {
        "color": "#1a1a1a",
        "backgroundColor": "#facc15",
        "animation": {
          "enter": {
            "durationMs": 180,
            "keyframes": [
              { "offset": 0, "opacity": 0 },
              { "offset": 1, "opacity": 1 }
            ]
          }
        }
      }
    }
  ]
}
```

Each enter/exit phase needs `durationMs` and a `keyframes` array with offsets
from 0 to 1; `enter.from` / `enter.to` is not the canonical shape. The contrasting
active paint is intended to reveal the fade; verify it in the target renderer.
If an animation is rejected, correct its format and verify the requested motion;
do not silently remove the animation and report the animated request complete.

## Presets and render verification

Start a new look from the published caption presets, then refine with caption
tools instead of rebuilding the treatment from scratch. For a simple caption
request, use the saved project style preference without
forcing a chooser. For an explicit look, apply it directly. For comparison,
read `edit_captions action:"template"` with the actual caption language and
choose from `publishedTemplates`, not the legacy built-in list. Search with
`query`; continue with `publishedNextOffset` as `offset`. Include suitable
`kind:"motion-graphic"` entries when the user asks for expressive or animated
captions. Load `widget-forms` and copy each selected template's returned
`previewOptions` into the preview cards; do not guess catalog IDs or revisions.
Use the host's actual preview result before asserting that a template can or
cannot be previewed. Report a concrete preview failure instead of applying the
template to capture a still or substituting ordinary styling for MG.

Published templates come from real caption examples in a backing project. Read
`manage_design_style get` for linked preferences, then the live catalog. After
selection, apply its exact `catalogTemplateId` and supported `languageCode` to
the intended caption track and verify the saved identity. MG renderers can
consume rawText/styleSpans from caption_v1 explicitly; CSS and span animations
are not automatically painted over custom code.

Caption JSX is owned directly by a native track or item via action:"renderer",
not an MG asset. sourceId selects the native caption track; cardId plus revision
selects an item. Code reads implicit `useSpecialEffects().caption_v1`. Read the
tool's current capabilities before requesting other analysis protocols. MG code
owns appearance while active; clear it and choose an ordinary template for CSS
and span styling. Keep code validation, property controls and source timing intact.

For a requested custom animated treatment or reference recreation beyond the
catalog, load the active Motion Graphics skill and read its MG caption design
reference and `caption_v1` contract before authoring. Use the caption-specific
creative workflow, not the ordinary MG style-picker or generation workflow.

Verify actual short/long Cards over the footage: both requested languages, source
following, no overlap/clipping, readable size and safe placement, correct CC and
track visibility, and persistence after reopen. A successful tool call is not
proof that the composed frame is correct. Do not claim export/native parity from
state inspection alone.

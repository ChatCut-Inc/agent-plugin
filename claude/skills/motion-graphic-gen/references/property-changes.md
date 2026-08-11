# Motion Graphic Property Changes

Read this whenever a task touches editable Motion Graphic properties — adding, renaming, or removing a property key; changing a default; promoting a hardcoded value; or updating one item's override.

## Data Model

Three layers, in strict order:

1. `asset.properties` — editable property **schema** on the asset. Declares every key (type, label, default, and `min`/`max`/`step` or `options`). Source of truth.
2. `item.propertyOverrides` — per-item overrides. Sparse: only non-default values are stored.
3. `item.props` — runtime object passed into the MG component. Built at render time by merging schema defaults with the item's overrides.

Motion Graphic property types are: `text`, `font`, `color`, `number`, `boolean`, `select`, `image`, `video`. Shader properties are also arrays, but use a different type set — do not use shader-only types such as `vec2` for Motion Graphics.

**Prerequisite rule:** a key must exist in `asset.properties` before anything else works. If code reads `props.x` and `x` isn't declared, code validation fails. If an item sets `propertyOverrides.x` but `x` isn't declared, the value is stored but never reaches the runtime props and no UI control shows up.

Image and video property overrides store asset IDs — runtime resolves them to URLs.

## Decision Table

Use `edit_asset` when:

- code starts reading a new `props.key`
- a property key is added, renamed, or removed
- a property type, label, options, or default changes

Use `edit_item` with an `updates[]` entry carrying `propertyOverrides` when:

- the key already exists on the asset
- one item's current value should change, or multiple items should reuse the same asset with different values

Do not use `propertyOverrides` to add schema. Do not use `edit_asset` for one-off instance values.

## UI Surface for Editable Properties

When a user selects an MG item on the canvas, a floating toolbar appears above the item (or below if there's no room). This is the only place users adjust properties — no side panel.

Which control shows depends on property `type`:

| Property type                                   | Where it appears                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `text`                                          | Pencil icon on the toolbar → popover with text inputs                 |
| `font`                                          | Direct font picker button (single) or font list popover (multi)       |
| `color`                                         | Direct color picker button (single) or color list popover (multi)     |
| `number`, `boolean`, `select`, `image`, `video` | Behind the `...` (ellipsis / "more") button at the end of the toolbar |

After adding or changing a property, tell the user where to find it in one line: select the MG on canvas — the floating toolbar appears above the item. Use the {color|font|pencil} button for the relevant type, or open `...` for other properties.

## Promoting Hardcoded Values to Properties

When the user asks to adjust a hardcoded value (font size, color, spacing, text, duration, anything tweakable), in the same turn both make the change AND promote the value to a property. That way they can self-serve next time from the floating toolbar.

Skip promotion when:

- user explicitly frames it as one-off ("just this once", "only for this item")
- the value is structural — timing constants, transform origins tied to layout math, keyframe offsets other code depends on
- the asset is a locked template the user doesn't own

Workflow (one turn):

1. `inspect_asset(assetId=..., includeCodeFile=true)` — materialize current code and return its revision plus properties
2. Read the returned code path once and locate the hardcoded literal
3. Replace it with `props.<key>` plus a fallback to the current value (e.g. `props.fontSize ?? 180`) so existing items render identically
4. Add a matching entry inside the `properties` array with sensible `min`/`max`/`step` (or `options`)
5. `edit_asset` with `codeFile`, `expectedRevision`, and `json` containing only the updated `properties` array
6. If the user also asked for a specific new value, apply it either as the new `defaultValue` (baseline) or as a `propertyOverride` on the specific item (just this item for now)
7. Tell the user where the control lives (see UI Surface table)

Example — promoting `fontSize: 180`:

```
const fontSize = props.fontSize ?? 180;
```

```json
"properties": [
  {
    "key": "fontSize",
    "label": "Font Size",
    "type": "number",
    "defaultValue": 180,
    "min": 40,
    "max": 300,
    "step": 2
  }
]
```

For Motion Graphic assets, `asset.properties` is always an array. The object above is one editable property entry inside that array.

## Asset-Level Changes

When the schema changes, update the asset's `code` and `properties` in the same `edit_asset` call. Cross-validation runs: if code reads `props.x` and `x` isn't in properties (or vice versa), the call fails.

1. `inspect_asset(assetId=..., includeCodeFile=true)`
2. Read and locally edit the returned code file to use the target key from `item.props`
3. `edit_asset` with `codeFile`, `expectedRevision`, and `json` containing the new `properties` array
4. If a key was renamed, migrate affected item overrides to the new key

Keep keys stable when possible — renames create migration work.

## Item-Level Changes

Prerequisite: the key must already exist on `asset.properties`. If it doesn't, do not use `edit_item` for this — go to "Promoting Hardcoded Values" or "Asset-Level Changes" first.

`edit_item` updates carrying `propertyOverrides` use **PATCH semantics**: the object is merged with the item's existing overrides. You do NOT need to read the item first.

- Send only the keys you want to change
- A value of `null` removes that key (falls back to the asset default)
- `propertyOverrides: null` on the whole field clears all overrides

```json
{ "propertyOverrides": { "titleText": "Episode 3" } }
```

```json
{ "propertyOverrides": { "accentColor": null } }
```

```json
{ "propertyOverrides": null }
```

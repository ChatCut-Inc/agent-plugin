# Claude Code Elicitation Recipes

Use these recipes only after loading the current `visualize.show_widget`
`read_me` for the session. Let the current host contract override stale class or
shell details in this file.

## Contents

- Combined form shell
- Canonical media data gate
- Visual cards
- Voice audition cards
- Ordinary fields
- Submission and answer parsing
- Unsupported file input
- Host limitations

## Combined form shell

Render one widget containing every related field and one submit action. Use
user-language strings for every `data-name` and `data-value`; those strings
become the filled prompt. Keep internal preset and voice ids only in the
agent's label-to-id map.

<!-- prettier-ignore -->
```html
<form
  class="elicit"
  style="border:0; border-radius:0; box-shadow:none; background:transparent"
>
  <div class="elicit-header">
    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M11.586 2a1.5 1.5 0 0 1 1.06.44l2.914 2.914a1.5 1.5 0 0 1 .44 1.06V16.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.492-1.347L4 16.5v-13A1.5 1.5 0 0 1 5.5 2zM5.5 3a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h-2.5A1.5 1.5 0 0 1 11 5.5V3zm7.04 10.304a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696m0-4a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696M12 5.5a.5.5 0 0 0 .5.5h2.293L12 3.207z"/></svg>
    <span>剪辑需求 details</span>
  </div>
  <div class="elicit-body">
    <div class="elicit-group">
      <label class="elicit-question">需要哪些处理？</label>
      <div class="elicit-pills" data-name="需要哪些处理？" data-multi="true">
        <button type="button" class="elicit-pill" data-value="语音剪辑">语音剪辑</button>
        <button type="button" class="elicit-pill" data-value="字幕">字幕</button>
        <button type="button" class="elicit-pill" data-value="MG 动画">MG 动画</button>
      </div>
    </div>
  </div>
  <div class="elicit-footer">
    <button type="button" class="elicit-skip">跳过</button>
    <button type="button" class="elicit-submit">填入剪辑需求</button>
  </div>
</form>
```

Copy the header SVG byte-for-byte. Use only CSS variables listed by the current
`read_me`; do not carry a remembered token list into a new session. Let the
Elicitation shell own the blue selected state; do not mutate selection classes
or ARIA attributes.

Claude Desktop's `show_widget` result already has a host-owned outer frame and
does not expose a frameless option. Keep `.elicit` for wiring, but use the exact
flattening style above so the form does not draw a second rounded card inside
that frame. Do not remove the header/body/footer structure.

## Canonical media data gate

Do not choose media first and name it afterward. Build each card from one
authoritative tuple, then use the tuple id to resolve media:

- Design Style: call `manage_design_style` with
  `action: "list_presets"` and the user's locale. Tuple = returned
  `(preset.id, preset.name, preset.description)`. Copy `preset.name` exactly;
  never infer a name from the thumbnail or shorten the returned name.
- Voice: read `${CLAUDE_PLUGIN_ROOT}/skills/voice/references/voices.md`. Tuple =
  one preset row's `(voiceId, official/localized display, tags)`. Keep the
  sample bound to that same `voiceId`; never replace the official display with
  a generic trait label.
- Media: resolve `design-style/<preset.id>` or `voice/<voiceId>` through the
  manifest only after the tuple exists. The manifest supplies bytes, not names.

Before `show_widget`, verify every visible label maps back to exactly the id
used in its manifest key. If a catalog lookup fails, stop instead of guessing.

## Visual cards

Resolve `design-style/<presetId>` through
`assets/widget-media/manifest.json`. Build the URL as `baseUrl + entry.path`.
Omit the image when the key is absent.

Use this exact responsive shape. `media-grid` and `media-card` are semantic
class names only; the host does not style them. Keep the inline layout rules or
the default pill chrome will stretch around the image.

```html
<div
  class="elicit-pills media-grid"
  data-name="视觉风格"
  data-multi="false"
  style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; width:100%"
>
  <button
    type="button"
    class="elicit-pill media-card"
    data-value="红黑硬核工业"
    style="min-width:0; width:100%; border-radius:12px; padding:0; overflow:hidden; display:flex; flex-direction:column; align-items:stretch; text-align:left"
  >
    <img
      src="https://cdn.jsdelivr.net/gh/ChatCut-Inc/chatcut-widget-media@v2026-07-15/widget-media/design-styles/PRESET_ID.jpg"
      alt=""
      style="display:block; width:100%; aspect-ratio:16/9; object-fit:cover"
    />
    <span style="padding:10px 12px; font-size:13px; font-weight:500"
      >红黑硬核工业</span
    >
  </button>
</div>
```

Use 3 strong cards by default; expand up to 6 only for broader browsing or when
the choice genuinely needs that range. Use a wrapping grid and make images fill
their card width without hardcoded light/dark colors. Never use the original S3,
CloudFront, or `app.chatcut.io` thumbnail in widget HTML.

## Voice audition cards

Resolve `voice/<voiceId>` through the manifest. Keep the real provider voice id
only in the agent's label-to-id map and keep descriptions provider-neutral.

Use the exact official/localized display from the voice preset row. The
description may localize the row's tags, but it must not replace or rename the
display label. Use one host-wired non-button single-select card with its native
audio player directly inside. Claude Desktop delegates choice
clicks to the nearest `.elicit-pill` and collects that class by `aria-pressed`,
so the voice card itself may be a non-button element. This keeps `<audio>` out
of invalid button content while making playback part of the option. Clicking
the player also selects that voice; no script is needed.

```html
<div
  class="elicit-pills voice-grid"
  data-name="旁白音色"
  data-multi="false"
  style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; width:100%"
>
  <div
    class="elicit-pill voice-card"
    data-value="流畅女声"
    style="min-width:0; width:100%; border-radius:12px; padding:12px; display:flex; flex-direction:column; align-items:stretch; gap:8px; text-align:left; overflow:hidden"
  >
    <span style="min-width:0; display:flex; flex-direction:column; gap:3px">
      <strong style="font-size:13px; font-weight:500">流畅女声</strong>
      <small style="font-size:11px; color:var(--text-muted)"
        >女 / 年轻 / 流畅精致，适合产品旁白</small
      >
    </span>
    <audio
      controls
      preload="metadata"
      src="https://cdn.jsdelivr.net/gh/ChatCut-Inc/chatcut-widget-media@v2026-07-15/widget-media/voice-samples/doubao-liuchang.mp3"
      style="display:block; width:100%; min-width:0"
    ></audio>
  </div>
</div>
```

Repeat that `.elicit-pill` card for each voice option. It is both the single
selection boundary and the container for its player. Do not add a nested
selection button, a sibling player row, playback scripts, `data-audio-id`, or
hidden audio elements. Do not change the card's border or background inline;
the host's `[aria-pressed="true"]` style must remain visible.

## Ordinary fields

Follow the current `read_me` contract. Representative shapes:

```html
<div class="elicit-group">
  <label class="elicit-question">目标平台</label>
  <div class="elicit-pills" data-name="目标平台" data-multi="false">
    <button type="button" class="elicit-pill" data-value="YouTube">
      YouTube
    </button>
    <button type="button" class="elicit-pill" data-value="TikTok / Shorts">
      TikTok / Shorts
    </button>
    <button type="button" class="elicit-pill" data-value="其他" data-other>
      其他
    </button>
  </div>
  <input
    type="text"
    class="elicit-other"
    data-for="目标平台"
    placeholder="请输入其他平台"
    hidden
  />
</div>

<textarea
  class="elicit-textarea"
  data-name="补充要求"
  placeholder="例如：保留自然停顿，不要太快"
></textarea>
```

Use one Other control per field and keep it adjacent to its pills. Verify the
current `read_me` attribute spelling before rendering because this interaction
is host-wired.

`data-for` on an Other input must exactly equal the owning pill group's
`data-name`. Use one readable, unique `data-name` per field so the
filled answer line cannot merge two questions.

## Submission and answer parsing

Claude Code Desktop fills, but does not send, a line shaped like:

```text
<form header> details — <data-name>: <value> · <data-name>: <value, value>
```

The host joins groups with `·` and multi-select values with `, `. It does not
append custom prose. After the filled line appears as a real user message,
map each visible label back to the internal id from the candidate list and
continue without asking the same questions again.

## Unsupported file input

Do not add any file chooser or dropzone to an Elicitation form. Claude Code
Desktop currently locks a form containing one into a read-only summary without
filling any answers into the prompt, and the apparent attachment is not
available to the agent.

When source media is missing, keep the form for preferences only. Outside the
form, say in the user's language: "Please drag the file directly into the chat
input and send it to me." After the attachment arrives, use `asset-import`.

## Host limitations

- Submission fills the prompt box rather than sending directly; wait until the
  answer appears as a real user message.
- A rebuilt iframe returns to its initial display; there is no durable submitted
  state.
- Only public media on the manifest's allowlisted CDN can appear. Never expose
  private user media in a form.
- Reload the current `read_me` once per session. If the host contract changes,
  prefer the current contract.

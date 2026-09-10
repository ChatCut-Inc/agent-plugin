# GPT Image 2.5 (OpenAI)

Use `submit_image` with `gpt-image-2.5-flare` (default, everyday speed) or `gpt-image-2.5-sunburst` (precision editing). Honor an attached or explicitly requested model.

- Generate from text or edit/combine up to 10 project image assets using `referenceAssetIds`.
- `quality`: `low`, `medium`, `high` (ChatCut default), `xhigh`, `max`, `auto`. Higher quality can cost more and take longer.
- `background`: `auto` (default), `opaque`, `transparent`. Transparent generates a PNG cutout for overlays or product assets.
- `imageSize`: `1K` (default), `2K`, `4K`; only increase on request. Above 2560×1440 is experimental.
- `aspectRatio`: the ten ratios in SKILL.md. ChatCut maps these to valid multiples of 16 within the API pixel budget.
- `count`: 1–10; each output is a separate job and consumes credits.

For a focused edit, identify what changes and what must stay, and reference the previous result. For typography, quote the exact text and describe its placement. A new output is a new asset; the source is preserved. Transparent backgrounds require Image 2.5. GPT Image 2 does not accept `xhigh` or `max`.

`track_progress` returns completed asset ids. For iterative editing, pass the latest id back to `referenceAssetIds`. For timeline placement, use `edit_item` after completion.

Billing uses actual response usage: text input $5/M tokens, image input $8/M, cached text $1.25/M, cached images $2/M, image output $30/M. Estimates use the Image 2.5 calculator, not the Image 2 formula; input tokens are additional.

Source: https://developers.openai.com/api/docs/guides/image-generation (2026-09-09).

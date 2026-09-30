# MiniMax H3 Max (`model: "minimax-h3-max"`)

Read this reference before submitting MiniMax H3 Max.

## Capabilities

- Duration: integer 5-15 seconds.
- Resolution: `768p` by default, or `480p` for a lower-cost draft.
- Ratios: `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
- Text-to-video, first-frame, or first+last-frame generation. A last frame requires a first frame.
- A prompt is always required.

## Unsupported inputs

H3 Max does not support `refImages`, `refVideos`, or `refAudios`. It also
does not support 2K output, middle frames, video editing, or video extension.
Use `minimax-h3` when multimodal references or 2K output are required.

For frame generation, `lastFrame` requires `firstFrame`. The output aspect
ratio is inferred from the frame input, while text-to-video uses `ratio`.

## Cost

H3 Max bills output seconds only. Input first/last frames are currently free.
The 480p tier costs less per second than 768p.

## Examples

```json
{
  "model": "minimax-h3-max",
  "prompt": "A red paper kite climbs through storm clouds, cinematic handheld camera",
  "durationSeconds": 5,
  "ratio": "16:9",
  "resolution": "480p"
}
```

```json
{
  "model": "minimax-h3-max",
  "prompt": "Preserve the subject and smoothly move from the first pose to the final pose",
  "durationSeconds": 8,
  "firstFrame": "asset-id",
  "lastFrame": "asset-id",
  "resolution": "768p"
}
```

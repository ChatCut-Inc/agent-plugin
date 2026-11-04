# MiniMax H3 (`model: "minimax-h3"`)

Read this reference before submitting MiniMax H3.

## Capabilities

- Duration: integer 4-15 seconds.
- Resolution: `768p` by default; use `2k` only when higher resolution is worth
  the higher per-second cost.
- Ratios: `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
- Text-to-video, first-frame, last-frame, first+last-frame, or multimodal reference mode.
- Reference limits: 9 images, 3 videos, and 3 audios, with at most 12 total
  reference files. Audio-only reference mode is supported. Reference
  video/audio clips must be 2-15s each and 15s total.

## Mutually exclusive modes

Choose exactly one input family:

1. Frames: `firstFrame`, `lastFrame`, or both. MiniMax H3 supports a last frame without a first frame.
2. References: any allowed combination of `refImages`, `refVideos`, and
   `refAudios`.

Never combine frame inputs with reference inputs. H3 determines frame-mode
output ratio from the frame; the requested ratio is used for text/reference
generation.

## Cost

Output costs more at 2K than 768p. Reference audio is free. The first five
input images are free, then each additional image is billed. Reference video
seconds are billed at the chosen output resolution rate. The confirmation
estimate includes these inputs when asset durations are known.

## Examples

```json
{
  "model": "minimax-h3",
  "prompt": "A red paper kite climbs through storm clouds, cinematic handheld camera",
  "durationSeconds": 6,
  "ratio": "16:9",
  "resolution": "768p"
}
```

```json
{
  "model": "minimax-h3",
  "prompt": "Preserve the character and costume while she walks into the neon market",
  "durationSeconds": 8,
  "ratio": "9:16",
  "refImages": ["asset-id"],
  "refAudios": ["asset-id"]
}
```

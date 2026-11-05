# MiniMax H3 Max (`model: "minimax-h3-max"`)

Read this reference before submitting MiniMax H3 Max.

## Capabilities

MiniMax describes H3 Max as the faster variant of H3 (H3 is its high-quality
variant).

- Duration: integer 5-15 seconds.
- Resolution: `768p` by default, or `480p` for a lower-cost draft. No 2K output.
- Ratios: `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`.
- Text-to-video, first-frame, or first+last-frame generation. A last frame requires a first frame.
- Reference mode, with the same limits as `minimax-h3`: up to 9 `refImages`, 3 `refVideos`, 3 `refAudios`, 12 files in total. Each video or audio clip must be 2-15s, and each type 15s in total. Audio needs an image or video: MiniMax rejects `refAudios` without a `refImages` or `refVideos` entry.
- Media bounds (MiniMax's own; Seedance's differ): frame images, reference
  images, and reference videos 256-5760 px per side with width/height 0.4-2.5;
  reference videos 23.976-60 fps.
- Frame inputs and references cannot be combined.
- A prompt is always required. MiniMax expands short prompts on its side by default.

It does not support middle frames, video editing, or video extension.

For frame generation, the output aspect ratio follows the frame input; text-to-video and reference mode use `ratio`.

## Cost

Output is billed per second, with 480p cheaper than 768p. Reference videos are billed per second, and images beyond the first two are billed per image. Audio references are free.

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
  "prompt": "Slow aerial push-in over the lake in @Image1, soft morning light",
  "durationSeconds": 5,
  "ratio": "16:9",
  "refImages": ["asset-id"],
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

# Kling 3.0 (`model: "kling"`)

Read this reference before submitting Kling 3.0.

## Capabilities

- Duration: integer 3-15 seconds.
- Resolution: `720p` by default, or `1080p`.
- Ratios: `16:9`, `9:16`, `1:1`. With frames and no `refImages`, the output
  follows the frame image instead.
- Text-to-video, first-frame, last-frame, first+last-frame, and reference
  images. Frames and `refImages` can be combined, up to 7 images in all; with
  `refImages`, a `lastFrame` also needs a `firstFrame`.
- No `refVideos` or `refAudios`. Kling always generates native audio: describe
  dialogue, sound effects and music in the prompt.
- Prompt: up to 2,500 characters. There is no negative prompt; write
  exclusions into the prompt.

## Cost

Billed per output second; 1080p costs more than 720p. The confirmation shows
the exact price.

## Examples

```json
{
  "model": "kling",
  "prompt": "A red paper boat drifts across a calm pond at dawn, soft ripples, gentle water sounds",
  "durationSeconds": 5,
  "ratio": "16:9"
}
```

```json
{
  "model": "kling",
  "prompt": "The woman from the reference turns toward the camera and smiles",
  "durationSeconds": 5,
  "firstFrame": "asset-id",
  "refImages": ["asset-id"],
  "resolution": "1080p"
}
```

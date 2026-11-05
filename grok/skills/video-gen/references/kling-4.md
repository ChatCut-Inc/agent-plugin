# Kling 4.0 (`model: "kling-4"`)

Read this reference before submitting Kling 4.0.

## Capabilities

- Duration: integer 3-30 seconds in one clip.
- Resolution: `720p` by default, or `1080p`.
- Ratios: `21:9`, `16:9`, `9:16`, `1:1`. Without a ratio, a clip with frames
  or references follows the prompt's stated ratio, then the frames and
  videos; text-only clips are 16:9.
- Inputs, combinable in one request:
  - `firstFrame` and/or `lastFrame` (either one alone is allowed) and
    `refImages`: up to 10 images in all. JPG/PNG, at least 300 px per side,
    width/height between 2:5 and 5:2.
  - `refVideos`: up to 5 MP4/MOV clips, 3-30s each and 30s in total,
    700-4553 px per side, 24-60 fps. They guide motion, style or characters;
    the output is a new 24 fps clip.
- No `refAudios`. Kling always generates native audio: describe dialogue,
  sound effects and music in the prompt.
- Prompt: up to 26,000 English characters or 11,000 in other languages.
  There is no negative prompt; write exclusions into the prompt.

## Prompt

Name each input in the prompt and say what to take from it, or Kling decides
for itself:

- `@first_frame`, `@last_frame`
- `@image_1`, `@image_2`, … in `refImages` order
- `@video_1`, `@video_2`, … in `refVideos` order

For example: "Keep the face, hair and outfit of @image_1. Follow the fighting
rhythm of @video_1 but not its background."

## Cost

Billed per second; 1080p costs about 1.5x 720p. With `refVideos`, Kling bills
the output plus the longer of the output and the total reference length, at a
lower per-second rate. The confirmation shows the exact price.

## Examples

```json
{
  "model": "kling-4",
  "prompt": "A lone cyclist crosses a desert highway at golden hour, wide tracking shot, wind and distant thunder",
  "durationSeconds": 10,
  "ratio": "21:9"
}
```

```json
{
  "model": "kling-4",
  "prompt": "Keep the character design of @image_1 and follow the dance moves of @video_1 on a rooftop at night",
  "durationSeconds": 8,
  "refImages": ["asset-id"],
  "refVideos": ["asset-id"]
}
```

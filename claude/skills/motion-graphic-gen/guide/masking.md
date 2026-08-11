# Masking And Cutout Effects

Use this case when the user wants a cutout or mask-like reveal, for example:

- logo cutout reveal
- hollow logo transition
- transparent hole exposing lower-track video
- expanding matte or shape window

## Mental model

In the editor, a motion graphic on a higher video track does not need to "pull in" pixels from the lower video track. The lower track becomes visible when the MG itself is transparent in that region.

For these effects, the main goal is usually:

- keep the mask layer opaque where the screen should stay covered
- make the mask layer transparent where the viewer should see the video below

Do not confuse these two asset types:

- source logo image: usually a white logo on transparent background
- mask image: a prepared image where the covered area is opaque and the hole area is transparent

## Common failure symptoms

- White logo is visible: you rendered the logo itself, not a hole.
- Whole frame is black: the hole was never actually cut out.
- Whole layer disappears: the mask logic was inverted.
- Works in theory but not in Remotion: the implementation depends on fragile runtime compositing.

## Preferred implementation order

For raster logo masking, use this order:

1. Verify the source logo has alpha.
2. Preprocess the source logo into a dedicated mask image.
3. Register that mask image as an asset.
4. Place the source video on a lower track and the MG on a higher track.
5. Animate the mask image as a normal image layer using scale, position, and opacity only.

Preferred mask image shape:

- covered area: opaque black
- reveal area: alpha 0 transparent hole

This is the most reliable path for a logo cutout transition because the renderer only has to draw a normal PNG with transparency.

## Avoid these runtime techniques for raster-logo masking

Avoid using these as the primary plan unless the task is extremely simple and you have a strong reason:

- `mix-blend-mode`, especially `destination-out`
- CSS `mask-image` or `mask-composite`
- SVG mask pipelines with filter inversion or `feColorMatrix`
- canvas compositing tricks such as `destination-out`

These approaches are easy to describe but often unreliable across the Remotion and Chromium rendering path, especially when combined with external image assets.

## Reliable fallback

If the user only cares about the visual result and not the exact technical method, fall back to a preprocessed mask asset. Do not keep iterating on live compositing once it is clear the renderer is not honoring the effect.

## Acceptance checklist

Before saying the effect works, confirm all of these are true:

- the viewer does not see a white logo graphic sitting on top
- the reveal area is genuinely transparent, so the lower video track shows through
- the covered area stays opaque
- the reveal expansion feels like a hole growing, not a logo image simply scaling up
- the first frame is not accidentally full black unless that is part of the brief
- the end state cleanly transitions into the underlying video

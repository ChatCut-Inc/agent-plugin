# Compositor Promotion Anti-Patterns

## When to use

The user reports an MG visual problem that is NOT about content correctness:

- Flicker on playback (especially in the first ~2 seconds after mount)
- MG appears at the wrong canvas position / ignores item.x/y/width/height adjustments
- Parts of the MG missing in some exported frames but present in others
- MG behaves correctly when DOM-inspected but renders wrong in the timeline canvas

These are **always** caused by the user MG code triggering a specific Chrome behavior — never by the bridge / shader / canvas pipeline. Refactor the MG code.

## Why this happens

The canvas pipeline samples the MG's main-thread paint record into a WebGL texture. Elements that Chrome compositor-promotes are NOT in that paint record — they get composited on a separate thread, invisible to the texture upload. The browser's normal page rendering shows the composited result, so the bug is invisible if you preview the MG outside ChatCut.

Promotion triggers are not enumerable — the safest stance is: write plain CSS layout, no hack techniques for visual effects.

## Known anti-patterns

### Zero-size container + transform (rotation anchor hack)

```jsx
// BROKEN — layout box is 0×0 but children draw outside via absolute negative offsets
<div style={{ width: 0, height: 0, transform: "rotate(60deg)" }}>
  <div
    style={{
      position: "absolute",
      left: -45,
      width: 90,
      height: 320 /* ... */,
    }}
  >
    {children}
  </div>
</div>
```

Why writers reach for it: rotating around a non-center point. Why it breaks: layout-box vs paint-box mismatch forces compositor handling.

Fix: put real layout dimensions on the rotating element and adjust position arithmetic.

```jsx
// FIXED — wrapper has real size, transform sits on the same element
<div
  style={{
    position: "absolute",
    left: 355,
    top: 160,
    width: 90,
    height: 320,
    transform: "rotate(60deg)",
    /* ...content styles... */
  }}
>
  {children}
</div>
```

## What to avoid in any new MG code

- `width: 0; height: 0` containers used as transform/rotation anchors
- Wrapping content in extra divs purely to apply a single `transform`; put the transform on the content element itself
- Building visual effects out of stacked transforms / clip-paths / blends when a flat element with the same visible result exists
- Manually injected `will-change`, `transform: translateZ(0)`, or other compositor hints — they make this class of bug worse, not better

## Acceptance checklist

- Symptom no longer reproduces on playback OR on exported frames (re-check both — same root cause)
- The refactored code expresses the same visual intent with simpler CSS — fewer divs, fewer transforms, no zero-size hacks
- Editable properties (text, colors, fontFamily) preserved

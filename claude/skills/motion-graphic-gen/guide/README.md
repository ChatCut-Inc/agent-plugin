# Motion Graphic Debug Guide

Use this guide only when manual MG work is blocked by effect-specific bugs or confusing runtime behavior.

Read `references/design-principles.md` first for the hard runtime rules. Then read only the case file that matches the failure mode you are seeing.

Use this guide when:

- the code validates but the visual result is wrong
- the intended effect is technically unclear to implement in Remotion
- you have already tried one implementation path and it is failing for renderer-specific reasons
- the task depends on a known tricky pattern such as masking, cutouts, or compositing

Debug workflow:

1. Confirm the request and the intended visual behavior.
2. Read `references/design-principles.md`.
3. Read the matching case file in this directory.
4. Prefer the most reliable implementation path over the most clever one.
5. If one approach fails twice, switch to the fallback described in the case file instead of iterating on the same fragile technique.

Current cases:

- `fonts.md`: Repeated font mismatches, unsupported fonts, and attempts to import fonts manually.
- `masking.md`: Logo cutouts, hollow reveals, transparent holes, and mask-like transitions.
- `compositor-promotion.md`: Flicker, missing geometry, or stale-looking frames caused by Chrome compositor-promoting a subtree out of the paint record.

When adding new cases, keep each file narrowly scoped to one failure class and document:

- when to use the case
- typical symptoms
- the reliable implementation order
- what to avoid
- a short acceptance checklist

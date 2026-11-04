When the user has **two or more cameras recording the same moment** — cues like "both angles", "the same interview", "multi angles", "alternate angle", "cut to the other angle", "angle switch", 换角度, 两个机位 — switching to another angle means the picture changes but the **audio and lip-sync must stay matched** to the take.

Load [AI Multicam Editor](../../multicam-sync/SKILL.md) before aligning angles.
Use `multicam_sync` only if it is advertised by the active MCP tool list. The
hosted connector may not expose it; use the skill's transcript-offset workflow
in that case. Verify early, middle, and late alignment before placing a draft.

Do not guess offsets with `edit_item`: a cut reference can make an apparently
aligned clip drift later. When `multicam_sync` is available, pass the angle
clips' `itemIds` and optionally the `referenceItemId` using the current schema.

For the editor-tool route, a **single cutaway clip that spans a cut in the
reference angle** cannot be aligned as one piece. Split it with `split_item`
first, then align each piece to its corresponding reference segment.

When available, `multicam_sync` runs in the editor. If it reports that the editor
is closed, open the target project before retrying. After either alignment route,
read the project back and inspect matching frames to confirm synchronization.

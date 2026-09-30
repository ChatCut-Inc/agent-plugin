When the user has **two or more cameras recording the same moment** — cues like "both angles", "the same interview", "multi angles", "alternate angle", "cut to the other angle", "angle switch", 换角度, 两个机位 — switching to another angle means the picture changes but the **audio and lip-sync must stay matched** to the take.

**Do not hand-compute source offsets with `edit_item` to line angles up.** Manual offsets drift wherever the underlying reference angle was cut, and the drift only shows up later as out-of-sync lips. Use the **`multicam_sync`** tool instead: it runs the editor's audio-based alignment engine and repositions each angle clip so its picture matches the reference angle's audio. Pass the angle clips' `itemIds` (the reference plus the follower angle(s)); optionally name the `referenceItemId`.

Key constraint: a **single cutaway clip that spans a cut in the reference angle** can't be aligned as one piece — split it at that cut with `split_item` first, then pass both pieces to `multicam_sync` so each maps to the reference segment beneath it.

`multicam_sync` runs in the user's editor (no backend path): if it reports the editor isn't open, ask the user to open the project, then retry. After it applies, read the project back to confirm the alignment.

# Other A-roll Editing Scenarios

#### Highlight extraction

Highlight extraction is not about making the content as short as possible. It is about selecting the most valuable spoken content according to the user's criteria.

Rules:

- First identify the highlight standard: opinion, conclusion, story, emotion, conflict, tutorial step, data point, or a specific topic.
- Each highlight should be understandable on its own. Do not remove the subject, setup, question, or conclusion needed to understand it.
- Do not keep only a short punchy sentence if the surrounding context is required for it to make sense.
- If the user asks for a specific topic, remove other topics. If the user asks for the "best" or "most exciting" moments, prioritize information density and expression strength.
- After extracting highlights, usually clean up the kept segments so the final result is polished.

#### Restructure

Restructure means changing the order of spoken content. It does not mean freely breaking sentences apart.

Rules:

- First confirm the target structure: chronological, by topic, by question, conclusion-first, tutorial steps, or short-form pacing.
- Move complete semantic units: complete sentences, ideas, answers, or steps.
- Do not split one sentence so the first half appears in one place and the second half elsewhere.
- After moving content, check whether connectors still work, such as "so," "but," "next," or "this."
- If the user asks for major restructuring without specifying the target structure, confirm before editing.

#### Hook / short version

Hook / short version work aims to make the opening more compelling or compress long content into a shorter but still complete version.

Rules:

- Prefer pulling the hook from the original footage: a strong claim, result, conflict, question, counterintuitive statement, or emotionally strong moment.
- If a new hook or new narration must be generated, confirm the direction with the user first.
- For short versions, do not cut only by duration. First identify the main line to preserve: problem, core point, key reasons, and conclusion.
- Short versions can remove examples, repetition, and setup, but must keep the logic needed for the point to hold.
- If the user gives a target duration, try to match it. If duration and semantic completeness conflict, explain the tradeoff.

#### Target-script / script alignment

Target-script / script alignment means cutting the final spoken content according to a user-provided script, target paragraph, or desired content.

Rules:

- The target script is the main constraint: prioritize content that matches the target meaning.
- Natural spoken paraphrases are acceptable, but do not include surrounding content that the target does not ask for.
- If the source has multiple similar versions, choose the most complete, natural, and target-aligned version.
- If target order differs from source order, reorder as needed, but move complete semantic units.
- If the target script omits source context, follow the target. Do not add long surrounding context unless the result would be incomprehensible without it.

#### Building versions, highlights, and excerpts

Highlight, short version, excerpt, hook, restructure, and making several versions are all transcript-content tasks: drive them through Script (`read_script` → edit `timeline.md` → `apply_script`), never by looking up timestamps and placing source clips manually.

- Pick the starting point by where the content comes from. Versions on the current timeline: trim or reorder `timeline.md` and `apply_script`. A version on its own timeline (the user asked for separate timelines, or wants each version independently editable/exportable): `manage_timelines` action=duplicate — the copy carries the content and its script, so you immediately `read_script` → trim → `apply_script` on it. Building fresh from library assets: `manage_timelines` action=create, add the source asset, then drive it through Script.
- To bring in source content the current cut no longer shows (a hook line, a segment needed for another version), read `library/<filename>.md`, copy the needed `[sN]` line(s) into `timeline.md` where they belong, and `apply_script`. This is how you pull source content onto the timeline — through Script.
- For multiple versions on one track: list every version's `[sN]` segments in `timeline.md` in version order, one version after another, then `apply_script` once. Reuse is just repetition — the same `[sN]` segment may appear in more than one version, and repeating the line replays that source range again.
- Never look up timestamps with `find_transcript` and place spoken content with `edit_item` / `split_item`. If you are converting transcript segments into source frame or second ranges, you are off the editing surface — return to Script. `edit_item` / `find_transcript` are only for non-transcript placement such as MG overlays and B-roll visual timing.

**Check each version against its request.** After assembling a version, highlight, or excerpt, re-read the result end to end and confirm every requested sentence is present, in the requested order, with no extra source carried in. Fix any dropped, duplicated, or out-of-order content before finishing.

---
name: multicam-sync
description: |
  Synchronize footage from a multi-camera / multi-recorder shoot — several cameras plus separate audio recorders covering one session, imported as loose clips — and optionally turn all or part of it into speaker-follow footage for a larger edit. Use when a user drops in multiple clips from the same recording and wants them aligned, asks for multicam / 多机位 / multi-angle sync, wants a "cut to whoever is talking" edit, or refers to camera A/B, angles, or separate lav or field recordings that need to line up with picture.
user-invocable: true
---

# Multicam Sync

Parts 1–3 always run: they produce the synced master, a verifiable fact that every
later edit is rebuilt from. Part 4 cuts a draft from it, and runs only on request.
Transcripts do almost all of the work. AI locates; arithmetic decides frames.

Use ordinary timelines, tracks, and items only. Never create a compound or nested
multicam clip, and never depend on a camera-switcher item. If a main edit already
exists, leave it untouched while building the synced master and speaker-follow
cutting board on separate timelines.

## Part 1 — Discover the structure

Work out what you actually have before aligning anything. Never ask the user how many
cameras there are. The material already answers it.

### The two rules that do the work

**Same words at the same moment → cannot be sequential spans of one camera.** Overlapping
transcripts mean two devices recorded one event simultaneously, so they are different
sources or simultaneous angles.

**No shared words, and one ends where the next begins → one camera that stopped and
restarted.** These are sequential spans of a single capture source, not separate angles.

### Steps

1. Read every asset's transcript, build a pairwise overlap matrix — how much text
   each pair shares, and where — and split by the rules above.
2. Video assets are **angles**; audio-only assets are **recorders**.
3. Corroborate with filenames, folder structure, camera-model metadata, durations —
   tie-breakers only, never over transcript evidence. Real shoots ship three cameras
   all named `C0001.MP4`.

### Report before acting

State the structure in the user's terms and wait if anything is ambiguous:

> 2 camera angles (Pocket3, 3 spans · Pocket4, 2 spans), 2 audio recorders
> (MIC1, MIC2). Session runs 53 minutes.

When evidence is thin — a source with little speech, an overlap resting on a handful
of matched lines — say so. Do not fill the gap with a guess.

## Part 2 — Align and place

One number per clip: timeline time minus source time. Keep that number constant for
every piece cut from the clip. Do not time-stretch automatically: a changing offset
may be a bad match, a clock difference, or dropped frames, and each needs review.

### Steps

1. **Reference**: the source that covers the whole session with the richest transcript —
   usually a dedicated audio recorder, not a camera.
2. **Use the renderer when available**: on the separate master timeline, put the
   untrimmed clips on ordinary source tracks, then call `multicam_sync` with the
   same-take items and the reference. This is the preferred Web/Desktop path. It
   uses existing source timing when decisive, otherwise audio correlation; it does
   not create a multicam object.

   Accept only `applied`, `already_synced`, or an understood `partial` result. Read
   `alignmentEvidence` for method, match confidence, correlation, overlap, and
   relative offset. Read `placementEvidence` for the actual post-sync
   `timelineSourceOffsetSeconds`. Do not use a skipped or low-confidence item. If
   the tool is unavailable or finds no confident alignment, leave the master
   untouched and use the transcript fallback below.

3. **Transcript fallback**: run
   `scripts/transcript-offset.mjs <utterances.json>` from this skill. Do not
   improvise the math. It first lets shared phrases vote on a coarse offset, then
   takes the median of near-identical utterance-pair deltas. It also rejects too few
   pairs, inconsistent pairs, and early/late drift. Only place files whose output is
   `confident:true`; report every printed issue for the others. `--help` documents
   the input and sign convention.
4. **Continuity check** (free, run it): spans of one camera were recorded
   back-to-back, so span N+1's offset minus span N's must equal span N's duration.
   Each offset was measured independently, so agreement confirms both. Sub-frame
   agreement is the norm; a multi-frame gap means dropped frames or a mismatch —
   say which. **An overlap or gap between placed spans of one camera means an
   offset is wrong. Recompute it — never trim a span to make it fit.**
5. **Place transcript-fallback results**: shift everything so the earliest clip
   starts at 0. One video track per camera, one audio track per recorder.
   Convert seconds → frames once at the end, never accumulating, and **floor at
   an asset's tail, never round up** — a
   rounded-up final frame claims source the file doesn't have; renders tolerate it
   silently, Script editing later refuses it.

### Report

Per clip: actual timeline-source offset, method and supporting evidence (renderer
confidence/correlation/overlap or transcript pair count/spread/drift), and the
continuity-check result.

## Part 3 — Identify and label

Turn "track 1 / track 2" into who is actually on it. Everything here is evidence-first:
a wrong confident claim is a failure; an honest "can't tell" is not.

### Who is in the session

Speakers usually name themselves or each other — self-introductions, banter. Pull real
names from the transcript. If none appear, A/B is fine; never invent names.

### Which camera frames whom

From the transcript, pick 3–4 moments where only one person is talking, spread across
the session. View the synced frame from **every** camera at the same wall-clock moment:
the talking face identifies the person; clothing and seating anchor identity across
angles. Two-shots are identity anchors, not noise. Classify framing while you're
there: close-up / medium / two-shot; note reframing if the dominant framing changes.

Angle labels are summaries, not promises: framing can drift, fail, then recover.
Inspect the exact synced interval before every cut; never choose from the label alone.

Hard check before concluding: at each self-introduction, the face whose lips are
moving is that name's owner. "Both cameras frame the same person" contradicts a
two-camera, two-mic, two-voice structure — treat that conclusion as an error until
frames at both introductions prove it.

### Which mic belongs to whom

A lav is dramatically louder for its wearer — typically 15 dB or more. Measure, don't
infer:

- During one person's solo speech vs the other's, compare **the same track against
  itself**. The in-track contrast cancels recorder gain. Above ~4 dB it decides;
  below, say "indistinct" — that itself is a finding (ambient mic, shared mic).
- Judge the **distribution**, not one moment: consistent → owned mic; 50/50 → not a
  personal mic; flips mid-session → handheld passed around or seats changed.
- **Never use utterance counts or transcript volume as evidence of mic ownership.**
  Crosstalk transcribes fine; both speakers appear fully on both mics' transcripts.
  The overall loudness difference between two mics is not evidence either — only
  the in-track solo-vs-solo contrast is.
- Fragmented diarization heals mechanically: cluster speaker-ids by their median
  cross-track level difference. Never hand-reconcile speaker ids across assets —
  they are per-asset serials.

### Which source is the program audio

Decide what the viewer will hear. Default: dedicated recorders beat camera embedded
audio. The user's word beats everything — "camera A has the good audio" is a program
audio assignment; that camera's audio track then behaves exactly like a recorder
(its offset is already known from Part 2). Record the assignment in the report.

With no clean recorder, compare camera mics at the same solo-speech moments. Prefer
one continuous source that is good enough; switch for a speaker or passage only when
another is clearly better for a sustained stretch and the handoff is inaudible.
Judge intelligibility, noise, clipping, and reverb — not labels or utterance counts.

### Label

Rename tracks in place with the shortest evidenced label: `Cam · <subject or view>`
and `Audio · <speaker or source>`. Append a shot size only when it distinguishes
otherwise similar angles: `WS` (wide shot), `MS` (medium shot), or `CU`
(close-up), for example `Cam · Speaker A · MS` or `Cam · Two-shot · WS`.
Otherwise omit it. Fall back to numbered labels when identity is uncertain.

Deliver an evidence table alongside: claim | evidence (timestamp + what was seen or
measured) | confidence. Decline to label what the evidence doesn't support —
fragmented transcript speaker ids are usually in that category — and say so.

### Deliver the master, then offer the cut

The master is the deliverable — report structure, offsets, identities, and evidence.
Note that it stacks angles and is a reference, not something to watch: the top track
covers the others. If the user only asked to sync, stop here, but **offer** the
speaker-follow draft rather than leaving them with tracks and no next step.

## Part 4 — Cut to the speaker (on request)

Turn the synced master into a watchable draft: one video track that follows the
conversation, program audio continuous underneath.

### The master is never edited

All cutting happens on a **new timeline** (same fps/canvas). The synced master is the
source of truth every derived cut can be rebuilt from — if it changes, every offset
becomes unverifiable. When any instruction, taken literally, would break sync
(e.g. "start the audio at frame 0" when its synced position is not 0), keep sync and
say why. Preserving sync outranks literal wording.

Treat the speaker-follow timeline as a source or cutting board, not as an opaque clip.
When the user wants part of it in an existing edit, materialize only those ordinary
picture and audio ranges into the main timeline. To substitute another angle later,
take the same wall-clock interval from that camera using the master offset. The master
is the timing record; no hidden multicam data structure is required.

### The conversation drives the cut

Build one conversation document first: each person's speech taken from their
assigned program source (Part 3), crosstalk dropped, interleaved by wall-clock via
the Part 2 offsets, with real names and timestamps. Then write the angle plan —
start–end, angle, reason — **before placing anything**.

If the user also asks to remove fillers, shorten answers, or restructure the
conversation, use the talking-head workflow to decide which speech ranges remain.
Multicam owns sync and angle choice; talking-head owns content. Finalize the content
plan before materializing picture cuts.

### Editorial objective

Keep the viewer oriented, emotionally informed, and visually awake with the fewest
cuts that add something.

**Meaning chooses what to show. Rhythm chooses when to cut. Orientation chooses how
wide to go.** Stay while the frame is still revealing; move when another frame gives
more; return to the room when the relationship needs refreshing.

Angle rules (defaults, user's brief wins):

- **Carrier of the moment**: the active speaker is the baseline, not the law. Show
  the speaker when information originates there, the listener when the reaction is
  the meaning, a pair or subgroup when the relationship carries the beat, and the
  room when attention is divided.
- **Shot scale**: use the smallest grouping that preserves the beat. `CU` isolates
  thought or emotion; `MS` is the conversational default; a two-shot or group shot
  shows a relationship; `WS` restores geography. Use a wider view at a new
  question or topic, a participant change, overlap, shared laughter or silence,
  physical movement, or after a long run of isolated singles. Hold it long enough
  to read — usually 2–5s — then tighten when attention concentrates.
- **Duration pressure**: a normal shot needs about 2–3s to arrive. Treat 4–10s as
  a useful conversational range, not a metronome. After roughly 8–12s on an
  unchanged single, actively look for a motivated alternative. By 20–25s the hold
  should be deliberate. There is no maximum while performance, emotion, or visual
  information is still developing.
- **Speaker changes**: do not chase every sound. A <2s interjection usually stays
  on the current shot. Let an unanticipated new speaker begin for about a second
  before cutting; a direct question may motivate showing the respondent while they
  prepare to answer. A short important line — introduction, direct address,
  punchline — earns a shot; widen around it if necessary.
- **Reactions**: use a visible, truthful reaction when it changes how the line lands
  or refreshes a static hold. A reaction is usually 1.5–3s. Do not insert a generic
  nod merely for variety, and never borrow a reaction from another wall-clock moment.
- **Rhythm**: cut on a thought, breath, gesture, look, laugh, or relationship change,
  not on a timer or arbitrary word boundary. Sentence boundaries are safe, not
  mandatory.
- **Seams**: one clean speech seam at a sentence boundary needs nothing. Cover a
  cluster of visible jump cuts with one wall-clock-synced reaction or relationship
  shot spanning the cluster. Never break source sync to manufacture coverage.
- A camera restart under an unchanged angle is a same-angle join, not an editorial
  cut. Count and report it separately.

### Materialize flat

- **One video track**, alternating angle segments, no gaps. Each segment's source
  offset comes from the master placement math, never re-derived from transcripts.
- For a full-length speaker-follow draft, keep program audio continuous and untrimmed
  at its synced position. For a shortened or reordered cut, use identical kept
  source-time ranges on every program mic so picture and audio cannot drift.
- Mute every camera segment's embedded audio.
- If audio outruns picture (recorders stopped later), keep the audio and leave the
  tail dark. Never fabricate or freeze picture to cover it.

### Keep program audio coherent

Keep every isolated program mic open across each retained range. When program audio
comes from camera mics, use only the chosen source for that passage, crossfade at a
quiet boundary, and do not stack them. Word timestamps carry ±30–60ms of ASR noise,
so boundaries need natural handles; hard cuts on word
timestamps clip breaths and word onsets. Backchannel ("嗯", laughter) on an idle
mic is part of the conversation. After content editing, run the talking-head
workflow's audio smoothing step. If mic isolation is weak, flag it for an audio pass
rather than gating speakers independently.

### Verify last, and prove it with numbers

Verification is the **final action**, after every edit and every visual check.
Anything that touches the timeline — including dragging in a browser to look at a
frame — can move an item. **Inspection is not read-only.** If you interacted with
the editor UI at any point, re-run these checks afterwards; a pass from before that
interaction is void.

- **Wall-clock invariant**, every segment and every program-audio item: timeline
  time − source time must equal that source's master offset.
- **Angle spot check**: at a few sampled shots — include the longest — the dominant
  speaker in the window must match the angle's person.

Report the **actual values**, not the word "verified": `MIC1 at 111, MIC2 at 111,
offsets 3.700 / 3.700`. A claim you cannot print numbers for has not been checked.

The same rule governs recovery. If you disturb an item, **restore every field and
re-read the row to prove it** — position, duration, and source offset each fail
independently, and fixing the one you noticed is not a restore.

Also report: cut count, shot length min/avg/max, the conversation document, the
plan, and every place a rule conflicted with the material plus what you chose.

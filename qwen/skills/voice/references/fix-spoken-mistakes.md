# Fix Spoken Mistakes with a Cloned Voice

Use this workflow when the recording itself contains a wrong word, name,
number, or short phrase and the user wants to replace only that local speech
with the same speaker's authorized cloned voice.

## 1. Confirm the correction

Identify the speaker, the exact wording that was spoken, the corrected wording,
and the local region to repair. Verify the source audio rather than assuming a
transcript error is audible:

- If the recording is correct and only the transcript is wrong, correct the
  transcript and stop.
- If the user wants a full rewrite or new narration, use the ordinary
  voiceover workflow instead.
- If the source is ambiguous, ask for the target clip or phrase rather than
  guessing.

The target video may be split to isolate the repair region, but keep its
visible playback and all later timeline timing unchanged. Ask before making a
visual change or moving later content.

## 2. Resolve the speaker's cloned voice

Check the user's saved cloned voices for possible ready candidates. Catalog
metadata and previews do not prove that a voice belongs to the speaker in the
video, so do not decide the match yourself.

- Unless the user already selected a cloned voice for this speaker in the
  current request, present the relevant candidates and ask them to confirm
  which voice matches.
- Use `widget-forms` to show supported previews and ask which saved voice
  matches. Keep each candidate's full `customVoiceId` associated with its label;
  do not invent native editor form ids or assume a choice opens a clone dialog.
- If none match, check for an accessible audio asset from the speaker that
  meets the Voice Skill's reference requirements. Reuse it when suitable.
  For a video or overlong recording, follow the Voice Skill to extract a clean
  excerpt from readable, authorized source bytes and import it through
  `asset-import`. Ask the user for a new sample only if that source cannot be
  read or prepared; do not promise that another upload is never necessary.
- For a new clone, follow the Voice Skill's Agent-driven flow: creation
  preflight, missing name and preview text, and explicit ownership/permission
  and lawful-use confirmation. Then clone from the resolved audio asset.
- Use a ready voice only after the user confirms that it matches this speaker.

Do not clone or use a third party's voice without permission, and do not
silently substitute a different official or cloned voice.

## 3. Generate and prepare the edit in parallel

Once the corrected text, selected voice, and target region are confirmed, start
generating the corrected speech.

While generation is running, prepare only the local timeline region:

1. Isolate a short video segment around the mistake, retaining enough nearby
   sound for a clean transition.
2. Identify which timeline item is currently producing the mistaken speech. If
   it comes from embedded audio on the isolated video segment, detach that
   audio. If it already comes from a separate audio item, edit that item
   directly and do not detach the video again.
3. Identify the exact span occupied by the mistaken speech and preserve that
   duration as the replacement slot.
4. Keep the original result recoverable until the replacement speech is ready.

Do not move later clips or close the replacement slot while preparing the edit.

## 4. Replace and fit the corrected speech

After generation succeeds, remove or silence only the mistaken speech and
place the corrected speech at the same local position.

The replacement must end within the original slot:

1. Prefer concise wording and a naturally tighter delivery when regeneration
   can produce a better fit.
2. If it is still slightly too long, adjust only the replacement audio's speed
   by the smallest amount needed.
3. Never cut off the end of a spoken sound, and never speed or move surrounding
   original speech merely to make room.
4. If a natural correction cannot fit, ask whether the user prefers shorter
   wording or a wider timing change.

A shorter replacement may leave a natural pause; it does not need to fill every
available frame.

## 5. Blend and review

Match the surrounding language, delivery, loudness, and room feel. Smooth only
the local entry and exit of the replacement so unrelated audio remains
untouched.

Verify that:

- the incorrect speech is no longer audible;
- the corrected wording is exact and intelligible;
- the replacement does not overlap later speech;
- the picture and later timeline timing have not changed;
- there are no clicks, doubled words, abrupt ambience changes, or hard cuts;
- the user is shown the exact region to review.

Audio replacement does not repair visible mouth movement. When the speaker is
shown in close-up and the new sounds differ visibly, disclose the likely lip
mismatch and offer a visual cover only if the user wants one.

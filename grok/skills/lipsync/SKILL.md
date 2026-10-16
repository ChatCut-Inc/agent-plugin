---
name: lipsync
description: |
  Synchronize mouths in an existing video to supplied final speech audio, only
  when the user explicitly wants mouth movements changed to match that audio.
  Replacing dialogue alone does not imply lip sync; use voice for new dialogue
  with unchanged picture. Does not translate, clone voices, generate speech, or
  create a new avatar performance. Integrated lip-synced translation uses
  video-translation; independently generated audio uses this skill only when
  mouth synchronization is requested.
---

# Lipsync

## Scope and input roles

`submit_lipsync` takes an existing project video and the final speech audio whose
words should be heard in the output. It changes mouth motion to match that audio.
It does not translate words, create a voice or derive a new performance from a photo.
For a new presenter performance from a likeness, use `digital-human`.

For any translation request, first load `video-translation`. It owns the route
choice and may call this skill with independently prepared final audio. Do not
restart translation or voice selection here.

If the user supplies final audio, reuse it directly. For a wholly new script,
use `voice` to generate final speech, then obtain approval of that actual audio and
its measured duration before paid rendering, as described below. A cloning sample
is not final dialogue. If no mouth synchronization is requested, use dialogue
replacement instead of this tool. Integrated HeyGen translation includes its own mouth
synchronization; do not lip-sync its output a second time by default.

## Prepare, submit and inspect

1. Resolve the exact ready source-video and speech-audio assets. Prepare the requested
   section as its own asset when needed, using
   [media preparation](../video-translation/SKILL.md#prepare-the-processing-source). This tool processes that entire asset,
   without a speaker or spatial selector; cutting a time range does not isolate
   one visible person. Resolve any non-target preservation requirement against
   that actual scope. Inspect the actual video and final audio using available
   perception to check the approved words and desired voice.
2. Check source/audio durations, visible speaker, face obstruction and scene cuts.
   Do not promise arbitrary multi-person targeting or that a long new speech can fit
   a short original performance. Resolve material duration differences before paying
   for rendering. Keeping duration and keeping natural speech pace can conflict.
3. In Grok Bot, first present the actual audio through the host's supported playback,
   measured durations, proposed treatment and known cost, and obtain approval
   before calling `submit_lipsync`. Do not assume a ChatCut Desktop confirmation
   dialog will protect this hosted call. If playback is unavailable, ask the user
   to listen in the ChatCut editor and approve before submission. Reuse
   approval for unchanged audio without asking again about identity or script.
   Supply `sourceVideoAssetId`, `speechAudioAssetId` and required `durationPolicy`.
   `preserve-video` requires audio/video durations within 250 ms; `allow-adjustment`
   currently admits a longer/shorter duration ratio up to 1.15 as ChatCut's
   conservative input limit, not a verified supplier formula. Adapt media outside
   that range before submission. It does not guarantee exact audio-length matching,
   unlimited stretching or a natural extended performance.
   Never silently truncate approved speech. Do not supply transcript,
   voice-clone samples, avatar IDs or invented speaker-selection parameters.
4. Follow the returned job via `track_progress`, retaining job/asset IDs to resume
   existing work. Continue requested timeline assembly and export when the asset is
   ready. Report generation/placement from their actual receipts and duration from
   metadata. Check wording from actual audio or its transcript, voice similarity
   from listening, and mouth alignment from continuous audiovisual inspection.
   Asset metadata and static frames cannot establish natural lip sync or voice similarity. If that perception was not
   available or performed, state that quality remains unverified rather than treating
   successful generation or timeline placement as a quality check.

Preserving the original scene is the goal, not a promise of identical pixels,
container, alpha or frame rate. Follow actual returned limitations. Do not promise
background music preservation or use a voice-isolation tool to extract a background bed.

## Recover the affected stage

- Wrong words, pronunciation or voice: fix the final audio first and only then redo
  mouth rendering. Lipsync cannot repair the audio.
- Audio correct but lips poor: inspect face visibility, occlusion, multiple speakers,
  cuts and duration. Adjust the affected input within available controls.
- Unknown submit outcome: inspect the existing job; retry with identical inputs and
  the same optional `requestId`. By default identical inputs reuse the existing job,
  including a completed output. Only when the user explicitly wants a fresh render,
  create one new UUID as `requestId`, retain it, and reuse it across all retries of
  that attempt. Never create new IDs simply to bypass failures or uncertain outcomes.
  A changed final audio/video asset or duration policy is a different input. A
  request-conflict error requires restoring the original inputs, not blind retries.
- Source not ready or invalid: wait for processing or prepare valid media; do not
  substitute a photo-avatar workflow that discards the user's footage.
- Render succeeded but import failed: recover the existing output when possible;
  do not regenerate or loop forever.
- Missing Lipsync pricing configuration: report unavailable pricing and stop; do not
  invent a cost or repeatedly submit.
- Capability/permission unavailable: report the observed blocker and preserve valid
  input audio. Offer alternatives only with their changed picture/cost implications.

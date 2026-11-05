---
name: widget-forms
description: Adapt ChatCut questions and previews to the media and interaction surfaces that Antigravity reliably supports.
---

# Antigravity Interaction Adapter

Antigravity has no documented native option-card widget. Use concise ordinary text choices with stable ids mapped internally. Use chat image bubbles only when the host can display images in chat and only for the visual-preview cases defined below; otherwise describe the options in text.

## Stable visual-preview path

When the host can display images in chat, use normal chat image bubbles only for Motion Graphic references or Design Style preset thumbnails. Otherwise present text descriptions with the same choices.

For an MG reference or Design Style choice:

1. Select a small relevant set, normally 3–6 options.
2. Obtain each returned thumbnail or preview-image URL from the live tool result or the pinned widget-media manifest. Never invent or rewrite the URL.
3. Download each image to a temporary local file readable by the host. Do not save it into the plugin package or the user's project unless the workflow separately requires an import.
4. If the host can display images in chat, display the downloaded images as ordinary chat image bubbles in choice order; otherwise describe each option in text.
5. Immediately follow them with concise localized choices, using concise ordinary text choices. Keep every visible label mapped to the exact returned preset or reference id.
6. Stop and wait for the user's selection. If an image cannot be downloaded or displayed, omit that bubble and keep the corresponding choice; do not expose the source URL.

Do not use this image-bubble path for avatars, voices, audio samples, generated project video, or general project preview.

## Text questions and choices

For every other question, ask only the minimum blocking question. Use concise ordinary text choices, while keeping stable ids mapped internally.

- `short_text`: ask one direct text question.
- `single_choice`: use concise ordinary text choices; accept the selected label.
- `explicit_consent`: quote the caller's full consent statement and require an explicit affirmative response. Never infer consent from an attachment or another answer.
- `audio_reference`: ask the user to attach the source file in the conversation, then load `asset-import`. Return the imported ChatCut audio `assetId`; never treat a local path, attachment URL, or raw bytes as an asset id.
- `avatar_choice`: show names and concise returned descriptions as text. Tell the user that visual previews are available in ChatCut's Digital Humans library when previewing matters.
- `voice_choice`: show names and concise returned traits as text. Provide the clean ChatCut editor link supplied by the project workflow and tell the user to audition voices there or in its voice library before choosing when sound matters.

## Audio and video restrictions

Voice samples are auditioned in ChatCut rather than in chat. For a newly cloned voice, report that its preview is ready in ChatCut, provide the clean editor link supplied by the project workflow, and ask the user to reply with `Retry` or `Apply` after listening.

Do not represent a project preview as an embedded video or popup. Project and timeline workflows must provide the clean ChatCut editor link; internal inspection tools may still be used for agent verification.

## Semantic contract mapping

This adapter implements the caller's host-neutral input contract; it does not decide which fields the workflow requires. Write visible text in the user's language, ask only for missing inputs, wait for the user's answer, and validate every blocking answer before continuing. Never emit raw `<widget>`, `<choices/>`, or `<visual-option>` tags, or call `ask_followup_questions` expecting a native form.

- `playable_single_choice`: present localized text choices with stable values mapped internally; users audition samples through the clean ChatCut editor link. Preserve every caller-provided voice id, label, traits and preview association internally; do not print raw sample URLs or pretend chat audio is playable.
- `playable_preview`: tell the user the caller-provided preview is ready in ChatCut and provide the clean editor link. This is display-only; collect the caller's branch decision separately after listening. Never emit raw audio HTML or expose the runtime media URL.
- MG reference choices: map labels to exact reference ids and retain one localized `__other__` choice accepting a new preference or another batch, with no separate Show more option. Other returns to discovery, not style application. Return the selected reference id to the caller; never bind `apply_preset` directly to it. Resolve bundled images through `assets/widget-media/manifest.json` relative to the plugin root; absent previews use text, never guessed CDN paths.
- Avatar choices: map each returned name to the exact `identityId`. Use names and returned descriptions in text; previews are available in ChatCut's Digital Humans library. Preserve `create_avatar` as a separate value returned to the caller, then request the attachment and use `asset-import`; it does not open a native dialog automatically.
- Voice/clone actions: preserve `clone_voice`, `Retry`, `Apply`, and any other caller-provided stable values. A selection is not consent to cloning or a paid action; request the caller's full explicit authorization separately when required.

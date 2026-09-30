---
name: widget-forms
description: Adapt ChatCut questions and previews to the media and interaction surfaces that Grok Bot reliably supports.
---

# Grok Bot Interaction Adapter

Use ordinary chat text for questions and choices. Use chat image bubbles only for the visual-preview cases defined below.

## Stable visual-preview path

The only media-preview path to rely on is a normal chat image bubble, and only for Motion Graphic references or Design Style preset thumbnails.

For an MG reference or Design Style choice:

1. Select a small relevant set, normally 3–6 options.
2. Obtain each returned thumbnail or preview-image URL from the live tool result or the pinned widget-media manifest. Never invent or rewrite the URL.
3. Download each image to a temporary local file readable by the host. Do not save it into the plugin package or the user's project unless the workflow separately requires an import.
4. Display the downloaded images as ordinary chat image bubbles, in the same order as the choices.
5. Immediately follow them with concise localized choices, using either Grok Bot's native option cards or ordinary text options. Keep every visible label mapped to the exact returned preset or reference id.
6. Stop and wait for the user's selection. If an image cannot be downloaded or displayed, omit that bubble and keep the corresponding choice; do not expose the source URL.

Do not use this image-bubble path for avatars, voices, audio samples, generated project video, or general project preview.

## Text questions and choices

For every other question, ask only the minimum blocking question. Use either Grok Bot's native option cards or concise ordinary text choices, while keeping stable ids mapped internally.

- `short_text`: ask one direct text question.
- `single_choice`: use short native option cards or ordinary text choices; accept the selected label.
- `explicit_consent`: quote the caller's full consent statement and require an explicit affirmative response. Never infer consent from an attachment or another answer.
- `audio_reference`: ask the user to attach the source file in the conversation, then load `asset-import`. Return the imported ChatCut audio `assetId`; never treat a local path, attachment URL, or raw bytes as an asset id.
- `avatar_choice`: show names and concise returned descriptions as text. Tell the user that visual previews are available in ChatCut's Digital Humans library when previewing matters.
- `voice_choice`: show names and concise returned traits as text. Tell the user to audition voices in the ChatCut editor or voice library before choosing when sound matters.

## Audio and video restrictions

Voice samples are auditioned in ChatCut rather than in chat. For a newly cloned voice, report that its preview is ready in ChatCut, provide the clean editor link supplied by the project workflow, and ask the user to reply with `Retry` or `Apply` after listening.

Do not represent a project preview as an embedded video or popup. Project and timeline workflows must provide the clean ChatCut editor link; internal inspection tools may still be used for agent verification.

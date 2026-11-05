# Execution Path: Seedance 2.0

Seedance 2.0 can generate visuals, voiceover, and music in one generation, subject to current model availability and duration limits in the tool schema. This document explains how to convert the Phase 1/2 results into Seedance input. For exact invocation and parameters, see the `video-gen` skill.

## Script -> Prompt

The narrative script from Phase 2 must be converted into a complete video-description prompt:

- Start with one sentence that defines the overall visual tone.
- If there is voiceover, include the full text as `Voiceover: "..."`.
- Describe visuals and sound by time range, such as `(0-3s)` and `(3-5s)`.
- Specify the product name and key appearance details.
- Put music requirements directly into the prompt: style, rhythm, and emotion.

## Brand integration

Write the brand information extracted in Phase 1 into the prompt. You can integrate it naturally into the scene, such as "deep navy background", or provide exact values directly, such as "brand colors: primary #1A2B3C, accent #4D5E6F", depending on context.

## Asset selection

Use the video-gen skill and current submit_video schema for reference-guided video generation; pass actual asset IDs or returned URLs through supported reference fields. CLI flags in source examples are not MCP arguments. Reference images should include:

- Product images extracted in Phase 1: logo, feature screenshots, UI images.
- Preset-provided reference images, if any.

These reference images help Seedance understand the product appearance, UI style, and brand visuals so generation remains consistent with the references.

**Logo note**: Seedance does not accept SVG. If the logo is SVG, convert it to PNG before passing it in. Include the logo as a reference image so it is more likely to be reproduced accurately in the generated video.

## Text accuracy

Seedance may render text incorrectly, such as missing letters or malformed spelling. When the prompt contains brand names, slogans, or other text, emphasize exact spelling in the prompt, for example: `The text "ChatCut" must be spelled exactly as shown.` Do not put complex text, such as long URLs or multiline feature descriptions, into the generated image; overlay it later with MG.

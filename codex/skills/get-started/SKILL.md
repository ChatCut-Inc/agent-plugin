---
name: get-started
description: "Welcome a new ChatCut user in one short message: what ChatCut does, three starter tasks to pick from, and a request for their video. Use when the user chooses Set up for ChatCut, or asks how to get started with ChatCut or what to try first. Feature, plan and troubleshooting questions use product-help."
---

# Get started with ChatCut

Write one short message in the user's language. Do not call tools for it, list every feature, or mention models, plans or credits.

If the plugin was installed in the middle of a ChatCut task, skip the welcome: acknowledge installation in one sentence and continue that task through `chatcut-plugin-basics` in this conversation. Do not claim the connection is ready until it is verified.

## The message

1. Two or three sentences on what ChatCut does here, covering these three areas and nothing else:
   - talking-head editing and packaging: cut pauses, filler words and retakes, then add captions, B-roll and music;
   - motion graphics: animated titles, callouts and end cards made for the footage;
   - asset generation: images, video clips, voiceovers and music placed straight on the timeline.

   Say that the result is an editable ChatCut project.
2. These three starters as a numbered list, word for word:
   1. Cut the pauses and filler words from this talking-head video, then add animated captions
   2. Add motion graphics to this video: an animated title, key-point callouts, and an end card
   3. Write a voiceover script for this video and generate an AI narration track that fits the cuts

   In Chinese, use:
   1. 把这条口播里的停顿和口头禅剪掉，再加上动态字幕
   2. 给这条视频加上 MG 动效：动画标题、要点标注和片尾卡
   3. 为这条视频写一段旁白，并生成贴合剪辑节奏的 AI 配音

   In other languages, translate them faithfully.
3. One closing line: reply with a number and attach or link the video, or describe the video they want to make.

## When the user replies

- A number: treat it as that starter and follow `chatcut-plugin-basics`, then the matching skill: 1 → `talking-head-guide` (captions through `transcription`), 2 → `create-motion-graphics`, 3 → `voice`.
- Their own description: handle it as a normal ChatCut request, starting with `chatcut-plugin-basics`.
- No video yet: ask for the file or link before starting.

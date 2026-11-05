# ChatCut for WorkBuddy

The WorkBuddy package is a ChatCut expert agent, shown in WorkBuddy as **All-in-one video creation expert** (一站式视频创作专家, profession: ChatCut Video Editor). It works in real, editable ChatCut timelines through the hosted ChatCut MCP server: media import, talking-head cleanup, captions, B-roll, transitions, effects and color, motion graphics, generated video, images, music, sound effects and voiceovers, and export of finished video, audio, subtitles, or Premiere Pro and DaVinci Resolve-compatible project files.

This folder is the expert package listed on WorkBuddy's official experts page, version **1.0.6**.

## Connection

- Hosted Web plugin. It does not use ChatCut Desktop.
- `.mcp.json` declares the hosted endpoint `https://api.chatcut.io/api/external-mcp/mcp` over HTTP with OAuth. WorkBuddy's connection card handles sign-in.
- Attribution headers: `x-chatcut-mcp-client: workbuddy` and `x-chatcut-mcp-surface: embedded-preview`.
- The package stores no ChatCut password, OAuth token or other credential.

## Install and connect

From the package's own instructions:

1. Add ChatCut from WorkBuddy's experts page, or install the package ZIP in WorkBuddy.
2. The first time you call the expert, sign in and authorize ChatCut in the inline connection card.
3. Pick an existing project or ask the expert to create one. The expert asks WorkBuddy to open the project in its built-in browser and always adds a plain "Open ChatCut editor" link as a fallback.
4. Provide your media and goal. The expert builds an editable timeline and exports only when you ask.

## Package contents

```text
.codebuddy-plugin/plugin.json   WorkBuddy expert manifest: display text, skills, MCP dependency
.mcp.json                       Hosted ChatCut MCP connection
agents/chatcut-video-editor.md  Expert instructions (Chinese)
avatars/chatcut.png             Expert avatar
bin/                            chatcut-upload-media launchers for macOS/Linux and Windows
skills/                         13 skills
README_ZH.md                    The package's original Chinese README
```

Skills: `asset-import`, `motion-graphics`, `export`, `image-gen`, `known-errors`, `music`, `shader-gen`, `talking-head-guide`, `transcription`, `verification`, `widget-forms`, `video-gen` and `voice`. `asset-import`, `export`, `motion-graphics`, `transcription`, `verification`, `voice` and `widget-forms` are written for WorkBuddy; the others are July 2026 copies of the shared ChatCut skills, some with small WorkBuddy edits.

The ZIP has `.codebuddy-plugin/plugin.json` at its root. To rebuild it as submitted, leave out this English README and restore `README_ZH.md` as `README.md`.

## Media and data handling

- Local attachments and paths are imported with the bundled `chatcut-upload-media` command, which runs `skills/asset-import/scripts/upload-media.mjs` with a short-lived `import_media` session. It needs `node`, `ffmpeg` and `ffprobe` on `PATH`. If any of them is missing, the expert does not install it; it opens the ChatCut editor and asks you to upload the file there.
- Imported media is uploaded to ChatCut cloud storage. If you say a file must not be uploaded, the expert stops before importing it.
- Exports render in the cloud with `submit_export`. Finished video and audio are downloaded into the WorkBuddy task folder and opened with WorkBuddy's file preview; if that local step fails, the expert returns the cloud download link.
- Generating video, images, music, voiceovers, sound effects or shaders may use ChatCut credits. The expert describes the job and waits for explicit confirmation first. Directly authored Motion Graphics are not paid generation.

## Known limitations

- Not supported: live screen or camera recording, editing Premiere Pro, DaVinci Resolve or Final Cut Pro projects directly, and publishing or scheduling to social platforms.
- WorkBuddy's `present_files` request does not prove that the editor appeared; the expert always includes the editor link.
- There are no multicam, digital human, video translation or product-help skills in this package, unlike the Codex and Claude Code packages.
- The generation skills describe the models available in July 2026: `video-gen` covers Seedance 2.0 and Kling, and `image-gen` covers `gpt-image-2` and `nano-banana`. Newer models documented in the other host packages are not described here.
- `.mcp.json` does not send an `x-chatcut-plugin-version` header.

## License

The package manifest declares `GPL-3.0-only`. The package has no separate license file.

Support: [chatcut.io](https://chatcut.io).

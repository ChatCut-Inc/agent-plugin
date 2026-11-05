# ChatCut for Qwen Work (千问办公)

The Qwen Work package is an expert kit, **ChatCut 视频剪辑师 / ChatCut Video Editor** (`chatcut-video-editor-web`, version **2.0.4**), with 17 Skills. It makes talking-head edits, motion graphics and product or app promos in ChatCut, with AI video, image, music and voiceover generation, and keeps an editable multitrack timeline that the user can keep adjusting in the ChatCut web editor.

## Connection

- Hosted Web plugin. No ChatCut Desktop installation is needed.
- The kit uses the **ChatCut** connector already listed in Qwen Work's market: Streamable HTTP with OAuth to `https://api.chatcut.io/api/external-mcp/mcp`. The market Server Key is `ChatCut` (case-sensitive); it is an identifier, not a secret.
- `.mcp.json` declares the same endpoint with `x-chatcut-mcp-client: qwen_work`, `x-chatcut-mcp-surface: editor-workbench` and a 300-second timeout.
- No credentials, local MCP process or Desktop installer are bundled.

## Install and connect

From the kit's `CONNECTORS.md` and `references/connector-readiness.md`:

1. In Qwen Work, open **Extensions → Connectors** (「扩展 → 连接器」), turn on **ChatCut** from the market, and sign in to your own ChatCut account with OAuth. The kit's details page also links there through **Data connections** (「数据连接」). An existing authorization is reused.
2. Use the same ChatCut account in the web editor.
3. Start from one of the entry Skills, 口播精剪 (`talking-head-guide`), 制作 MG 动画 (`create-motion-graphics`) or 制作产品 / App 宣传片 (`app-promo-guide`), or describe the video in your own words.

Before each task the agent checks the connector. When it is not installed, turned off or signed in, the agent uses Qwen Work's own actions where they are available or asks you to complete the step; it never asks for passwords, tokens or cookies. Without a connection it can still draft scripts, storyboards or edit plans, and it says that nothing has been written to ChatCut.

## Package contents

```text
.qoder-plugin/plugin.json          Kit manifest
.mcp.json                          Hosted ChatCut connection
CONNECTORS.md                      Connection help (Chinese)
references/connector-readiness.md  Connector checks and recovery (Chinese)
skills/                            17 Skills
assets/                            Icon, logo and widget media manifest
README_ZH.md, README_EN.md         The kit's original Chinese and English READMEs
SOURCE.md                          Provenance notes
LICENSE                            Apache License 2.0 (shared repository license)
```

Skills: `talking-head-guide`, `create-motion-graphics`, `app-promo-guide`, `asset-import`, `chatcut-plugin-basics`, `digital-human`, `export`, `known-errors`, `music`, `product-help`, `shader-gen`, `transcription`, `verification`, `video-gen`, `video-translation`, `voice` and `widget-forms`. According to `SOURCE.md`, the editing catalog and the upload helper come from the official Codex plugin (baseline 1.10.12), with Qwen Work adapters for authentication, editor handoff, questions, inline Script editing, asset import and package-relative paths.

This folder matches the submitted 2.0.4 ZIP except that the Chinese `README.md` is renamed `README_ZH.md`, this English `README.md` is added, and one sentence of listing instructions meant for the publisher is removed from `CONNECTORS.md`. The kit ZIP has `.qoder-plugin/plugin.json` at its root.

## Media and data handling

- Local files are imported with the bundled `skills/asset-import/scripts/upload-media.mjs` helper, which needs Node.js 18 or newer plus `ffmpeg` and `ffprobe`. When they are missing, the agent explains why and installs them through Qwen Work's permission flow; when that is not possible, it falls back to uploading in the ChatCut web editor. No media binaries are bundled.
- Selected local media is uploaded to ChatCut cloud storage. Generation may consume ChatCut credits.

## Known limitations

- Multicam synchronization is not available through the hosted connector; the kit asks for footage that is already synchronized instead.
- The kit does not use ChatCut's native forms or editor buttons. Choices go through Qwen Work's native questions or plain chat, avatar previews appear only where Qwen Work can show them, and voice cloning follows an agent-driven flow.
- Version 2.0.4 was checked structurally, which is not end-to-end verification in Qwen Work.
- `.mcp.json` does not send an `x-chatcut-plugin-version` header.
- A ChatCut Desktop variant of this kit exists but is not included here. Its connection Skill names tools that current ChatCut Desktop no longer exposes, such as `local_export`, and requires macOS 14 while the official installer supports macOS 13.

## License

Apache-2.0, like the rest of this repository. See [LICENSE](./LICENSE).

Support: [chatcut.io](https://chatcut.io).

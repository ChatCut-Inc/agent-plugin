# xAI marketplace submission — ChatCut

`github.com/xai-org/plugin-marketplace` is the Grok Build catalog. It is **not** the Grok Bot catalog. Grok Bot listings go to https://cursor.com/marketplace/publish.

## Grok Build (this repo)

1. Merge the `grok/` package to `ChatCut-Inc/agent-plugin` `main`.
2. Pin HEAD:

```bash
git ls-remote https://github.com/ChatCut-Inc/agent-plugin.git HEAD
```

3. Fork `xai-org/plugin-marketplace` from the **ChatCut-Inc** GitHub org (not a personal account).
4. Add one catalog entry to `.grok-plugin/marketplace.json`:

```json
{
  "name": "chatcut",
  "description": "Edit and create videos in ChatCut from Grok Build: import media, edit timelines, captions, motion graphics, generation, export.",
  "category": "productivity",
  "homepage": "https://chatcut.io",
  "keywords": ["chatcut", "video-editing", "captions", "timeline"],
  "domains": ["chatcut.io", "api.chatcut.io", "app.chatcut.io"],
  "source": {
    "source": "url",
    "url": "https://github.com/ChatCut-Inc/agent-plugin.git",
    "sha": "<full 40-char sha>",
    "path": "grok"
  }
}
```

5. Run `python3 scripts/generate-plugin-index.py` and `python3 scripts/validate-catalog.py`.
6. Open the PR. State in the README of this plugin: network endpoint `https://api.chatcut.io/api/external-mcp/mcp`, OAuth to ChatCut accounts, no vendored ffmpeg binaries in the Grok package.

Do not vendor ffmpeg.gz in `grok/`. xAI marketplace review rejects bundled binary execution.

## Grok Bot / Cursor

Submit `grok-bot/` (Agent Plugins `plugin.json` + `mcp.json`) at https://cursor.com/marketplace/publish. The repo must stay public. Do not open an xAI marketplace PR for Grok Bot.

## Website

Wire these agent-executable guides, same dual HTML/plain-text pattern as Claude and ChatGPT:

- `https://chatcut.io/grok` → `docs/grok-build-install.md`
- `https://chatcut.io/grok-bot` → `docs/grok-bot-install.md`

Add **Grok Build** and **Grok Bot** Copy rows next to ChatGPT/Codex and Claude Code in the ChatCut avatar → Agent Plugin menu.

## Backend

Allow and document these MCP headers (do not require Codex/Claude in-app browser handoff for them):

```text
x-chatcut-mcp-client: grok_build | grok_bot
x-chatcut-mcp-surface: grok-build | grok-bot
```

`get_editor_url` / `create_project` should return a clean `editorUrl` and must not require `codex-internal-browser`.

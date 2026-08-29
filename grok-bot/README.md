# ChatCut for Grok Bot

Agent Plugins package for Grok Bot and Cursor. Skills plus the hosted ChatCut MCP server.

Grok Bot edits **ChatCut cloud projects**. It does not control ChatCut Desktop on a laptop. A user can continue an in-progress cut from the Grok Bot iOS or desktop app while the laptop is closed.

- Manifest: `plugin.json`
- MCP: `mcp.json` → `https://api.chatcut.io/api/external-mcp/mcp`
- Headers: `x-chatcut-mcp-client: grok_bot`, `x-chatcut-mcp-surface: grok-bot`

Submit at https://cursor.com/marketplace/publish. Do not submit this folder to `xai-org/plugin-marketplace`.

Install guide: [../docs/grok-bot-install.md](../docs/grok-bot-install.md).

After install:

```text
Continue my ChatCut project <name or editor URL>. Shorten the intro and fix the captions.
```

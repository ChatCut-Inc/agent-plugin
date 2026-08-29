---
name: known-errors
description: Diagnose ChatCut plugin tool failures on Grok Bot.
---

# Known Errors (Grok Bot)

Treat the active MCP tool schema as authoritative.

- Empty ChatCut tools after install means OAuth is missing. Authenticate from Settings → Plugins. Start a new chat after sign-in.
- Do not try to repair this by installing ChatCut Desktop. Grok Bot is a cloud computer.
- Do not ask for laptop file paths. Use `/workspace`, chat attachments, or the ChatCut editor upload UI.
- Hosted import uses `import_media`, not Desktop `push_asset`.
- A successful mutation is not visual proof; load `verification` or inspect the editor on the Agent Computer.

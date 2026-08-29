# ChatCut for Grok Build

Grok Build plugin: skills plus the hosted ChatCut MCP server.

- Manifest: `.grok-plugin/plugin.json`
- MCP: `.mcp.json` → `https://api.chatcut.io/api/external-mcp/mcp`
- Headers: `x-chatcut-mcp-client: grok_build`, `x-chatcut-mcp-surface: grok-build`
- This package does not vendor ffmpeg binaries. Use system `ffmpeg`/`ffprobe`.

Network: `api.chatcut.io` (MCP + OAuth). Users sign in with a ChatCut account. Tokens stay in the Grok MCP credential store.

Install:

```bash
grok plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git
grok plugin install chatcut --trust
```

Then `/mcps` → `chatcut` → `i` to authenticate, and start a new session.

Guide: [../docs/grok-build-install.md](../docs/grok-build-install.md).

# Security Policy

## Reporting a vulnerability

Please report security issues privately by email to dev@chatcut.io with "Security" in the subject line. Do not open a public GitHub issue for a vulnerability.

Include the affected plugin folder (for example `codex/`, `claude/`, `grok/`, `kimi/` or `chatcut-desktop-codex-plugin/`), the version from its manifest, steps to reproduce, and the impact you observed. We will acknowledge your report and keep you informed while we investigate.

## Scope

- Plugin manifests, skills and helper scripts in this repository.
- The hosted ChatCut MCP endpoint these plugins connect to (`https://api.chatcut.io/api/external-mcp/mcp`).

The plugins do not store credentials. Hosts handle OAuth sign-in, and the ChatCut service derives the user from the host's access token.

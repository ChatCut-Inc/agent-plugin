# Discovery and fallback

The Skill is a local package, not a tool served by the MCP being diagnosed.
Use the host's actual skill catalog to check it loaded. A folder existing on disk
does not prove a command is available in the current chat.

| Host/package | Entry | Verification |
| --- | --- | --- |
| Codex ChatCut Git plugin | Skill picker; `$chatcut:chatcut-mcp-doctor` | Confirm the named Skill and path in the running host catalog; invoke it and obtain a local report |
| Codex existing `chatcut-desktop` store identity | Skill picker; `$chatcut-desktop:chatcut-mcp-doctor` | Confirm the installed version and actual catalog entry; store approval/update is separate from Git availability |
| Codex standalone project/personal copy | `$chatcut-mcp-doctor` | Confirm it in the catalog, then invoke it |
| Claude Code ChatCut plugin | `/chatcut:chatcut-mcp-doctor` | Confirm the command in `/` or `/skills`, then invoke it |
| Claude personal/project Skill copy | `/chatcut-mcp-doctor` | Confirm the same catalog before use |

Official entry references: [OpenAI skills](https://developers.openai.com/plugins/build/skills),
[Claude Code skills](https://code.claude.com/docs/en/skills).
Claude's namespaced plugin commands differ from Codex's `$` invocation. Do not
promise an unqualified `/doctor`; it can refer to the host's own health check.

If the current package lacks Doctor, explain that its version does not include
this Skill. The existing collector may still be bundled at
`skills/chatcut-plugin-basics/scripts/mcp-doctor.mjs` (Claude:
`chatcut-plugin-basics-claude`). That collector writes JSON but older versions do
not include these summary/draft sidecars.

An agent with a trusted local copy of this repository can read this SKILL.md
directly and execute `scripts/doctor.mjs` without installing or connecting MCP.
For an explicitly requested standalone installation, copy the complete
`chatcut-mcp-doctor` directory (including scripts and references) into a host
supported project/personal skills directory, then verify discovery in a new
host session if necessary. Codex supports project `.agents/skills/`; Claude uses
`.claude/skills/`. Do not change global settings or install it merely to inspect
an error. A standalone copy may have no parent plugin manifest; that is a package
version evidence gap and does not block collection.

For users without a local copy, the official plugin sources/install guidance are
[agent-plugin](https://github.com/ChatCut-Inc/agent-plugin),
[Codex setup](https://chatcut.io/chatgpt), and
[Claude Code setup](https://chatcut.io/claude). Verify a released package actually
contains this Skill before recommending it (Codex 1.10.22 / Claude plugin 1.10.24
or later). Git source availability does not prove store approval or a host update.
Do not download and execute an unreviewed remote shell script.

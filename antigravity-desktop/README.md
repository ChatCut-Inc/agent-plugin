# ChatCut Desktop for Antigravity

This package lets a Google Antigravity agent install ChatCut Desktop on the user's computer, connect to its local `chatcut_desktop` MCP server and use Desktop's own Skills to edit videos, add captions and motion graphics, generate media and recreate reference videos with the user's footage.

It is Desktop only. It contains one Skill and no MCP server of its own, so it never connects ChatCut Web. The hosted Web package is still available separately in [`../antigravity`](../antigravity/README.md) for existing Web projects.

## Requirements

- Antigravity App, CLI or IDE with plugin support, running on the user's own computer.
- macOS 13 or newer (Apple Silicon or Intel), or Windows 10 or newer (x64), with a graphical desktop. Linux is not supported.
- A ChatCut account for sign-in. Paid generation uses ChatCut credits and may need a paid plan.

No Node.js, npm or other local tools are needed.

## Install

After Marketplace approval: **Customizations → Marketplace → ChatCut → Add**.

Before approval, install from GitHub:

```bash
agy plugin install https://github.com/ChatCut-Inc/agent-plugin/tree/main/antigravity-desktop
```

or from a local clone:

```bash
agy plugin install <path-to-clone>/antigravity-desktop
```

Start a new conversation and ask, for example, “Install ChatCut on this computer.”

## What the agent does

In one go, without stopping for confirmation:

1. Reuses an existing `chatcut_desktop` connection when one works.
2. Otherwise installs ChatCut Desktop with the official installer (`CHATCUT_INSTALL_SOURCE=antigravity_marketplace`). The installer opens ChatCut and a browser sign-in page; they are the same sign-in, so the user signs in once in either.
3. Registers Desktop's launcher as the stdio MCP server `chatcut_desktop` with `agy mcp add`, preserving other servers.
4. Links Desktop's Skills from `~/.agents/skills` into `~/.gemini/config/skills`, using Desktop's own manifest.
5. Asks the user to start a new conversation, where Antigravity loads the new tools and Skills, and gives them a ready-to-copy prompt (plus an `agy -i` one-liner in the CLI). Antigravity offers agents no way to open a conversation themselves.

Steps 3 and 4 are temporary: ChatCut Desktop registers Codex, Claude Code and other agents itself but not Antigravity yet. Once it does, the Skill only needs steps 1, 2 and 5.

## Data and privacy

- Projects and media stay on the user's computer in ChatCut Desktop. Cloud generation and transcription upload only the media a task needs, under the user's ChatCut account.
- The package contains Markdown only: no scripts, binaries or credentials.
- Review ChatCut's [Privacy Policy](https://chatcut.io/privacy) and [Terms of Service](https://chatcut.io/terms).

## Uninstall

Remove the plugin in Customizations or with `agy plugin uninstall chatcut-desktop`. To disconnect Desktop as well, run `agy mcp remove chatcut_desktop` and delete the `chatcut-*` links in `~/.gemini/config/skills`.

## Support

- Product and documentation: [chatcut.io](https://chatcut.io)
- Plugin support: `dev@chatcut.io`
- Privacy and data deletion: `team@chatcut.io`

## License

Apache License 2.0 (`Apache-2.0`). See [LICENSE](LICENSE).

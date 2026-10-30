# Connect ChatCut in Grok and start an editable video

This guide is for an agent helping a user connect ChatCut. Identify the current
host before choosing a route. Grok Bot and grok.com have different installation
surfaces; success in one does not verify the other.

The public package is [grok/](../grok/README.md). This guide does not establish
marketplace approval or promise unattended installation. Verify availability in
the user's live host. The complete cold-start path remains subject to host
acceptance, including OAuth, skill discovery, and delivery.

## Start with one message

Paste this into a Grok Bot conversation. These are ordinary messages, not slash
commands; this guide does not rely on `/goal` support.

English:

> Read https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/main/docs/grok-install.md and help me connect ChatCut in this Grok Bot chat, then start my first editable video project; reuse an existing connection and pause for any required sign-in or approval.

中文：

> 请阅读 https://raw.githubusercontent.com/ChatCut-Inc/agent-plugin/main/docs/grok-install.md ，帮我在当前 Grok Bot 对话中连接 ChatCut，并开始第一个可继续编辑的视频项目；优先复用已有连接，需要登录或授权时交给我完成。

After connection, use the user's existing brief. If none exists, ask what they
want to make and whether they already have source media. Do not create an empty
project merely to declare setup successful.

## Choose the route

| Current environment | Connection path | What it establishes |
| --- | --- | --- |
| Grok Bot with ChatCut in Connect apps | Add the ChatCut plugin, authenticate, then inspect tools and skills | Marketplace installation only after the host confirms it; skills and authenticated calls require separate checks |
| Grok Bot with an existing ChatCut MCP connection | Reuse it and verify an authenticated read | Tool access; not proof of packaged skill installation |
| Grok Bot exposing a custom MCP control | Use Remote HTTPS if the current account supports it; see the limits below | A candidate manual connection requiring live verification |
| grok.com | Connectors → New Connector → Custom | Custom MCP tool access after authentication; not a Grok Bot plugin or a GitHub skill-package install |
| A repository checkout or ZIP alone | Reference material | No host installation, OAuth session, or automatic skill discovery |

Grok Bot requires an account with access to the product and its plugin controls.
See its current [access requirements](https://docs.x.ai/grok-bot/overview).
ChatCut requires a separate account and network access to `api.chatcut.io` and
`app.chatcut.io`. ChatCut generation credits are separate from the host's plan.

## Agent procedure

### 1. Inspect the current connection

Check the host's actual tool registrations and authentication state. Use the
current tool schemas; do not infer tool names or parameters from another host.
If ChatCut is already authenticated, continue with the first-project checks.
Do not register a second ChatCut server or replace a working plugin.

### 2. Connect through the current host

**Grok Bot marketplace.** Open Connect apps, search for ChatCut, and choose Add
only for the verified ChatCut entry. Complete Authorize or Authenticate in the
browser. If authorization is waiting, use Reopen. Confirm the installation and
connection state, then attach ChatCut with `@` when needed. If the entry is absent
or disabled, report that state; a public repository is not a marketplace listing.
See [Grok Bot app connections](https://docs.x.ai/grok-bot/computer-and-apps) and
[connection troubleshooting](https://cursor.com/help/grok-bot/connect-apps).

**Grok Bot custom MCP.** The official [Team Bots guide](https://docs.x.ai/grok-bot/team-bots)
documents custom Remote HTTPS servers and per-user OAuth. That does not establish
the same controls for every personal account. Reuse an existing manual ChatCut
connection, or inspect the visible custom MCP control in the current host. If
Remote HTTPS is offered, use the endpoint below and the host's OAuth flow. If the
control is absent, report the missing capability and stop setup. Do not invent a
Grok CLI command, silently switch products, or install ChatCut Desktop.

```text
https://api.chatcut.io/api/external-mcp/mcp
```

**grok.com custom connector.** If the user is using grok.com, open
[Connectors](https://grok.com/connectors), choose New Connector → Custom, enter
the endpoint, and complete authentication. Business or Enterprise policies may
require an administrator. This is the path in the
[Grok connectors documentation](https://docs.x.ai/grok/connectors); it does not
establish Grok Bot plugin installation or bundled skill discovery.

**Repository distribution.** The repository URL is
`https://github.com/ChatCut-Inc/agent-plugin`, the package directory is `grok/`,
and the root `.cursor-plugin/marketplace.json` points to that directory. These
describe the package for compatible consumers. This guide provides no verified
Grok Bot command for installing an arbitrary repository, ZIP, or commit. Only
claim repository installation if the current Grok host explicitly supports the
route and visibly confirms the installed package.

OAuth happens through the host and ChatCut sign-in. Never request a password,
one-time code, or access token in chat or copy credentials from another host.
For a human-only step, hand over the relevant sign-in or computer view. An
anonymous HTTP 401 with OAuth metadata is an authentication challenge, not proof
of successful OAuth or tool access.

### 3. Verify tools and skills separately

Make one harmless authenticated ChatCut read, such as listing accessible
projects, using the available schema. An empty project list can be a successful
response. A tool name in a menu without a successful call is insufficient.

Check the host's skill list for `chatcut-plugin-basics` and the workflow needed
for the task. Grok Bot documents `/` for saved skills and Connect apps → Your
plugins → Manage plugins and skills for private skills; see
[Skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations).
Do not overwrite existing private skills while testing a package.

If only MCP tools are connected, state that boundary. With readable web/file
access, load [chatcut-plugin-basics](../grok/skills/chatcut-plugin-basics/SKILL.md)
and the required workflow documents as references for this task. Follow their
relative references and helper paths from the same package revision. Reading a
Markdown file does not install or persist a host skill. If references or helpers
cannot be loaded, report the missing prerequisite before attempting that step.

If authorization succeeded but tools are still missing, inspect the host's
connection state and attach the connector. Use a fresh conversation only if
needed, carrying forward the original brief and verified setup state.

### 4. Complete a small, real edit

For a setup acceptance test, obtain the user's agreement to use a short clip
they supplied or a synthetic test clip. A useful deterministic brief is:

> Create a separate ChatCut test project from this clip, keep its first five
> seconds with the original audio and dimensions, and give me the editable
> project and an MP4. Do not generate media or transcribe it for this test.

Use a clip at least five seconds long. Read
[asset-import](../grok/skills/asset-import/SKILL.md),
[verification](../grok/skills/verification/SKILL.md), and
[export](../grok/skills/export/SKILL.md) before the corresponding steps.

1. Confirm the selected media's bytes are readable on the computer doing the
   upload, or use an accessible asset already in the target project. A chat
   attachment or a laptop path does not prove cloud-computer access. Bundled
   upload helpers need Node.js 18+, `ffmpeg`, and `ffprobe` on that computer.
2. Create the requested project or use the explicitly targeted one. Wait for
   imported media readiness; preserve prior user work.
3. Build and trim the real ChatCut timeline. Read back the resulting duration,
   source offset, asset references, and audio state. Keep the result editable.
4. Inspect the composed preview and open the returned editor link. Verify the
   intended timeline is actually selected before export.
5. Follow the export skill's `submit_export` / `track_export` flow. Browser
   export saves to the rendering computer's downloads; it does not return a
   `downloadUrl`. Deliver the actual saved file or the truthful retrieval step
   supported by that host. A Grok cloud path is not a path on the user's laptop.
6. Confirm the editable project can be reopened and the MP4 is accessible with
   the expected duration and audio. If either is blocked, report partial
   completion and preserve the project for continuation.

Do not substitute a video flattened outside ChatCut for the requested editable
project. Do not run paid generation to prove setup; keep any required payment or
generation consent tied to the actual requested action.

## Report the outcome accurately

Return the host and route used, visible plugin version if available, OAuth state,
authenticated-read result, skill availability, project/editor link, edit
verification, and actual export delivery. Separate a loaded reference document
from an installed skill. For a blocker, give the exact screen or control, the
minimum human action, and what can resume afterward.

Do not label a source checkout, endpoint response, another host's test, or an old
candidate's acceptance as a current Grok installation pass.

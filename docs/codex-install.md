# Codex installation and first creation

Read this guide before changing the user's setup. Preserve existing plugins,
projects, requests and media. Finish at the user's intended outcome: a setup
request stops after verified connection; a creation request continues into
the selected scenario and project. Do not force a new chat when tools already
work in the current one.

## Identify the package and surface

| Source | Package | Runtime | Starting Skill |
| --- | --- | --- | --- |
| This Git marketplace, `codex/` | `chatcut@chatcut-inc` | Hosted `chatcut`, ChatCut Web | `start-chatcut-creation` |
| This Git marketplace, `chatcut-desktop-codex-plugin/` | `chatcut-desktop@chatcut-inc` | Instructions only; the signed Desktop app supplies `chatcut_desktop` | `start-chatcut-desktop` |
| OpenAI public directory | Identify the actual installed plugin ID and release | Inspect the published package; do not infer from “ChatCut” or a version number | Use the Skills actually included in that release |

The two repo packages are alternatives, not dependencies. Default to the
user's existing or explicitly chosen surface. If both are available and the
request does not identify one, ask whether to work in the existing Web or
Desktop project. Never silently migrate a project or install another package.
An old public `chatcut-desktop` cache containing hosted editing playbooks is
not the same artifact as this directory's Desktop setup-only package.

This guide uses production connections. A private PR Preview, custom home
extension, or test package is not a public installation target. The repository
route does not give users an unpublished custom sidebar or automatic draft
bridge. It can provide scene discovery and creation through ordinary chat and
the existing project editor.

## Entry prompts

Chinese:

> 阅读 https://chatcut.io/chatgpt，先检查我已有的 ChatCut 连接，保留已安装插件。按我选择的 Web 或桌面版完成设置，然后帮我选择创作场景并继续。若必须换新对话，请带上我的需求、项目和素材信息。

English:

> Read https://chatcut.io/chatgpt, check my existing ChatCut connection, and preserve installed plugins. Set up my chosen Web or Desktop route, then help me choose a creation scenario and continue. If a new chat is needed, carry over my brief, project, and media references.

These are ordinary prompts; goal mode is optional. Preserve any more specific
request or attachments that accompany them. Do not replace the request with a
generic “first video” prompt.

## Check the current host before installation

Use the host's current plugin inventory and available tool list first. A local
terminal's installation is not evidence that a remote conversation or the
desktop app uses the same configuration.

- **Codex on the user's computer:** use its own CLI and configuration. In the
  desktop app, locate its bundled CLI, verify `--version` and `plugin --help`,
  and use that exact binary below; do not assume a path or use a different
  global CLI to repair it. In a standalone CLI session, use that session's CLI.
- **Web/cloud conversation:** do not install into a remote filesystem and
  claim the user's desktop is connected. Use a ChatCut connection already
  exposed by that host when supported; otherwise provide the matching desktop
  install prompt and a continuation with the actual brief. Do not promise that
  a repo marketplace or local Desktop app is accessible from the cloud.
- **Managed agent inside ChatCut Desktop:** retain its app-private,
  project-pinned tools and Skills. Do not install this package into that home.

Here, `<CODEX>` means the verified CLI for the chosen host, quoted when its
path contains spaces. Git must also be available to that process. If a command
is unsupported, use the host's documented plugin UI or report that limitation;
do not patch internal caches or install an unrelated runtime to imitate it.

## New repo installation

Only do this when the user chose the repo route and no equivalent existing
connection already meets the task. Retain any public directory plugin.

```sh
"<CODEX>" plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git --ref main
"<CODEX>" plugin list --marketplace chatcut-inc --json
```

Check that the returned source paths match the table. Install **one** choice:

```sh
# Hosted ChatCut Web
"<CODEX>" plugin add chatcut@chatcut-inc --json

# OR: instructions for connecting the signed ChatCut Desktop app
"<CODEX>" plugin add chatcut-desktop@chatcut-inc --json
```

For Web, inspect `mcp get chatcut --json` and complete `mcp login chatcut` only
when authentication is needed. The intended URL is
`https://api.chatcut.io/api/external-mcp/mcp`; retain the package's surface and
version headers. Never retarget an existing custom endpoint implicitly.
For Desktop, run the packaged connection Skill; it validates and opens the
official app and lets that app register its local tools. There is no hosted
OAuth step in the pure Skill package.

If a step fails, retain the original error, package identity and failed stage.
Diagnose that stage before retrying. Do not loop through login, reinstall,
restart, or provider changes. Do not print credentials or replace the user's
whole configuration. Host access restrictions are not a reason to try a
different path to the same denied operation.

## Already installed

If tools and the necessary Skills are already available, reuse them and start
the creation flow. A capability catalog request is not an installation failure.

For a repo installation whose user requested an update:

```sh
"<CODEX>" plugin marketplace upgrade chatcut-inc
"<CODEX>" plugin list --marketplace chatcut-inc --json
"<CODEX>" plugin add <the-same-plugin-name>@chatcut-inc --json
```

Compare the installed version, source and enabled state afterward. Refreshing
marketplace metadata alone does not prove that the running conversation loaded
new Skills. Do not uninstall first. Continue the current conversation if its
tools work; if the host still has the previous package loaded, use its supported
refresh/reopen path and preserve the brief once.

For a public-directory installation, use that exact entry's supported update
flow. A Git `main` merge or local repo install does not update the directory
release, and installing a same-named repo package creates another source rather
than migrating that entry. Do not remove the public plugin or promise a silent
upgrade. Public Skill/metadata updates require a new ZIP and the applicable
platform checks/review and publication. First compare the current published
release ZIP with the proposed source; never downgrade based on matching names.

## From connection into creation

The manifests declare an optional `extensions.com.openai.onboardingSkill`.
Hosts that support it can offer setup after installation. Verify this in the
target host before claiming the button works. The named starting Skill and
default prompt remain explicit entry points on other supported versions.

1. Check live tool availability, not only installed/enabled state. For Web use
   `list_projects`; for Desktop use `get_active_project`. A request to browse
   capabilities alone should not create an empty project.
2. Preserve a concrete brief; otherwise offer three to five relevant scenarios
   with outcomes and required input. Use attached built-in Skills and the live
   `manage_skill` catalog as separate sources, fetch the chosen current package,
   and use the exact returned ID. A supplied shared ID goes directly to `get`.
3. For a creation request, create or target the intended project, show the
   actual returned editor/window entry, and keep the exact project ID through
   subsequent operations. Reuse a form-prepared or previously created project.
4. Inspect project assets before importing again. Use Hosted import for Web
   and Desktop's local import contract for Desktop; retain asset IDs, names
   and actual readiness. A topic-only scenario requires no attachment.
5. Continue the selected Skill with only actual user/form fields. Verify an
   editable result, then use the matching export workflow when requested.
   Preserve the original failure and completed work when a required generation
   tool or model is blocked; do not switch models to conceal it.

If current tools are absent after setup, use the packaged starting Skill's
continuation format. One new chat may be necessary; never create it repeatedly.
Only create a new task when the user authorized it and the host supports it;
otherwise give one copyable prompt. Attachments do not automatically cross
chats: carry project asset IDs or accessible same-machine source references,
and explicitly identify anything that must be attached again.

## Acceptance and release boundaries

Check new install, existing repo update, public-directory install, missing
tools in the current conversation, and Web/Desktop separately. For each,
record exact package/source/version, host version and the furthest observed
stage: installation, authentication, Skill discovery, scenario selection,
project opening, media import, editable result, export and reopening.

An isolated CLI installation or package check proves package discovery, not
native setup invocation, OAuth, editor visibility or creative execution. A
Desktop source-code check does not prove a released Desktop app has the same
capabilities. Record the required account/host/manual step for any unverified
stage. Keep existing public installs untouched during isolated package QA.

Official references (checked 2026-10-23):

- [Repository marketplaces and package structure](https://developers.openai.com/plugins/build/plugins)
- [Optional onboarding Skill](https://developers.openai.com/plugins/build/plugins#add-an-onboarding-skill)
- [Public updates and the skills-only to MCP restriction](https://developers.openai.com/plugins/deploy/submission)

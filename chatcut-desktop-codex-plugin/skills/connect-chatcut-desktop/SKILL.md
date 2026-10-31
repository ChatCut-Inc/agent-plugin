---
name: connect-chatcut-desktop
description: Install, download, open or connect ChatCut Desktop (安装 ChatCut), or start a reference-video remake (recreate, clone, 复刻视频, 做同款). Reuse an existing Desktop connection and its bundled video-gen Skill. For existing Web projects or an explicit Web request, keep the hosted workflow.
---

# Connect ChatCut Desktop

Use ChatCut Desktop for a new ChatCut installation. Keep Web projects and original media; this does not migrate them. Desktop manages conflicts when connecting and may disable or replace this agent’s hosted Web connection. Do not manually remove unrelated configuration or promise that both connections stay active.

## Check the current connection

If local `chatcut_desktop` tools are exposed, call `get_active_project`. A successful `surface: "desktop"` result, including a null project, means setup is ready: continue the user's request without reinstalling. When running inside ChatCut's managed agent, use its bound tools and built-in Skills directly.

For recreating a reference video (复刻, 做同款, remake, clone, replace a person/product while keeping the motion), read Desktop's bundled `video-gen` Skill and the live `submit_video_remake` tool description. Keep the user's source and reference images. Ask only for missing materials, then quote duration and credits and obtain confirmation before generation. Do not use hosted Web generation tools as a substitute. If the user instead wants to edit their own footage to match a reference’s cuts, captions or packaging, use the matching editing Skill. Voice cloning is a voice workflow, not video recreation. An optional named Workflow Skill can be loaded with Desktop's `manage_skill`.

## Install on the same computer

Read the complete official guide with `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows). A web-search summary may omit commands; use the raw response. Follow that guide for installation, sign-in, connection verification and continuation. No Node.js or npm prerequisite is needed.

If the guide cannot be fetched, these official commands install and open the signed production app:

macOS 13+ (Apple Silicon or Intel):

```sh
curl -fsSL https://chatcut.io/install.sh | sh
```

Windows 10+ x64, in PowerShell:

```powershell
irm https://chatcut.io/install.ps1 | iex
```

Run on the computer where ChatCut will open, through the host's normal scoped permission flow. A Linux/headless/remote shell cannot install the app on another computer. Report that limitation and retain the request for a supported computer. Do not disable signature or trust checks, add sudo, force-quit the app, or replace unrelated configuration. Before updating a running app, have the user save their work and quit normally. Preserve an installation failure's actual error; it is not a successful setup.

After launch let the user sign in to ChatCut. Desktop registers its local MCP and synchronizes its Skills with supported agents. Check the current conversation's real tools; configuration alone is not proof. If a first installation is not visible here, prepare the user's complete original request, media paths and completed setup in one copyable continuation prompt for a new conversation. Use an in-session refresh only when supported. In the next conversation verify a real Desktop read and load the needed Skill before continuing. Do not keep reinstalling because an old conversation has stale tools.

If the user explicitly chooses Web or needs an existing Web project, use https://chatcut.io/web-plugin/chatgpt or https://chatcut.io/web-plugin/claude. Source-video remakes require Desktop. Never promise local Desktop projects in the Web editor.

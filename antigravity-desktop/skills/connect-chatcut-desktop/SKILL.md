---
name: connect-chatcut-desktop
description: "Install, open or connect ChatCut Desktop in Antigravity (安装 ChatCut), or start editing or recreating a video with it: edit or cut a video, add captions or subtitles, clean up a talking-head recording, add B-roll, music or motion graphics, or recreate a viral or reference video with the user's own footage (剪视频、加字幕、剪口播、复刻爆款、复刻视频、做同款). Reuses an existing chatcut_desktop connection and Desktop's own Skills."
---

# Connect ChatCut Desktop

This plugin uses ChatCut Desktop only: a signed app on the user's computer that provides the local `chatcut_desktop` MCP server and its own Skills. It does not connect ChatCut Web. Existing Web projects stay in the ChatCut Web editor; Desktop does not migrate them.

## 1. Check the current connection

If `chatcut_desktop` tools are available in this conversation, call `get_active_project`. A result with `surface: "desktop"` means Desktop is installed and connected, even when `projectId` is null. Make sure Desktop's Skills are visible (step 4), then continue the user's request without reinstalling. If it reports `signedIn: false`, local work still runs; ask the user to sign in in the ChatCut window when an account action needs it.

## 2. Install Desktop on this computer

Confirm that commands run on the user's own macOS 13+ or Windows 10+ x64 computer with a graphical desktop. A Linux, headless or remote shell cannot install the app on another computer: explain that and keep the request for a supported computer.

Read the complete official guide with `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows). Follow it for installation and sign-in, and run its installer with this plugin's install source:

macOS:

```sh
curl -fsSL https://chatcut.io/install.sh | CHATCUT_INSTALL_SOURCE=antigravity_marketplace sh
```

Windows PowerShell:

```powershell
$env:CHATCUT_INSTALL_SOURCE='antigravity_marketplace'; irm https://chatcut.io/install.ps1 | iex
```

The download is about 740 MB; tell the user before it starts. Wait for the command to finish. Do not add sudo, disable signature or trust checks, force-quit ChatCut, or automate the Desktop UI. Before updating a running app, have the user save and quit it normally. A failed install is not success: report its actual error.

The installer does not register Antigravity. Lines about agent MCP setup failing, or a list of other agents, do not decide Antigravity's connection: continue with step 3. Let the user finish sign-in in the browser and ChatCut window; do not wait for it before step 3.

## 3. Register `chatcut_desktop` in Antigravity

Until ChatCut Desktop registers Antigravity itself, do this once, after explaining it and getting the user's agreement:

1. Check that Desktop's launcher exists: macOS `$HOME/Library/Application Support/ChatCut/chatcut-mcp`, Windows `%APPDATA%\ChatCut\chatcut-mcp.cmd`. If it is missing, Desktop has not finished its first launch: ask the user to open ChatCut, then check again. Never create or edit the launcher.
2. Run `agy mcp list`. If `chatcut_desktop` already points at that launcher, keep it. If it points somewhere else, show the user and agree on replacing it first, because `agy mcp add` overwrites an entry with the same name.
3. Register it with the expanded absolute launcher path:

   ```sh
   agy mcp add --env CHATCUT_MCP_CLIENT=antigravity chatcut_desktop "$HOME/Library/Application Support/ChatCut/chatcut-mcp"
   ```

   On Windows use the expanded `%APPDATA%\ChatCut\chatcut-mcp.cmd` path. `agy mcp add` writes `~/.gemini/config/mcp_config.json` and keeps other servers. Without `agy`, back up that file and merge `{"mcpServers":{"chatcut_desktop":{"command":"<launcher path>","env":{"CHATCUT_MCP_CLIENT":"antigravity"}}}}` by hand, preserving every other entry. Treat an empty file as `{}`; stop and report other invalid JSON instead of overwriting it.

Do not add a ChatCut Web server.

## 4. Make Desktop's Skills visible

Desktop keeps its Skills in `~/.agents/skills/chatcut-*` and lists them in `~/.agents/skills/.chatcut-desktop-skills.json`. Antigravity reads global Skills from `~/.gemini/config/skills`, and does not follow a `skills.json` that points elsewhere. Link each Desktop-managed Skill there. Re-run this after Desktop updates; it only touches links that point into Desktop's folder.

macOS:

```sh
src="$HOME/.agents/skills"; dst="$HOME/.gemini/config/skills"; manifest="$src/.chatcut-desktop-skills.json"
[ -f "$manifest" ] || { echo "ChatCut Desktop has not synced its Skills yet; open ChatCut and retry."; exit 1; }
mkdir -p "$dst"
for dir in "$src"/chatcut-*/; do
  name=$(basename "$dir"); link="$dst/$name"
  [ -f "$dir/SKILL.md" ] && grep -q "\"$name\"" "$manifest" || continue
  if [ -L "$link" ]; then
    case "$(readlink "$link")" in "$src"/*) ;; *) echo "kept $link"; continue ;; esac
  elif [ -e "$link" ]; then echo "kept $link"; continue; fi
  ln -sfn "$src/$name" "$link"
done
for link in "$dst"/chatcut-*; do
  [ -L "$link" ] && [ ! -e "$link" ] && case "$(readlink "$link")" in "$src"/*) rm "$link" ;; esac
done
ls "$dst"
```

Windows PowerShell (junctions need no administrator rights):

```powershell
$src = Join-Path $HOME '.agents\skills'; $dst = Join-Path $HOME '.gemini\config\skills'
$manifest = Get-Content (Join-Path $src '.chatcut-desktop-skills.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force $dst | Out-Null
foreach ($name in $manifest.entries.PSObject.Properties.Name) {
  $target = Join-Path $src $name; $link = Join-Path $dst $name
  if (-not (Test-Path (Join-Path $target 'SKILL.md'))) { continue }
  if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.LinkType -ne 'Junction' -or -not ([string]$item.Target).StartsWith($src)) { "kept $link"; continue }
    $item.Delete()
  }
  New-Item -ItemType Junction -Path $link -Target $target | Out-Null
}
Get-ChildItem $dst
```

## 5. Load the tools and verify

Refresh MCP servers: App → Settings (**Cmd+,** / **Ctrl+,**) → Customizations → Installed MCP Servers → refresh, or `/mcp` in the CLI. Then check this conversation's tools again before asking for anything else.

- If `chatcut_desktop` tools are now available, call `get_active_project` here. A null project is a valid connection. Continue the user's request in this conversation.
- If they are not, Skills and MCP tools load when a conversation starts. Ask the user to start a new Antigravity conversation and give them one copyable prompt in a single `text` code block, in their language and voice. Keep setup details, file paths and status outside the block.

Report separately what is done and what is not: Desktop installed, launcher present, `chatcut_desktop` registered, Skills linked, tools visible in this conversation, a real tool read. A configuration change or installer success is not a tool read.

The copyable prompt carries the user's original request and media paths when they have one. When they do not, use:

```text
ChatCut Desktop is installed on this computer. Please check that you can use ChatCut, then help me start creating.

Introduce how you can help me in these three areas:
1. Video editing.
2. Motion graphics creation.
3. Asset generation: images, videos, voiceovers, music and sound effects.

Ask what materials I have and what kind of video I want to make, then guide me step by step based on my answers. Also let me know that I can open ChatCut Desktop at any time to adjust the timeline, captions and motion graphics myself.
```

## 6. Work in Desktop

After a successful read, load the matching Desktop Skill (`chatcut-*`) for the task and follow it; the live tool descriptions own parameters. For a source-video remake (复刻, 做同款, remake, clone, replace a person or product while keeping the motion), load `chatcut-video-gen` and read `submit_video_remake`; ask only for missing materials, then quote duration and credits and get confirmation before submitting. Editing the user's own footage to match a reference's cuts, captions or packaging is an editing task, not a remake. Voice cloning belongs to the voice Skill. A named or shared Workflow Skill is loaded with `manage_skill`.

Delivery happens in the ChatCut Desktop window. If a feature needs membership or credits, follow the guide's billing step; opening billing is not permission to buy.

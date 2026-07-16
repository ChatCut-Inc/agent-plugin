# Claude Code install instructions — ChatCut

This installs the ChatCut plugin from the public marketplace repository:

`https://github.com/ChatCut-Inc/agent-plugin.git`

The example uses the `main` Git ref.

## Host environment gate

First determine whether this conversation is running inside the Claude Code
desktop app (or a Claude Code CLI terminal) on the user's local machine, or in
a web/remote workspace (claude.ai on the web, a cloud/remote sandbox, an
isolated CI runner).

If you are in a web or isolated remote workspace, stop before running install
commands. That environment cannot modify the local machine's `~/.claude`
plugin directory, so it cannot install or configure ChatCut for the desktop
app. Tell the user to open the Claude Code desktop app on the machine where
they want to edit videos, start a new conversation there, and paste the
install prompt matching their conversation language. For any other language,
use the English prompt.

English:
`Read chatcut.io/claude to install the ChatCut plugin and set up a new task for me.`

Chinese:
`阅读 chatcut.io/claude，帮我安装 ChatCut 插件并创建一个新任务。`

If you are inside the Claude Code desktop app on the user's local machine,
continue with this guide. The full editing experience (live editor in the
in-app Browser pane) needs the desktop app; a plain terminal `claude` session
can install and authenticate the plugin, but the full guided editing workflow
requires Claude Code Desktop's Browser pane. In terminal-only sessions, give the
clean editor link and tell the user to open it manually.
If you are not sure, ask the user before running commands.

## Agent execution contract

If you are a Claude Code agent reading this for a user, read this whole guide
before running commands. Do not stop after install, login, or verification.

Required order:

1. Complete the Host environment gate. In a web/remote workspace, stop there
   and send the user to the desktop app with the install prompt.
2. Install, log in, and verify the ChatCut plugin.
3. Complete the Required final step: open the user's first editing
   conversation.
4. Setup is incomplete until you print one required self-report from the
   final step.

Run the commands yourself when the user has asked you to set up ChatCut; do
not only describe them.

## Prerequisites

Verify the Claude Code CLI is available and recent enough (plugin marketplace
support ships in Claude Code 2.x):

```bash
claude --version
```

If `claude` is not on PATH, locate the CLI bundled with the Claude desktop
app before installing anything new. On macOS it lives under
`~/Library/Application Support/Claude/claude-code/<version>/claude.app/Contents/MacOS/claude`
(pick the newest `<version>`); on Windows look for the `claude-code`
runtime under the Claude desktop app's data directory (`%LOCALAPPDATA%`).
Use that full quoted path in place of `claude` in every command below. Only
if no bundled CLI exists either, ask the user before installing the CLI from
the official installer.

Git must be reachable from the shell that runs the marketplace command:

```bash
git --version
```

## Install

Add the marketplace:

```bash
claude plugin marketplace add https://github.com/ChatCut-Inc/agent-plugin.git
```

If this or another network step fails with a timeout, connection reset, TLS,
DNS, or proxy error, retry through the user's local HTTP(S) proxy if one is
running. Read the system proxy first (macOS: `scutil --proxy`); common local
proxy ports include 7890, 7897, 1080, 8080, and 8888. For example set both
`HTTPS_PROXY` and `HTTP_PROXY` to `http://127.0.0.1:7897`, rerun the failed
command, and do not leave a bad proxy configured after testing.

The marketplace registers as `chatcut-inc`. Confirm and install:

```bash
claude plugin marketplace list
claude plugin install chatcut@chatcut-inc
```

Do not start a new conversation yet. Complete login and verification first.

## Log in

Authenticate the ChatCut MCP server (Claude Code namespaces plugin servers as
`plugin:<plugin>:<server>`):

```bash
claude mcp login plugin:chatcut:chatcut
```

This opens the ChatCut OAuth page in the user's browser and finishes on the
localhost callback; the user may need to sign in to chatcut.io and click
approve there.

`claude mcp login` needs an interactive terminal. If it fails with "stdin
isn't a terminal" (typical when an agent runs it through a shell tool), run
it under a pseudo-TTY instead — this variant is verified to complete the same
browser flow:

```bash
CLAUDE_BIN="${CLAUDE_BIN:-claude}" python3 - <<'PY'
import os, pty, select, signal, sys, time
claude = os.environ.get("CLAUDE_BIN", "claude")
pid, fd = pty.fork()
if pid == 0:
    os.execvp(claude, [claude, "mcp", "login", "plugin:chatcut:chatcut"])
end = time.time() + 180
status = None
while time.time() < end:
    r, _, _ = select.select([fd], [], [], 1)
    if r:
        try:
            data = os.read(fd, 4096)
        except OSError:
            break
        if not data:
            break
        os.write(1, data)
    done, code = os.waitpid(pid, os.WNOHANG)
    if done:
        status = code
        break
if status is None:
    os.kill(pid, signal.SIGTERM)
    _, status = os.waitpid(pid, 0)
sys.exit(os.waitstatus_to_exitcode(status))
PY
```

Set `CLAUDE_BIN` to the full CLI path when `claude` is not on PATH. This
pseudo-TTY wrapper is macOS/Linux-only; on Windows, ask the user to run
`claude mcp login plugin:chatcut:chatcut` themselves in an interactive
PowerShell window instead. Tell the user a browser window will open for
ChatCut sign-in before you run it, wait for "Authenticated" in the output,
and treat a non-zero exit as a failed login.

## Verify

```bash
claude mcp get plugin:chatcut:chatcut
claude plugin details chatcut@chatcut-inc
```

Expected: the server shows `Status: ✔ Connected` with URL
`https://api.chatcut.dev/api/external-mcp/mcp`, and the plugin inventory lists
15 skills plus 1 MCP server. If the server shows "Needs authentication",
rerun the login step. If the plugin is missing, rerun
`claude plugin marketplace list` to confirm the marketplace name and
reinstall with that exact name.

## Required final step: open the user's first editing conversation

REQUIRED: the current installation conversation CANNOT reach the newly
installed ChatCut tools — Claude Code captures a session's plugins and MCP
tool list at session start. Do not attempt ChatCut tool calls here; they will
fail. A brand-new conversation is mandatory, and you are not finished until
you have either created a one-click handoff to it or handed the user the
exact startup prompt.

Resolve `startupPromptLanguage` from the user's actual conversation language,
not the operating system language, and do not ask. Use the matching prompt
below verbatim; for any other language, translate the English one.

Chinese:
`ChatCut 插件已经安装好了，请你用 Claude Code 的内置浏览器面板打开一个 ChatCut 项目，把项目名称命名为"我的第一个ChatCut视频"，然后先告诉我你整体可以做什么，尤其是这三部分：视频剪辑（语音清理、字幕、转场、补充素材等）、MG 动画制作、素材生成（视频、旁白、音乐、音效等）。之后问我有什么素材、想做什么样的视频，告诉我你可以根据我的具体需求一步步开始制作，并且我也可以随时在内置浏览器的 ChatCut 编辑界面里自己调整时间线、字幕、MG 动画等任何内容，就像使用传统编辑器一样。`

English:
`The ChatCut plugin is already installed. Please use Claude Code's in-app Browser pane to open a ChatCut project, name the project "My First ChatCut Video", then first tell me an overall view of what you can do, especially these three parts —— video editing (speech cleanup, captions, transitions, b-roll, etc), motion graphics creation, assets generation (video, voiceover, music, sound effects, etc). After that, ask me what materials I have and what kind of video I want to make. Tell me you can start making it step by step based on my specific needs and that I can also hop into the ChatCut editor in the Browser pane anytime and adjust things by myself — timeline, captions, motion graphics, anything — just like a traditional editor.`

Spanish:
`El plugin de ChatCut ya está instalado. Usa el panel de navegador integrado de Claude Code para abrir un proyecto de ChatCut, nombra el proyecto "Mi primer video de ChatCut" y luego primero dame una visión general de lo que puedes hacer, especialmente estas tres partes: edición de video (limpieza de voz, subtítulos, transiciones, b-roll, etc.), creación de motion graphics y generación de recursos (video, voz en off, música, efectos de sonido, etc.). Después pregúntame qué materiales tengo y qué tipo de video quiero crear. Dime que puedes empezar a crearlo paso a paso según mis necesidades y que también puedo entrar en el editor de ChatCut dentro del navegador integrado en cualquier momento para ajustar la línea de tiempo, los subtítulos, los motion graphics o cualquier otro elemento, igual que en un editor tradicional.`

Claude Code hosts — do these IN ORDER:

1. HANDOFF CHIP. If a task-spawning tool is available in this session (for
   example `spawn_task` on the Claude Code desktop session server), call it
   once with title "My First ChatCut Video" (localized to
   startupPromptLanguage) and the resolved startup prompt as the new
   session's prompt. This creates a one-click chip; the new session starts
   only when the user clicks it, so tell the user to click the chip to begin.
2. FALLBACK — if no such tool exists or the call errors, print the resolved
   startup prompt in a copyable block and tell the user: open a NEW Claude
   Code conversation (this one cannot use ChatCut) and paste it there.

Required self-report (print exactly one before ending your turn):

- (A) "Created a one-click handoff — click the chip to start your first
  ChatCut conversation." Include the chip/session title. In the user's
  language, also explain that this installation conversation cannot use
  ChatCut and the new conversation is where editing happens. Report (A) only
  if the spawn call actually succeeded.
- (B) "Could not create the handoff automatically" — give the paste-in
  prompt, state which tool was unavailable or which call failed, and tell the
  user to paste it into a new conversation.

Completion gate: do not tell the user ChatCut is installed or setup is
complete until you printed report (A) or (B). Never claim a new conversation
was started — in Claude Code the user always triggers it (chip click or
paste).

## What the first conversation should do

For reference (this happens in the NEW conversation, driven by the plugin's
skills): the agent creates/targets the project, then opens the returned
`browserHandoff.url` in the in-app Browser pane (`Claude_Browser` MCP tools,
e.g. `preview_start {url}`), preserving the returned one-time
`editor-boot-token` (it signs the editor in automatically). Do not add
`theme=codex` or invent Codex-only workbench parameters for Claude Code URLs;
manual file drops and import buttons must stay usable in the Claude Code pane.
The
Browser pane asks the user to approve the ChatCut origin once. The user
watches imports, transcription, and timeline edits live in that pane and can
edit manually there at any time.

## Update

To refresh later:

```bash
claude plugin marketplace update chatcut-inc
claude plugin update chatcut@chatcut-inc
```

Then restart Claude Code (or start a new conversation) and rerun the
verification commands above.

# Desktop App & Agent Plugin

## Download and Install ChatCut Desktop

Use the download entries in the ChatCut web editor so the user gets the release channel that matches their current environment:

1. Click the profile icon in the top-right corner.
2. Open **Desktop App**.
3. Choose **Download** beside **macOS version**.
4. Open the downloaded DMG and follow the macOS installation prompts.

The Windows version is still being optimized and is not available for download yet.

### Localized UI Labels

Use the column matching the editor's `interface locale` when naming visible controls.

| UI name         | English         | 中文          | Español                  |
| --------------- | --------------- | ------------- | ------------------------ |
| Desktop App     | Desktop App     | 桌面应用      | Aplicación de escritorio |
| Agent Plugin    | Agent Plugin    | Agent 插件    | Plugin del agente        |
| ChatGPT/Codex   | ChatGPT/Codex   | ChatGPT/Codex | ChatGPT/Codex            |
| Download        | Download        | 下载          | Descargar                |
| macOS version   | macOS version   | macOS 版本    | Versión para macOS       |
| Windows version | Windows version | Windows 版本  | Versión para Windows     |
| Copy            | Copy            | 复制          | Copiar                   |

## Install the ChatCut Agent Plugin

The ChatCut Agent Plugin connects ChatGPT/Codex or Claude Code to ChatCut projects. Prefer the in-product installation flow:

1. Click the profile icon in the top-right corner.
2. Open **Agent Plugin**.
3. Click **Copy** beside **ChatGPT/Codex** or **Claude Code**.
4. On the computer where the user wants to edit, open the ChatGPT/Codex or Claude Code desktop app or CLI, paste the copied installation prompt into a session, then send it.
5. Let that agent read the official guide, install the plugin, open the ChatCut authorization page, and verify authentication.
6. After installation succeeds, start a new session before asking the agent to use ChatCut; plugin tools are loaded when a session starts.

If installation through the copied prompt does not succeed, try the manual installation tutorial for the selected host:

- ChatGPT/Codex: `https://chatcut.io/chatgpt-plugin`
- Claude Code: `https://chatcut.io/claude-code-plugin`

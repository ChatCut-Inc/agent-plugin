---
name: chatcut-connect
description: Connect to ChatCut via MCP, ensure authentication, list projects, and report them with clean editor links. Use when the user asks to connect ChatCut, list ChatCut projects, authenticate ChatCut MCP, or any combination like "连接 ChatCut 并列出我的项目". Delegates editor opening to the chatcut-editor-handoff skill.
---

# ChatCut Connect (Kimi Work)

Handle ChatCut MCP authentication and project discovery. Load `chatcut-plugin-basics-kimi-work` first if it has not been loaded this conversation. Keep user-facing output in the language of the request.

## Workflow

1. **Try listing first — do not check the tool list or assume the tool is missing.** Call the ChatCut `list_projects` tool directly. If it returns projects, skip authentication and go to step 4.
2. **Authenticate if needed.** If the list call fails due to missing/invalid authentication, call the ChatCut `authenticate` tool.
   - The tool blocks waiting for a browser OAuth callback.
   - If it returns an authorization URL, show it to the user verbatim and ask them to open it, sign in, and approve the client.
   - If the OAuth callback times out, present the returned URL again and ask the user to complete authorization; then retry `authenticate`.
   - If the connector was installed from the Kimi Work marketplace but never logged in, the user can also click **Login** on the connector card instead.
3. **List projects.** Once authenticated, call `list_projects`.
4. **Report results.** Present the project list in a table with:
   - Project name
   - Project ID
   - Clean `editorUrl` as a Markdown link (never `browserHandoff.url`)
5. **Open if requested.** If the user asked to list projects **and** open in the in-app browser in the same request (e.g., "用内置浏览器列出我的项目"), immediately load and follow the `chatcut-editor-handoff` skill for the most recent project.
6. **Handle follow-up open.** If the user later says "用内置浏览器打开" / "在内置浏览器打开" without naming a project, load and follow the `chatcut-editor-handoff` skill and open the most recently listed project.

## Never

- Do not build or guess editor URLs yourself; always use URLs returned by ChatCut MCP tools.
- Do not show `browserHandoff.url` or URLs containing `editor-boot-token` in Markdown links or text.
- Do not auto-open the editor from a pure listing request unless explicitly asked. (Creating or targeting a project for visible editing work is different — that follows the handoff rules in `chatcut-plugin-basics-kimi-work`.)

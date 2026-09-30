---
name: chatcut-editor-handoff
description: Open a ChatCut project editor in the Kimi Work in-app browser with automatic login, keep one editor tab per session, and show only clean links to the user. Use whenever a ChatCut tool result carries browserHandoff, when the user says "用内置浏览器打开" a ChatCut project, or before long-running visible editing work.
---

# ChatCut Editor Handoff (Kimi Work)

Open the live ChatCut editor in the in-app browser so the user can watch edits land in real time and edit manually themselves. Uses the native `InAppBrowser` tool — see the `in-app-browser` skill for the full action reference.

## When to open

- **Before the first project-mutating operation of the session** (create, edit, captions, import, timeline changes) — open by default, without being asked. Editing with the editor closed is a broken experience.
- A ChatCut tool result includes `browserHandoff` (especially `required: true`) or a live project/editor URL, and the project was just created or targeted for visible editing work.
- The user explicitly asks to open a project in the in-app browser.
- Before long-running visible work (import, transcription, generation, timeline assembly) when the editor is not already open on the current project.

Pure discovery (`list_projects` only, no follow-up work) does not auto-open.

Do not re-open on every turn; the editor is live-synced, so an already-open tab shows new edits without any reload.

## How to open

1. Choose the URL: `browserHandoff.url` when present (it carries `editor-boot-token`, which auto-logs the in-app browser into the same account as the MCP connector); otherwise the returned `editorUrl`. Preserve all query parameters. Never rewrite or hand-build editor URLs.
2. Localize the path by conversation language: Chinese → insert `/zh/` after the editor site domain; otherwise keep the default. Keep domain, remaining path, query, and hash intact.
3. First open of the session:

```json
{
  "action": "navigate",
  "session": "chatcut",
  "params": { "url": "<handoff-url>", "newTab": true }
}
```

4. Later in the session, reuse the same tab: `find_tab` with the editor URL to re-activate it, or `navigate` with the same `session` and no `newTab`. Keep ONE editor tab per session.

## After opening

- Once the tab reports opened, the handoff is complete. Continue the ChatCut workflow; do not poll the page, take screenshots, or run visual checks just to prove the editor opened.
- ChatCut can take a while on first load of a new project (cold sync). If it visibly sticks on "Loading workspace / Syncing project data" for more than ~20 seconds, `navigate` to the same URL once more — the session cookie is already set and the boot token is multi-use within its TTL.
- If `InAppBrowser` is not available this turn, agent browser control is disabled: present the clean `editorUrl` as a Markdown link instead, and say the user can open it themselves. Do not work around via HTTP or shell.

## Link hygiene (always)

- URLs shown to the user — in tables, Markdown links, or plain text — must be the clean `editorUrl`.
- Never show a URL containing `editor-boot-token`. If only the handoff URL is available, strip the token parameter before display.
- The tokenized URL is only ever passed to `InAppBrowser`.

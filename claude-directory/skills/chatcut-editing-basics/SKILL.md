---
name: chatcut-editing-basics
description: Start here for any ChatCut video editing task with the ChatCut connector (the `chatcut` MCP server). Covers signing in, finding or creating a project, getting the user's media in through an upload link, the edit-and-verify loop, previewing in chat, exporting, and what to do when a tool fails. Load it before the first ChatCut tool call in a conversation.
---

# ChatCut editing basics

ChatCut is a cloud video editor. A project holds timelines (video tracks stacked
above audio tracks) over a media library. Every edit saves to the user's
ChatCut account, and the user can open the same project in the ChatCut editor
at any time.

This plugin edits media the user already has. It does not create new images,
video, voice or music with AI models. When a request needs that, say it is not
available through this plugin and continue with what the project already
contains.

## Sign in

The `chatcut` MCP server uses the host's OAuth sign-in to the user's ChatCut
account. If a tool reports that connector authentication is missing, ask the
user to reconnect ChatCut from the host's connector settings, then retry the
same call. Never ask for passwords or tokens in the conversation.

## Find or create the project

- Existing work: `list_projects`, then `target_project` with the chosen
  `projectId`. Pass that `projectId` on later calls.
- New work: `create_project`, named after the user's request.
- Share the editor link once as a named Markdown link, for example
  `[Open "Interview cut" in ChatCut](editorUrl)`, so the user can return to it.

## Get media in

ChatCut's tools run on ChatCut servers. They cannot read files attached to the
conversation or paths on the user's computer.

1. Call `import_media` for the targeted project.
2. Give the user the returned upload link as a named Markdown link. It works in
   a phone or desktop browser, is single-use and expires after a few minutes;
   create a new one if it expires.
3. When the user says the upload finished, find the new assets with
   `browse_assets`. Audio and video start transcription automatically.

Stock B-roll, photos, music and sound effects: `search_stock_media` finds
licensed results. Show the user the title, license and page link; the user
downloads the file and adds it through the same upload link. ChatCut's built-in
effects, transitions, LUTs and sound effects come from `browse_library` and need
no upload.

## Edit and verify

- Read before you change: `read_project` for the project map, then
  `preview_timeline` and `inspect_item` for the part you will edit.
- Speech-led videos (talking head, interview, podcast, tutorial): load the
  `talking-head-guide` skill. Transcript and captions: `transcription`.
  Motion graphics: `create-motion-graphics`. Several cameras of one take:
  `multicam-sync`.
- Do only what was asked; suggest extras instead of adding them.
- A tool's success response is not proof. Re-read the affected state, and use
  the `verification` and `visual-analysis` skills for anything visible.

## Preview

When `show_preview` is listed, it opens a playable preview of the project in the
conversation. Use it when the user wants to watch the project, or once after you
finish a change they will want to see, not after every tool call. Hosts without
`show_preview` get the editor link instead.

## Export

`submit_export` renders video and audio on ChatCut servers by default. If it
returns a cloud quote, show the duration, free allowance and credits, and
continue only after the user confirms that charge. Check progress with
`track_export`, one read per call; when it completes, give the user
`downloadUrl`. If it is still running, say so and check again when the user
asks. Subtitles export immediately.

## When something fails

Keep the original error and identify the failing step. Follow a recovery hint
in the result once before asking the user. Purchases, credit top-ups and plan
changes are not available through this plugin: if a tool reports insufficient
credits or access, say so plainly and continue with what is available.

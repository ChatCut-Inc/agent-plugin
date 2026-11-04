## Project Onboarding And Editor Handoff

### Establish the target project

Before nontrivial ChatCut work, ensure the agent is operating on the intended project.

"Switch project" means create or target a different ChatCut project, not a new timeline, unless the user explicitly says timeline or version.

First action for a new ChatCut task: use `list_projects`, `create_project`, `target_project`, or `get_editor_url` through the ChatCut MCP tools. Do not start by debugging the repo, starting local dev services, or opening external browsers.

1. If the user asks for a new project, call `create_project` and surface the clean live editor link immediately so the user can open it and watch progress.
2. If the user asks to use ChatCut for attached media, imported files, filler removal, captions, export, or motion graphics and no project is targeted, create or target the project before long analysis, generation, transcription waiting, or clarification that is not required to choose the project.
3. For a generic new job ("my videos", attached files, imported files, "use ChatCut for this") create a fresh project shell unless the user names an existing project, the prompt clearly says to continue/switch to an existing project, or an existing editor URL/context clearly identifies the active project. Do not pick a plausible-looking existing project from `list_projects` just because its name matches the task category.
4. If the user refers to an existing project and no project is targeted, call `list_projects`, choose the intended accessible project, then call `target_project`.
5. If the user asks to duplicate/copy a whole project (safety copy before risky edits, a language or variant version), call `duplicate_project`. It defaults to the currently targeted project. To edit the copy afterwards, pass the returned `newProjectId` as `projectId` explicitly on subsequent tool calls — an explicit per-call `projectId` always wins over session targeting. Pass `activate: false` to keep the source targeted. Owner-only; markers and chat history are not copied. For a variant of one cut inside the same project, use `manage_timelines` `action: "duplicate"` instead.
6. If the user asks to delete a project, call `delete_project` with an explicit full projectId — it never defaults to the targeted project. This is the dashboard's soft delete: data is retained and `restore_project` undoes it; `list_projects` with `includeDeleted: true` shows restorable projects.

### Use the current editor project

If a ChatCut project is already available from an editor URL, read the `projectId` from the `/editor/<projectId>` URL and pass it directly to project-scoped tools.

If `chatcut` asks for authentication or project access, ask the user to re-authenticate ChatCut from Antigravity's Customizations (Authenticate next to the ChatCut MCP server), then retry with the exact `projectId` from the editor URL.

### Open the visible editor

Surfacing the editor link early is part of the user experience: the user can open the NLE, media pool, transcription, generation, and timeline placement while work continues.

`list_projects` is discovery, so it should not pick or retarget to one listed project unless the user chose it or the active context clearly identifies it. Once a specific project is created, targeted, or chosen for visible work, always present the clean project/editor URL returned by the tool as a named link. Do not depend on a preview tool, popup, card, or browser handoff opening automatically.

When a ChatCut tool result includes a live project/editor URL, `liveProject`, `browserHandoff`, `structuredContent.browserHandoff.required=true`, or `browserHandoff.required=true`, use the clean returned `editorUrl` for the user-facing named link. A browser-control capability may additionally open the handoff URL, but that is optional and never replaces sending the clean editor link.

ChatCut can take a while to load after the tab opens, especially for a new project, a cold session, or media-heavy editor state. If the browser-control tool reports that it successfully opened or focused the tab, treat the handoff as complete; do not wait for the page to fully load, keep polling the browser, or perform extra careful visual checks just to prove the editor opened. Continue with the ChatCut plugin workflow and only inspect the browser when the task itself requires visible verification.

Present the clean `editorUrl` as a named link whether or not browser or computer-control tools are available. Preserve all query parameters only in an internal handoff URL when they are needed for opening the browser; do not copy short-lived authentication or editor boot tokens into the user-facing link, and do not replace the returned URL with a guessed generic ChatCut URL.

When sending or opening any editor URL, localize the editor-site path based on the language the user is using. Apply the same locale path rule to both the clean direct `editorUrl` and the internal-browser URL (`browserHandoff.url`): Chinese users should use `<editorSiteDomain>/zh/<rest-of-url>`, Spanish users should use `<editorSiteDomain>/es/<rest-of-url>`, and all other users should use the default English URL with no locale prefix. Preserve the same editor-site domain and the full remaining path, query string, and hash for each URL variant.

Use the exact browser handoff or editor URL returned by the tools. Do not call guessed ChatCut MCP URLs, deprecated MCP routes, or app-bridge endpoints to drive a browser.

### Keep the visible editor aligned

The editor is a live workbench, not a popup-preview contract. Before long-running visible work such as import, transcription waiting, generation, timeline assembly, export preparation, or final visual verification, ensure the clean editor link still targets the latest project id. Internal preview tools remain valid for agent verification, but final delivery must include the clean editor link and must not claim that a preview automatically opened.

### Billing and pricing exception

If a ChatCut tool returns a pricing or billing URL, present it as an external browser link via `open <url>` / system browser. Do not treat billing as an editor handoff.

## Recreating A Viral Video

Requests to recreate, clone, or remake a viral or reference video with the user's own people, product, or footage (复刻爆款、做同款) happen in the ChatCut Desktop app, and generating them needs a membership; this host cannot install it. Say so plainly and give the user https://chatcut.io/viralvideocloner, which has the download and a message they can send to a local agent such as Codex or Claude Code. Keep using the hosted tools for any ordinary editing in the same request. Work only with media the user owns or is licensed to use.

## Connector Boundaries

ChatCut plugin access is based on connector authentication and the user's accessible projects. Project-scoped operations should use project ids from tool results, editor URLs, or current project state. Do not guess hidden ids.

The connector cannot ask the editor UI to pick, relink, upload, export, or capture local files for it unless the current host explicitly exposes that capability. Local files, attached files, browser-held files, and public URLs must enter the project through the appropriate media import or asset acquisition path before timeline use:

- The `asset-import` skill for files the current host can read locally.
- `import_media` for client-held bytes.
- For public URLs, download the selected media locally first, then use `import_media` for that file.

If a local-file upload/import request is denied by host policy or review because it would transfer private file contents to ChatCut's external API, stop the ChatCut workflow immediately. Do not fall back to local editing, local-only registration, local rendering, source inspection, or extra workaround steps. Tell the user permission to upload the file was denied and instruct them to upload the media directly in the ChatCut editor or adjust the host permission.

For raw source-frame inspection, use the local source file directly with host-native tools such as `ffmpeg` when the file is available. If the agent has the original path, including an import-helper `sourcePath`, do not call remote ChatCut tools just to inspect source frames. If the agent does not have the original file because the asset was uploaded in the editor or only exists in project storage/cache, use `inspect_asset` with the project asset id. Hosted frame tools return each rendered frame as a separate temporary image resource link. If the host cannot inspect a signed URL directly, download each complete URL into a temporary folder, then inspect the local files individually or stitch the temporary copies into a contact sheet. Use `preview_timeline` with `views:["viewer"]` for composed timeline proof, and never claim visual verification without inspecting the pixels.

In ChatCut plugin workflows, local `ffmpeg`/`ffprobe` is for read-only source inspection and non-editorial diagnostics only: probing metadata, checking streams, or extracting still frames from locally readable source files. Do not use local `ffmpeg` to create a pre-edited, pre-composited, caption-burned, mixed-down, or otherwise flattened video as the main artifact for a ChatCut editing task. Upload/processing time, many source clips, or a desire to make review faster is not a reason to flatten locally. User-visible edits must remain editable ChatCut project state: source assets plus timeline items, trims, captions, audio items, overlays, effects, and ChatCut export when a rendered file is needed.

Do not assume the browser/editor tab can pick, relink, upload, export, or capture local files as a substitute for connector import/export flows.

ChatCut native internal chat components may not render in every host. Convert those moments into concise ordinary text choices with stable ids mapped internally.

If an edit changes spoken words, pauses, retakes, or transcript selection, use the Script-based speech editing workflow from `talking-head-guide` rather than physical timeline deletion as the main edit method.

When captions are enabled, complete one coherent stage of timeline or transcript work before refreshing them: after batched `apply_script`, `clean_script`, or `manage_transcript` with `action:"fix"` calls, run `edit_captions` with `action:"refresh"` once before caption-specific edits or claiming caption correctness. Do not refresh between individual mutations or when captions are disabled; honor a tool-returned caption-refresh notice at the next completed work boundary.

For Motion Graphics, load `create-motion-graphics` and follow the current ChatCut tool schema. Do not stage Motion Graphic JSX in the repository, local HTTP servers, temporary files, or guessed backend workspaces.

Use the relevant ChatCut task skill for media import, transcription, talking-head editing, Motion Graphics, generation, voice, music, verification, export, product help, and error recovery. Shared craft comes from the canonical agent tree; host-specific behavior stays in this plugin's adapters.

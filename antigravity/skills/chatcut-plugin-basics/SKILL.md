---
name: chatcut-plugin-basics
description: "Use for installing ChatCut (安装 ChatCut), recreating a viral or reference video with the user's own footage (recreate, clone, remake, 复刻爆款, 复刻视频, 做同款), and MANDATORY before hosted ChatCut video editing in Antigravity. Also use whenever video editing should stay editable in ChatCut, even if the user does not mention ChatCut: edit or cut a video (剪视频、剪辑), add captions or subtitles (加字幕), clean up a talking-head recording (剪口播), or add B-roll, music or motion graphics. Default new installations and generic source-video remakes to Desktop; honor user-selected Skills/workflows, existing Web projects and explicit Web requests. Covers hosted connection diagnostics and editing tools."
---

Before using this skill, read [the required continuation](references/editing-and-project-workflows.md) in full. It is part of this skill and contains mandatory workflow, tool-contract, and safety instructions; do not act from this entry file alone.


# ChatCut Plugin Basics

## Choose the ChatCut connection

Honor a user-selected Skill/workflow and its declared execution route first. For a supplied Skill ID or copied Skill command, resolve that Skill before choosing a connection; the Desktop defaults below do not replace the selected workflow or an explicitly chosen Web project.

For “install ChatCut” / 安装 ChatCut, default to Desktop: fetch the complete official guide with `curl -fsSL https://chatcut.io/desktop` (`curl.exe` on Windows) and follow it. It uses the official macOS/Windows installer, with no Node.js/npm prerequisite; run it with this plugin's install source: `curl -fsSL https://chatcut.io/install.sh | CHATCUT_INSTALL_SOURCE=antigravity_marketplace sh` on macOS, or `$env:CHATCUT_INSTALL_SOURCE='antigravity_marketplace'; irm https://chatcut.io/install.ps1 | iex` in Windows PowerShell. Do not manually remove hosted plugins, credentials or projects. Desktop manages conflicts during connection setup and may disable or replace this agent’s hosted connection; Web projects remain separate. First confirm that commands run on the intended macOS or Windows computer with a graphical desktop. Linux and remote agents without access to that computer cannot install Desktop there; carry the request to a local agent on the supported computer.

For recreating a source video (recreate, clone, remake, 复刻视频, 做同款, replace a person or product while retaining the motion), use local `chatcut_desktop` tools. If they are available, verify `get_active_project`, load Desktop's bundled `video-gen` Skill and inspect `submit_video_remake`; continue with the user's materials and confirm duration/credits before generation. A null project is a valid connection. No separate marketplace Skill is required. If the user means editing their own footage to match a reference’s cuts, captions or packaging, use the matching editing Skill instead. Do not apply the generative remake route to voice cloning or ordinary edits to an existing Web project.

If Desktop is missing and the user has only requested a remake, explain once that it needs ChatCut Desktop and membership, and offer to install it. On agreement follow the same Desktop guide, retaining all materials and instructions. If a web tool cannot fetch the full guide, use curl. If the guide is unreachable too, run the official installer commands above, preserving OS trust checks. Linux/headless environments need a supported computer. Let the user sign in, then follow the Antigravity-specific connection step below. Desktop does not yet register Antigravity automatically. If this conversation cannot see the new tools, provide a self-contained continuation prompt for a new conversation, then verify a real tool read there. Installation success is not evidence that this conversation has loaded the tools.

### Antigravity-specific until Desktop registers Antigravity itself

ChatCut Desktop currently auto-registers `chatcut_desktop` only for Codex CLI, Claude Code and Hermes Agent; Antigravity needs this connection step after Desktop is installed and running:

1. With the user's agreement, read Antigravity's global MCP config `~/.gemini/config/mcp_config.json`. Back up an existing file before changing it, then merge a stdio server named `chatcut_desktop`, preserving every unrelated entry and top-level setting. If absent, create the file with `{"mcpServers":{}}` before merging. If JSON is invalid, stop and report it instead of overwriting it. If `chatcut_desktop` already exists, inspect and reuse it when correct; agree on any replacement before changing it.
2. Register only if Desktop's launcher file exists: macOS `~/Library/Application Support/ChatCut/chatcut-mcp` (expand `~` to the actual user's absolute path); Windows `%APPDATA%\ChatCut\chatcut-mcp.cmd` (expand `%APPDATA%` to the actual absolute path). If absent, Desktop has not finished first launch: ask the user to open Desktop and sign in, then retry the file check. Never create or edit the launcher.
3. Merge this entry using the real expanded launcher path for `command` (no shell variable or literal tilde):

   ```json
   {"mcpServers":{"chatcut_desktop":{"command":"<expanded absolute Desktop launcher path>","env":{"CHATCUT_MCP_CLIENT":"antigravity"}}}}
   ```

4. Refresh MCP servers using CLI `/mcp` reload, or App Settings → Customizations → Installed MCP Servers → refresh. Verify the loaded Desktop connection with a real `get_active_project` or `list_projects` read. A null active project or empty list is valid; a file edit or installation success is not a tool-read success.
5. Do not automate the Desktop UI. Let the user complete sign-in. Report installation, launcher availability, registration, tool discovery, and successful read separately. If tools cannot load in this conversation, provide a self-contained continuation prompt containing the original task, materials, current connection status and next real read, then verify in the new conversation.

The rest of this Skill applies to existing Web projects or when the user explicitly chooses the hosted Web plugin. Its hosted-only setup rules do not apply to Desktop installation or remake requests above.


## Purpose

Host scope: this skill is written for Antigravity.

Surface scope of the sections below: they cover the hosted ChatCut plugin (`chatcut` MCP server) only. When the conversation uses ChatCut Desktop (`chatcut_desktop*` servers), follow the desktop server's own instructions and skip this skill unless the user explicitly chooses the plugin/web surface — desktop media is registered locally (no uploads) and delivery happens in the ChatCut Desktop window, not a browser.

Use this as the base operating context whenever Antigravity works with a ChatCut project through the ChatCut plugin.

This skill provides the common ChatCut project model, editing operating context, project onboarding flow, editor handoff rules, and connector boundaries. It does not provide detailed tool parameters, full task playbooks, or generation prompt recipes; load the matching ChatCut skill and use tool schemas for task-specific workflows.

### MCP setup and authentication

For hosted Web tasks, check the hosted `chatcut` MCP registration and authentication first and use that connection. Missing or unauthenticated hosted tools are not a reason to install Desktop.

The hosted server comes from this plugin. Its tools are namespaced as `chatcut_chatcut` (plugin `chatcut` + server `chatcut`); discover the actual tool names in the active MCP manifest and treat it as the runtime contract. Never register a duplicate hosted server manually or retarget the plugin server.

If the tools are available and authenticated, continue normal work without reinstalling or starting a new session. Otherwise, check App Settings → Customizations → Installed MCP Servers or CLI `/mcp`; inspect installed plugins with `agy plugin list`. If it exists, use that server and do not create a duplicate. Follow the matching MCP path:

When an existing connection or OAuth attempt reports an error, or tools remain absent after successful authentication, preserve that evidence and follow [connection diagnostics](references/connection-diagnostics.md) before retrying login or changing anything. An initial sign-in requirement by itself is expected, not a confirmed connection defect. The bundled diagnostic helper supports only Codex/Claude log locations, not Antigravity. Follow the reference’s Antigravity limitations and preserve host-visible evidence without inventing log paths or running a collector under another host name.

Also use connection diagnostics when previously available tools disappear or the host reports an unfamiliar MCP/protocol error. Capture the current-host snapshot described in that reference; preserve unknown errors and stages.

For a failed hosted ChatCut tool request after connection, immediately preserve the original tool error and any available failure time, conversation ID and local call ID in the dedicated failure record described there. The Agent gathers these facts; do not ask the user to manually reconstruct them. Startup-status notices and later successful checks do not establish what happened to that tool request.

Save the visible original error and available metadata before independent checks. In Antigravity, use the current session, App Settings → Customizations → Installed MCP Servers or CLI `/mcp` for observed status. Missing host logs remain an explicit evidence gap; do not read another host's databases or require permission changes.

1. **Plugin/server missing:** Check `agy plugin list` and the installed MCP server status. Use the plugin installation instructions in the package README when installation is needed and authorized. Never register a duplicate hosted server by hand, retarget the plugin server, or write tokens to configuration. Keep this plugin's `embedded-preview` surface.
2. **Authentication required:** Open Agent settings (**Cmd+,** / **Ctrl+,**) → Customizations → **Authenticate** next to the ChatCut server → finish ChatCut sign-in in the browser → paste the code back → **Submit**. In the CLI, use `/plugin` → Installed → chatcut → **Sign in**. Tokens refresh automatically. Before handing off, tell the user to return to this same chat: use Continue if offered, or send “Authorization is complete. Please continue my task.” Do not promise automatic return. An unauthenticated server can return 401 and leave the session with no tools; reinstalling does not fix that. Missing tools alone do not establish an authentication failure.

After authorization, recheck this chat's current tool discovery, including tool search when available, and call `list_projects` with `{}` once if callable. A successful read, including an empty list, confirms this chat is usable now: continue the original task here without asking the user to start over. A callback page or CLI login success alone does not verify this chat. If tools remain absent, use one supported refresh/reconnect action for the existing connection if available, then recheck here. Otherwise preserve the original error and report that this chat has not loaded usable tools, with one concrete next action supported by this host. Do not substitute a separate app-server or a new chat for original-chat continuation, or repeat OAuth based only on an earlier empty manifest.

Keep connection feedback specific: state the completed step, the unverified step, and a single next action. If the host explicitly reports startup in progress, wait at most ten seconds once before fresh discovery; do not keep polling. A cancelled sign-in is incomplete authorization, not a broken installation. Preserve the original message and cause of a real error, including an expired authorization, and identify the failing step. A reconnect does not by itself require another login.

Keep MCP, browser sign-in, and ChatCut Desktop's own login callback separate. Check browser authentication only when the task needs the editor; otherwise leave its state unverified. A browser login page alone does not invalidate a working MCP read.

Explain whether registration, authentication, or connection failed and provide the matching concrete step, rather than only saying ChatCut is unavailable or asking the user to reconnect. Use the existing plugin-provided hosted connection; never add a duplicate hosted server. The separate Desktop route above applies only when chosen by the task.

In no-source validation, do not inspect ChatCut source code to learn parameters or hidden behavior. Use the MCP schema, HTTP tool manifest, these skills, and project/editor state.

## Role

When working in ChatCut projects, act as a professional video editing assistant. The user thinks in clips, cuts, stories, and visible outcomes, not data structures. Use video-editing judgment to clarify needs, recommend a concrete strategy, and execute the requested edit.

Align on needs and concrete strategy before creative or strategic work that shapes the output: video use case, content form, output format, source-material strategy, creative direction, or editing approach. Mechanical operations such as renames, small property changes, obvious undo, and user-specified item edits can execute directly.

## Your Environment

ChatCut is a browser-based multi-track non-linear video editor. A project holds one or more timelines, each with its own canvas (fps, width, height), video tracks, audio tracks, timeline items, and a shared asset library.

The MCP surface derives `userId` from connector auth. Project tools can list/create/target accessible projects; project-scoped tools should use the project id from those tool results or from the editor URL.

Tool calls write through ChatCut Zero/DB/S3 paths, so editor changes should be real and visible. Do not write directly to the database. Do not infer hidden IDs; read them from the matching project, timeline, item, or asset tool result. A project-specific connect failure is an access/session problem, not a request to try repo debugging. Confirm the editor is signed in as the same account used by the connector, verify the project id exactly, and confirm the user has access to that project.

The preview surface is the live ChatCut editor. The user can have the project open while Antigravity works through the plugin. Project changes should become visible in the editor; the visible editor is part of the user experience, not just a proof surface.

Antigravity works from project data, tool results, transcripts, assets, and composed timeline proof. Do not assume the browser view, project state, or timeline layout is still the same after time has passed; the user may have edited the project manually.

Visual understanding has two distinct surfaces:

- To inspect raw imported or attached source media, use Antigravity-native visual/file capabilities on the source bytes when available. Do not create a temporary timeline just to inspect source assets.
- To inspect media as it currently appears on the ChatCut timeline or editor, use `preview_timeline` with `views:["viewer"]` and bounded frames. This includes placed clips, trims, crops, captions, overlays, effects, and final framing.

For export, load `export`, call `submit_export`, and use `track_export` when current status is needed. Video/audio render locally by default in the connected editor tab: open the intended project/timeline using the clean editor link below and keep that tab open until delivery finishes. The delivered file is the one Antigravity finds by name in the user's downloads folder, as `export` describes; do not switch to cloud rendering just to get a download URL.

## Data Model

### Project

A project is the top-level container. It owns a shared asset library and one or more timelines. Each timeline defines its own canvas and contains tracks, items, and timeline-local structure.

Unless the user says otherwise, edits should target the intended active or targeted project and timeline. If the target is ambiguous, establish the project before doing nontrivial work.

### Assets

Assets are source media in the project library. One asset can be referenced by many timeline items.

Agent-facing asset types include video, audio, image, gif, motion-graphic, and svg. Content-level properties such as source media, filename, remote readiness, and Motion Graphic code/properties belong to the asset.

If the user asks to use, edit, place, replace, caption, trim, inspect, or otherwise work with an asset but does not attach or explicitly provide the source in Antigravity, do not immediately treat it as missing. Users can upload media directly in the ChatCut editor, so first inspect the targeted project's asset library with `browse_assets` and match by filename, type, visible content, transcript state, or other available metadata. Ask the user to upload or provide the asset only when it is not present, not ready, inaccessible, or ambiguous after checking project assets.

### Tracks

Tracks are lanes on the timeline.

Video tracks stack. Higher video tracks render above lower tracks; an item on an upper track covers lower video during its duration, and lower video shows through where the upper track is empty. If audio continues while no video item is visible, the rendered canvas can show black.

Audio tracks mix in parallel. Audio tracks do not cover each other; multiple audio tracks playing at the same moment are audible together.

Items on the same track must not overlap. Locked tracks should not be edited until the user unlocks them.

Sequential clips belong on the same track in increasing time order. Layered visuals such as overlays, B-roll, and Motion Graphics belong on higher video tracks above the content they cover.

### Items

Items are timeline instances of assets. Each item references an asset and owns placement and timing.

Change an item to change when or where something appears: timeline start, duration, track, position, size, opacity, fades, source offset, or playback speed. Change an asset to change reusable source content, Motion Graphic code, or Motion Graphic property defaults.

Timeline placement and duration are frame-native. User-facing summaries may use seconds, but timeline edits should preserve exact frame state from project data when available.

Motion Graphics follow the same split: visual code and editable properties belong to the asset; timing, position, size, and per-instance property overrides belong to the item.

### Editing operations - defaults and ripple

Timeline edits leave gaps by default.

Deleting an item removes it without automatically moving later items unless ripple behavior is explicitly used. Shortening an item leaves a gap; later items must be moved intentionally if the gap should close. Adding into an occupied same-track range is rejected unless the edit makes room.

Ripple affects only the same track. After ripple or other structural edits, related tracks such as captions, Motion Graphics, B-roll, and music may no longer align with the edited speech or video and should be checked.

On overlap conflicts, first decide whether the content is sequential or layered. Sequential content belongs in time order on the same track. Layered content belongs on a higher video track.

## Alignment & Execution

### How to Align Before Acting

Understanding the user's intended outcome is the foundation of creative editing. Clarify before committing to creative or strategic choices.

Alignment calibrates to how much the user has already given:

- "Make a 1-minute YouTube cut of this interview" gives platform and length, but may still need confirmation on what to keep.
- "Cut this podcast into highlights" is vague; align on target platform, length, and what counts as a highlight.
- "Make a promo for our app" with a product URL but no brand assets may need alignment on logo/assets, platform, aspect ratio, duration, production approach, and tone.
- "Add English subtitles" is clear and narrow; execute.
- "Make it shorter" or "keep going" after prior alignment usually does not need a new alignment round.
- "Make a promo video for my product" without product type is ambiguous; clarify product type, target platform, and use case before choosing a scenario.

### When to align

Align when the request involves a new project, vague creative intent, paid or time-consuming generation with missing creative details, multi-shot or multi-asset consistency, or a major fork such as voiceover versus music-only, cinematic versus casual, what to keep, or which features to highlight.

For dependent major steps, confirm the foundation before building downstream work when practical. Motion Graphics, music, and captions depend on the speech/structure edit; image and video generation depend on the approved script or direction.

### When to skip

Proceed without a new alignment round when the user already gave a clear brief with target, style, and constraints; the task is mechanical and reversible; the user said to continue; the user gave a follow-up correction; or the user explicitly asked to run end-to-end.

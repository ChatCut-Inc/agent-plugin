---
name: start-chatcut-desktop
description: Guide an explicit ChatCut Desktop request from setup into a creation scenario, the intended project and the supplied media. Use after installation, when choosing a Skill, or when resuming a creation handoff. Do not use to redirect a ChatCut Web request to Desktop.
---

# Start creating in ChatCut Desktop

This package provides instructions, not editing tools. The signed ChatCut
Desktop app owns its local MCP server and current editing Skills. Do not
install a hosted MCP package or import its editing recipes as a substitute.

## Connect only when needed

If `chatcut_desktop` tools are callable, call `get_active_project` and follow
the active server's instructions. Do not reinstall or force a new chat. Inside
ChatCut Desktop's managed agent, keep its project-pinned tools and Skills;
never modify the outer Codex installation.

If tools are missing, preserve the user's brief and read
`../connect-chatcut-desktop/SKILL.md`. Do not confuse a plugin being installed
with the Desktop app running, account sign-in, or tools being callable. When
the user explicitly wants Web, leave this route and use the supported Web
connection guide; never replace an existing connection without their choice.

If setup finishes but the current host still has no Desktop tools, prepare
one continuation in the user's language before a necessary new chat:

```text
Continue in ChatCut Desktop.
Scenario / Skill: <chosen name and verified ID if present>
Request: <original request and confirmed answers>
Project: <verified project name and ID, or not created yet>
Media: <existing asset IDs and names/status, or accessible source paths>
Completed: <verified steps>
Next: <first unfinished step or user decision>
Reuse the existing project and media; do not create duplicates.
```

Omit empty fields and credentials. Attachments are not transferred by a text
prompt: reuse existing project assets, or same-machine accessible paths, and
identify any file that must be attached again. Create a new task only when
the user asked for one and the host supports it; otherwise give the copyable
continuation. Stop the setup retry loop at that handoff.

## Choose a useful starting point

Keep any scenario, shared Skill link, project and media already supplied.
Do not repeat onboarding for a concrete editing request. Load the matching
current Desktop Skill and continue.

When the user is exploring, offer three to five relevant choices using the
actually attached Desktop Skills or the live `manage_skill` catalog when
available. Explain each outcome and required input briefly in the user's
language. Examples of categories are editing existing footage, making an
explainer from a topic, and generating an asset from a brief; offer only what
this connected Desktop version supports. Prefer a supported question UI, with
plain chat as the fallback. Let the user describe a different goal.

For a shared Skill ID, call `manage_skill get` with that exact ID. For browsing,
list the appropriate preset or saved catalog and fetch the chosen current
package before execution. Built-in Skills and catalog Skills are different
sources. Never hardcode catalog IDs or treat an absent built-in in a catalog
list as an installation failure. A removed Skill requires a new user choice,
not a silent substitution.

Fetching a form-entry Skill does not mean its form was submitted. Verify
claimed uploaded recordings against actual project assets and retain only
confirmed answers; import missing supplied sources before execution. Do not
use demonstration media or copy hidden transport defaults into the request.

## Start and continue in the intended project

When the user asks to create, reuse the project identified in their request
or continuation. Verify it through Desktop's project tools. Create a fresh
project only for a new job; an unrelated currently selected project is not
permission to edit it. Follow the live schema to show the selected project
window (`target_project` with `openWindow:true` when supported). Keep explicit
project IDs on subsequent calls. A local Desktop project and a similarly named
Web project are not interchangeable.

Check the project's assets before requesting or importing media. Use Desktop's
current local import contract, such as `push_asset` when exposed, and its
returned IDs/readiness; do not use the hosted upload helper. If a source path
is unavailable, ask for that file without claiming it was imported. For a
topic-only Skill, create/target the project without requiring an attachment.

Recap the project, chosen Skill, request and material status once. Include only
user-supplied or actual Skill form fields. Continue the loaded workflow in the
same project, following its review and generation gates. Browsing or choosing
a scenario does not authorize every paid generation or optional effect.

An unavailable tool or failed step should retain its original error, project,
asset IDs and completed work. Do not change models or switch to Web to hide a
failure. Verify the editable result in the Desktop surface; follow its export
Skill only when delivery is requested or the approved workflow reaches it.
Report installation, connection, import, editing and export as separate
observed results.

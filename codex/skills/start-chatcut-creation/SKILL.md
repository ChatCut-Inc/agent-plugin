---
name: start-chatcut-creation
description: Help a user who explicitly chose ChatCut Web discover a creation scenario and start or resume the right project after connecting Codex. Use for first-edit guidance, browsing ChatCut Skills, or continuing an installation handoff. Keep an existing brief instead of restarting onboarding. ChatCut Desktop uses its own startup Skill and tools.
---

# Start creating in ChatCut Web

Read `chatcut-plugin-basics` first. Its connection, project, import, and editor
rules still apply. This Skill adds a creation starting point; it does not
install a second plugin or enable the private embedded-home preview.

## Preserve the user's intent

Keep the conversation language, chosen scenario or shared Skill link, request,
project reference, and supplied media. Do not ask again for information already
given. A user asking only to connect or inspect capabilities has not authorized
an edit, empty project, paid generation, or export.

When the tools work in this conversation, continue here. Installation status
alone does not prove authentication or tool availability. If tools are absent,
follow basics once for the actual missing connection step. Preserve the brief
using [the continuation format](references/continuation.md) before a necessary
new conversation; never loop through reinstalls or silently switch to Desktop.

## Help the user choose a starting point

For a concrete request, load its matching Skill and continue without a menu.
For a shared Skill ID, use `manage_skill` with `action:"get"` and that exact ID.
For browsing, use `manage_skill` with `action:"list", source:"preset"`; use
`source:"mine"` when the user asks for their saved Skills. Show three to five
relevant choices with a short outcome and required input, in the user's
language. Ask which they want, allowing their own description too.

Use current returned IDs and descriptions. Never hardcode catalog UUIDs,
resolve a removed ID to an unrelated Skill, or invent a form based on an old
thumbnail. After selection, fetch the current package with `get` and follow
its `SKILL.md` and referenced files. If an old link no longer resolves, explain
that and offer relevant current matches for the user to choose.

A catalog form-entry Skill may describe recordings as already uploaded.
Listing or fetching it is not a form submission. Verify the project assets
and actual submitted answers first; import supplied files and ask only for
missing input before executing that workflow. Do not invent a submitted form,
copy every transport-schema field into the brief, or use its example media.

Bundled capability playbooks are a separate source: they are not missing just
because `manage_skill` does not list them. When appropriate, offer available
capabilities such as editing supplied footage, creating motion graphics from a
topic, or preparing a video-generation brief. Load the actual installed
playbook before execution. Describe an unavailable capability as unavailable;
do not offer a generation workflow whose required tools are absent.

Use the current host's supported question UI when available (`widget-forms`
for ChatCut forms), otherwise a short numbered choice in chat. Do not require
a visual form or a custom sidebar to get started. A choice answers that
question; it does not authorize every later generation or optional enhancement.

## Carry the selection into a real project

Once the user asks to start creating, create a fresh project or target the
explicit existing project according to basics. Reuse a project prepared by a
form or previous handoff: verify its exact ID and access, and do not create a
second project merely because tools loaded in a new conversation. Pass the
verified project ID explicitly on subsequent project-scoped calls.

Surface the returned project card/link immediately. Follow the current tool
result's supported opening method; do not claim that a Codex sidebar opened
or that an old conversation was restored without observing it. The normal
project editor is sufficient; no Preview URL or hidden bridge is required.

Check `browse_assets` before asking for media that may already be in the
project. Import user-supplied files through `asset-import`, retaining returned
asset IDs and readiness state. A filename, local path, chat attachment, or
upload placeholder is not proof of a ready project asset. Retry a failed
transfer with the same asset ID where supported. Do not make the user upload
an already available asset again. For a text-only scenario, start the project
with the supplied topic; do not invent a media requirement.

Summarize the actual starting point once: project, selected Skill/scenario,
request, confirmed form values, and media names/status. Include only fields
the user supplied or the loaded Skill actually asks for. Do not add hidden
thumbnail, language, duration, or generation defaults to the user's request.

Continue the selected workflow in that project. An unavailable required tool
or generation failure is a blocked step, not permission to switch providers,
models, surfaces, or to render a replacement locally. Preserve the original
error, project and asset IDs, and the completed steps. Do not restart a job
that may already be running. Verify the editable result, then export only
when the user's request or the approved workflow calls for delivery.

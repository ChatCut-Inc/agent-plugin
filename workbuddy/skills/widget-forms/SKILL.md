---
name: widget-forms
description: Use when ChatCut work in WorkBuddy requires structured user choices or clarification through ordinary chat or a host-native question surface.
---

# Widget Forms Compatibility for WorkBuddy

Keep this skill as the stable entry point for structured ChatCut questions in WorkBuddy. Collect answers through ordinary chat or a host-native `AskUserQuestion` capability. Do not create an HTML form, file-based form, or Widget whose submitted value is required to continue.

Use an ordinary chat message as the universal WorkBuddy-compatible fallback. A host-native `AskUserQuestion` capability may be used when available:

1. Infer everything available from the conversation, attachments, and current ChatCut project. Do not ask for information that is already known or can be read safely.
2. Ask only about choices that materially change the result, permissions, cost, or target project. If a reasonable reversible default is safe, proceed and state it instead of interrupting.
3. Combine related unknowns into one concise message. Prefer a short numbered list and provide concrete options when they make answering easier.
4. Make the reply format effortless, such as `1A，2C`; always allow the user to answer in their own words.
5. After asking, stop the turn and wait for the user's actual reply. Do not continue from a recommended option or treat silence as consent.
6. For paid generation, describe the exact content, quantity, and important specifications, then obtain explicit text confirmation before calling a credit-consuming `submit_*` tool.

For visual styles or voices, first obtain authoritative ids, labels, descriptions, and media from the relevant ChatCut catalog. Present accurate text options and preserve the mapping internally; never invent a choice from a filename or image.

Do not ask for files through a form. Ask the user to attach or drag missing media into the conversation, then follow `asset-import`.

# Continue after tools load

Use this only if connection setup succeeded but this conversation still cannot
call ChatCut tools, or the host explicitly requires reopening. If the tools
are already callable, keep working in the current conversation.

Prepare one concise continuation in the user's language. Preserve facts only:

```text
Continue my ChatCut creation request using ChatCut Web.
Scenario / Skill: <chosen name and exact returned or shared ID, if any>
Request: <the user's brief and confirmed form answers>
Project: <existing name, full project ID and clean editor URL, or "not created yet">
Media: <project asset IDs and names/status; otherwise available attachment or local-file references>
Completed: <verified steps only>
Next: <the next unfinished action and any pending user decision>
Use the existing project and assets when present; do not create duplicates.
```

Omit empty fields. Strip boot tokens, signed URLs, OAuth data and private
diagnostics. A new chat does not automatically inherit attachments. Carry
durable project asset IDs when available; use a local path only when the new
chat has access to the same machine and file. Otherwise explicitly request
that missing attachment there. Do not claim a filename transfers its bytes.

If the user asked to create a new task and the host supports doing so, create
one task with this complete continuation and report its actual returned
reference. Otherwise show the copyable continuation and the minimal new-chat
step. Do not automatically send a draft or start multiple tasks to test it.

Report the observed boundary: package installed, connection authenticated,
tools callable, project opened, media imported, or result exported. Say which
one is still pending; do not summarize every stage as "setup complete".

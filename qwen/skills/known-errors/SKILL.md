---
name: "恢复创作"
version: "2.0.4"
name_en: "known-errors"
name_zh: "恢复创作"
description: "遇到连接或创作问题时帮助继续当前任务。"
description_en: "Diagnose ChatCut plugin tool failures, rejected mutations, unexpected response shapes, and blocked import, generation, or render operations."
description_zh: "遇到连接或创作问题时帮助继续当前任务。"
user-invocable: "false"
displayName: "恢复创作"
---

# Known Errors

Treat the active MCP tool schema and returned structured error as authoritative. Do not retry with remembered legacy payloads when the current manifest differs.

## Mutation Rejections

- On same-track overlap, do not force the write or silently delete the conflicting item. Decide whether content is sequential or layered, choose an available track when appropriate, or ask which item should win.
- On locked-track or stale-id failures, refresh the affected timeline scope and retry only with current ids and state.
- On validation errors, change only the rejected field or transaction shape; preserve unrelated project state.

## Import And Media

- Follow `asset-import`: check the runtime and media tools, create an import session, and run the packaged official helper. Missing dependencies can be installed as described there. Do not substitute backend-only `push_asset` or `download_media`.
- Use the helper's structured retry when provided; do not repeat an unchanged failure. Use the web-editor fallback when file access, execution, installation or upload is genuinely unavailable. Respect permission denials.
- Wait for upload only before byte-dependent operations. A known asset id can be used for metadata and timeline placement while bytes continue uploading.

## Generation And Motion Graphics

- Use only generation tools visible on the current host. 千问办公 and Claude Code plugins direct-author Motion Graphics with `create_motion_graphic_from_code`; the built-in ChatCut Agent may expose `submit_motion_graphic`.
- Preserve the original provider or content-policy failure. Do not spend credits on repeated identical retries or silently switch models.

## Verification And Export

- A successful mutation is not visual proof; load `verification` when the result must be seen.
- Use `track_export` for render jobs. If cloud render cannot read an asset, resolve remote readiness through `asset-import` only with user permission, or report the limitation.

On auth or project-access errors, verify the exact project id and that the editor and plugin use the same ChatCut account before attempting code or infrastructure debugging.

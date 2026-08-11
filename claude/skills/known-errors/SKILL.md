---
name: known-errors
description: Diagnose ChatCut plugin tool failures, rejected mutations, unexpected response shapes, and blocked import, generation, or render operations.
---

# Known Errors

Treat the active MCP tool schema and returned structured error as authoritative. Do not retry with remembered legacy payloads when the current manifest differs.

## Mutation Rejections

- On same-track overlap, do not force the write or silently delete the conflicting item. Decide whether content is sequential or layered, choose an available track when appropriate, or ask which item should win.
- On locked-track or stale-id failures, refresh the affected timeline scope and retry only with current ids and state.
- On validation errors, change only the rejected field or transaction shape; preserve unrelated project state.

## Import And Media

- Hosted plugin surfaces use the `asset-import` adapter and `import_media`; do not substitute backend-only `push_asset` or `download_media` calls when they are absent.
- If media conversion fails, use the helper's structured retry when provided. Otherwise explain the unsupported source and ask for a compatible replacement; do not repeat the same failing editor import path.
- Wait for upload only before byte-dependent operations. A known asset id can be used for metadata and timeline placement while bytes continue uploading.

## Generation And Motion Graphics

- Use only generation tools visible on the current host. Codex direct-authors Motion Graphics with `create_motion_graphic_from_code`; Claude Code may expose `submit_motion_graphic`.
- Preserve the original provider or content-policy failure. Do not spend credits on repeated identical retries or silently switch models.

## Verification And Export

- A successful mutation is not visual proof; load `verification` when the result must be seen.
- Use `track_export` for render jobs. If cloud render cannot read an asset, resolve remote readiness through `asset-import` only with user permission, or report the limitation.

On auth or project-access errors, verify the exact project id and that the editor and plugin use the same ChatCut account before attempting code or infrastructure debugging.

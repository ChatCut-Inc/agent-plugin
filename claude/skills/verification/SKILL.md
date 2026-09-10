---
name: verification
description: Hosted ChatCut plugin sessions only (the `chatcut` MCP server). If the conversation is driving ChatCut Desktop (a `chatcut_desktop*` MCP server), load this skill only when the user explicitly chooses the plugin/web surface — desktop sessions otherwise ship their own instructions and tools. Verify that ChatCut plugin edits are reflected in project structure and visible timeline output before reporting success.
---

# Verification

Use both structural and visual evidence when the requested result is visible:

1. Re-read the affected scope with `read_project`, `preview_timeline`, `inspect_item`, `browse_assets`, or `inspect_asset` as appropriate. Use the latest response for ids, tracks, timing, and readiness.
2. Inspect composed timeline frames through the visual tool exposed by the current manifest. Successful rendering or mutation metadata is not visual proof until the returned pixels are inspected.

Use local source bytes for raw source understanding when the original path is available. Use `inspect_asset` when the original is not locally available. Source frames help select moments but do not prove timeline composition; use composed timeline frames for trims, layers, captions, effects, crops, transitions, and Motion Graphics.

If signed frame URLs are returned and the host cannot inspect them directly, download the complete shell-quoted URLs into a temporary directory and inspect those files. Do not report visual success from URLs alone.

If visual proof is blocked by upload/readiness or renderer state, report the blocker explicitly and ask the user to inspect the live editor when appropriate. Never convert a failed verification into an unsupported tool fallback or a false completion claim.

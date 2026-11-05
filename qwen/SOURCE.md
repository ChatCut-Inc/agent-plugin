# Source

Official repository: https://github.com/ChatCut-Inc/agent-plugin

Baseline commit: f58a037d82abe0ad6b4163f84dcd8ea8c590d686
Codex plugin baseline: 1.10.12
Qwen Web package: 2.0.2

The editing catalog and unmodified upload-media.mjs helper are derived from the official Codex plugin. Qwen adapters replace authentication, editor handoff, forms, inline script editing, asset import, entry-point metadata and package-relative reference paths. Media import uses the official helper with Node.js and ffmpeg/ffprobe, reusing existing dependencies or installing them on demand; the web editor remains a fallback. Executable media binaries are not bundled. No Desktop installer, local MCP launcher, credentials, user paths or account-specific project IDs are bundled.

Market candidate 2.0.3: Qwen manifest/frontmatter field alignment; market connector key ChatCut; connector readiness guidance; bilingual README; official SVG icon. The editing guides and upload helper remain based on Web 2.0.2.

2.0.4 application candidate: reuse talking-head-guide and create-motion-graphics directly; replace duplicate promo entry with the existing app-promo-guide editorial workflow adapted to hosted Web tool contracts. Remove the three duplicate entry wrappers and the unavailable multicam-sync listing. No backend or installed client state changed. Structural validation is not end-to-end verification.

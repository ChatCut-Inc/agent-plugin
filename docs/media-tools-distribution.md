# Media tools distribution

ChatCut marketplace Git history must not contain FFmpeg or FFprobe binaries.
The four compressed tools are immutable GitHub release assets under tag
`media-tools-v8.1-chatcut.1`; their URLs, compressed and extracted sizes, and
SHA-256 hashes are pinned in each host package's
`scripts/media-tools-manifest.json`.

Asset names:

| Source artifact | Release asset |
| --- | --- |
| `darwin-arm64/ffmpeg.gz` | `ffmpeg-8.1-darwin-arm64.gz` |
| `darwin-arm64/ffprobe.gz` | `ffprobe-8.1-darwin-arm64.gz` |
| `win32-x64/ffmpeg.exe.gz` | `ffmpeg-8.1-win32-x64.exe.gz` |
| `win32-x64/ffprobe.exe.gz` | `ffprobe-8.1-win32-x64.exe.gz` |

The release must be published before a marketplace revision referring to it is
promoted. The release tag is immutable: corrections require a new version and
new URLs. CI must run the media-tools tests and reject any Git blob larger than
5 MiB. Retain the included FFmpeg/Gyan license and source-build notices in the
marketplace distribution.

The downloader has no daemon. It checks an explicit tool and `PATH` first, then
streams one platform asset into a `.partial` file, verifies the compressed
stream, streams decompression into a temporary executable, verifies the result,
and atomically renames it. Concurrent first use is serialized by an install
lock. Failed downloads leave neither a partial executable nor an unbounded
retry loop.

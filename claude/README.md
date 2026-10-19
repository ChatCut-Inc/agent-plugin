# ChatCut

Edit and create videos in ChatCut from Claude. Import media, edit timelines,
transcribe speech, add captions, create motion graphics, generate video, voice
and music, translate videos, and export the result. Projects remain editable in
the ChatCut editor, so you can review and adjust the work yourself.

## Requirements and setup

You need a ChatCut account and access to the project you want to edit. Connect
your account through the host's ChatCut MCP authentication flow. The host manages
OAuth; plugin skills and helper scripts do not read your existing account
credentials from local files or environment variables.

For Claude Code installation and authentication, see the
[setup guide](https://chatcut.io/claude).

## Try it

- Import this video into my ChatCut project.
- Remove pauses and add captions to this talking-head video.
- Create an editable animated title and background music.
- Translate this video into Spanish.
- Export the finished project.

Generation and other paid operations may consume ChatCut credits. Review the
host's confirmation before approving a paid operation.

## What the plugin runs and sends

The plugin includes workflow skills and one remote MCP server at
`https://api.chatcut.io/api/external-mcp/mcp`. Tool calls send the project
instructions and content needed for the requested operation to ChatCut. Imported
media, transcripts, generated assets, and edits can become part of your ChatCut
project. Generation, translation, and transcription are processed through
ChatCut's service.

Optional forms load public catalog images and audio previews directly from
`cdn.jsdelivr.net`, outside the declared MCP connection. These requests expose
normal network request metadata to the CDN. Project media and transcripts are
not embedded in those public preview URLs.

Local imports use one of two bundled Node.js helpers:

- **Same-machine editor import:** the local media server reads only the files
  explicitly listed on its command line. It listens on `127.0.0.1`, serves them
  to the editor, supports resumable downloads, and exits after 15 minutes by
  default. Requests with a different browser Origin are rejected; requests
  without an Origin are allowed. There is no access token, so another local
  process that knows the port and filename can read a listed file while the
  helper runs. The public `chatcut-local-media-v1` URL prefix and legacy `token`
  output field are compatibility values, not credentials. Old token-prefixed
  paths also work without authenticating the prefix. The editor stores imported
  bytes locally and may upload them to ChatCut for cloud-dependent work or when
  you request an upload.
- **Upload-helper fallback:** when the editor cannot reach local files, the
  skill requests a short-lived import session from the ChatCut MCP server. It
  passes that session's token and endpoint explicitly to the upload helper.
  The helper uses Node.js 18+, `ffmpeg`, and `ffprobe` available on your PATH to
  prepare selected media and derived files, and uploads through the
  ChatCut-provided endpoints and presigned storage URLs. It does not receive
  the host's MCP OAuth credential.

Only import media you have permission to use. If the host denies a transfer,
the workflow stops rather than bypassing that restriction.

## Links

- [Documentation](https://chatcut.io/claude)
- [Support](https://chatcut.io/contact)
- [Privacy policy](https://chatcut.io/privacy)
- [Terms of service](https://chatcut.io/terms)
- [Source code](https://github.com/ChatCut-Inc/agent-plugin)

License: GPL-3.0-only.

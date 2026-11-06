# ChatCut for Claude

Edit videos in ChatCut from Claude. Cut talking-head videos, interviews and
podcasts by editing their transcript, remove filler words and long pauses, add
and style captions, place stock B-roll and music, build motion graphics and
visual effects from code, preview the result in the conversation and export it.
Projects stay editable in the ChatCut editor, so you can review and adjust the
work yourself.

This plugin works only with media you already have. It does not generate
images, video, voice or music with AI models.

## Requirements and setup

You need a ChatCut account. When Claude first uses ChatCut, sign in through the
host's connector flow; Claude manages the OAuth sign-in, and the plugin's skills
never read credentials from local files or environment variables. See the
[setup guide](https://chatcut.io/claude).

## Try it

- Open my latest ChatCut project and remove the filler words and long pauses.
- Turn this interview into a 60-second highlight that keeps the part about
  pricing.
- Add captions in the spoken language and use a clean, bold style.
- Add a lower-third with my name and title when I first appear on screen.
- Export the finished timeline as a 1080p MP4.

Exports render on ChatCut's servers. A long or high-resolution export can use
ChatCut credits; Claude shows the quote and waits for your confirmation first.

## What the plugin runs and sends

The plugin contains workflow skills and one remote MCP server,
`https://api.chatcut.io/api/external-mcp/claude`. Tool calls send the
instructions and project content needed for the requested edit to ChatCut.
Requests to that server carry static headers naming the install source and
plugin version.

- **Your media:** you add files through a one-time ChatCut upload link that
  opens in your browser. Uploaded audio and video are transcribed by ChatCut's
  service so they can be edited by transcript.
- **Stock search:** `search_stock_media` sends your search terms to Pexels,
  Pixabay, Unsplash and Freesound through ChatCut. You download a chosen result
  yourself and add it through the upload link.
- **Exports:** rendered on ChatCut's servers and delivered as a download link.

Two skills include small Node.js scripts that run on your machine only when the
skill asks Claude to run them: `visual-analysis/scripts/concat-images.mjs`
combines frame images into one labeled contact sheet with ImageMagick, and
`multicam-sync/scripts/transcript-offset.mjs` computes camera sync offsets from
transcript timings. Neither sends data anywhere.

Only upload media you have permission to use.

## Privacy

ChatCut's [privacy policy](https://chatcut.io/privacy) explains how project
media, transcripts and account data are stored, processed and retained.

## Links

- [Documentation](https://chatcut.io/claude)
- [Support](https://chatcut.io/contact)
- [Privacy policy](https://chatcut.io/privacy)
- [Terms of service](https://chatcut.io/terms)
- [Source code](https://github.com/ChatCut-Inc/agent-plugin)

License: Apache-2.0.

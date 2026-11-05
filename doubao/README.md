# ChatCut for Doubao Work (豆包工作)

The Doubao Work package is a single Skill, **ChatCut 视频剪辑专家** (`chatcut-video-editor`, version **1.0.7**). It lets Doubao Work edit videos in **ChatCut Desktop** on the user's own computer: talking-head videos, vlogs, explainers and product videos with cuts, captions, transitions, music, motion graphics and generated media, keeping an editable multitrack timeline that can be exported. The Skill is written in Chinese for Doubao Work users.

## Connection

- ChatCut Desktop, not the hosted Web plugin. Project changes appear in ChatCut Desktop; the Skill does not return Web editor links or use the hosted ChatCut connector.
- Doubao Work starts a local STDIO connector named `chatcut_desktop` together with the Skill. The connector is the public npm package `chatcut-desktop-mcp`, which only bridges to the running ChatCut Desktop. For reference, the connector configuration is:

  ```json
  {
    "mcpServers": {
      "chatcut_desktop": {
        "command": "npx",
        "args": ["--yes", "--package=chatcut-desktop-mcp@0.1.1", "chatcut-desktop-mcp"]
      }
    }
  }
  ```

  It needs Node.js 18 or newer and no environment variables. Users do not enter this configuration, and the Skill tells the agent not to ask them to.
- The Skill works with current Desktop builds, whose connector exposes `get_active_project`, `get_guidelines` and `execute`, and with older builds that expose the editing tools directly.

## Install and connect

From the Skill's own instructions:

1. Add ChatCut in Doubao Work. The listing binds the `chatcut_desktop` connector to this Skill, and Doubao Work starts it when a task begins.
2. Ask for a video edit. If ChatCut Desktop is missing, the Skill installs the official build for the computer from `https://api.chatcut.io/desktop/download/...`: macOS 13 or newer (Apple Silicon or Intel) or Windows x64. On macOS it verifies the disk image, code signature and notarization before installing. Linux is not supported.
3. If ChatCut asks you to sign in, do it in the ChatCut window. The Skill never asks for passwords, verification codes or tokens.
4. If the connector failed to start because Desktop was not installed yet, the agent asks you to retry the ChatCut connector once in Doubao Work, then continues the original request. The connection counts as working only after a successful `get_active_project` call inside the Doubao Work task.

## Package contents

```text
skills/chatcut-video-editor/SKILL.md                     Skill instructions (Chinese)
skills/chatcut-video-editor/agents/openai.yaml           Display name, default prompt, chatcut_desktop dependency
skills/chatcut-video-editor/references/macos-install.md  macOS install verification
```

The Skill ZIP has the `chatcut-video-editor/` folder at its root:

```sh
cd doubao/skills
zip -r /path/to/chatcut-video-editor-doubao-1.0.7.zip chatcut-video-editor
```

Store listing material, build archives and the connector's source are not part of this folder; the connector is published on npm as `chatcut-desktop-mcp`.

## Known limitations

- The `chatcut-desktop-mcp@0.1.1` launch is tested on macOS. Windows and the native Doubao Work connection are not yet verified.
- The Skill cannot attach a missing connector to a running task. If the connector is ready but the task still has no ChatCut tools, the agent suggests at most one new task and otherwise reports the problem.
- Not supported: live screen or camera recording, editing Premiere Pro, DaVinci Resolve or Final Cut Pro projects directly, and publishing or scheduling to social platforms.
- Paid generation needs a description of the job and explicit confirmation first.
- Agents running inside ChatCut Desktop use Desktop's built-in Skills instead of this one.

## License

The package has no separate license file; see the repository [LICENSE](../LICENSE).

Support: [chatcut.io](https://chatcut.io).

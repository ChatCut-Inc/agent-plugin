# Connect ChatCut to this Manus task

Connect **ChatCut** at the official HTTP MCP endpoint `https://api.chatcut.io/api/external-mcp/mcp`. Verify access privately with a read-only check. After success, welcome the user to editing in this same conversation.

## Choose the connection

If the user asks to **create a new private ChatCut connector**, create it directly, even if a saved connector has the same name. Otherwise, prefer the matching connector already enabled in this task. If needed, look for a saved connector with this exact name and endpoint. Reuse its UID if identified, or create a connector if none exists. Leave existing connectors intact. Use the native **Apply** action when Manus needs the user to attach a saved connection. Both paths use the same read-only check and welcome below.

## Create a new private connector

Load the configuration snapshot required by the installed `manus-config` CLI. Save the following JSON as a draft file. Set the top-level `mode` to `"url"` explicitly. Omit `note` and `headers` entirely, including empty values. The endpoint supplies OAuth. Manus handles the website icon.

```json
{
  "mode": "url",
  "name": "ChatCut",
  "description": "Read your ChatCut project list to verify your connection.",
  "mcpServers": {
    "ChatCut": {
      "url": "https://api.chatcut.io/api/external-mcp/mcp"
    }
  }
}
```

Run `manus-config connector create --file <draft.json>` once. Keep the UID from the successful creation receipt. Run `manus-config connector ensure --uid <new-uid>` to present the native recommendation for that exact connector. The user's action on the recommendation is **Connect**. Creation may already have displayed a **Log in** card. Keep that card available. Use the new UID for every subsequent step, even if other ChatCut connectors are attached.

## Refresh this task after Connect or Log in

1. Keep the selected UID. If it needs OAuth, use the native **Log in** card for that UID. Request login once only if Manus has not already shown the card. Keep the task running while the user acts. Respect an explicit **Skip** or **Cancel** from the user.
2. After `ensure` returns, make your **next tool action** a read-only refresh in this turn. Run `manus-config config load` and then `manus-config connector get <uid>` using the saved UID. In particular, the receipt `not enabled (unchanged; original suggestion was not accepted)` can arrive after the user clicked **Connect**, before the login card finishes. That receipt by itself does not establish a cancellation. Refresh now and recheck after login, even if the card already says **Applied**. Use discovery on the runtime server for that enabled UID. Confirm the binding in the refreshed configuration if other saved connectors are also called ChatCut.
3. If OAuth is pending or discovery returns `server 'chatcut' not found`, give the login card time to finish. Use a native wait if available, or wait 20 seconds in the terminal. Repeat the configuration refresh and discovery for the same UID for up to two minutes. Check the saved connector list and the task's enabled state separately.
4. A saved connector can still be disabled in this task after **Connect**. If the refreshed snapshot shows that exact UID is saved but disabled, offer to attach the saved connection now, in this turn. Run `manus-config connector ensure --uid <uid>` **once more for the same UID**. Manus can now present a recommendation with **Apply** and ChatCut preselected. Let the user click **Apply**. Refresh the configuration and discover tools again. Keep the existing OAuth session. Never create a duplicate or select an older namesake during recovery. If the host still offers **Connect** or requires login, keep the original authorization flow and report the state without looping through recommendations.
5. As soon as this connector exposes `list_projects`, call it with `limit: 1` and `query: "ChatCut connection check"`. A successful tool response, including an empty result, completes the internal check. Keep the query, count, project data, UID and setup diagnostics in the tool trace. Go directly to the editing welcome in this reply.

If the host suspends the task, repeat the refresh when it resumes. If the turn ends before a read succeeds, report the last observed state. The user can continue in this same conversation with “Attach the ChatCut connection you just used to this task, refresh it and retry the project list.” Resume at step 2 with the original UID.

## Welcome the user to editing

After a successful read on either a new or reused connection, give the welcome directly in the user's conversation language. Use the corresponding wording below, translating it for other languages. This is the next message in this task. Keep the invitation to describe an edit as the only question. Wait for the user's brief before creating a project or changing anything.

**English**

ChatCut is connected. I can edit talking-head footage, clean up speech, add captions and transitions, and cut in B-roll. I can also create motion graphics like animated titles, or generate video clips, voiceovers, music and sound effects.

We can build your video step by step here. You can open the ChatCut editor anytime to adjust the timeline, captions or motion graphics yourself. What footage or other materials do you have, and what kind of video would you like to make?

**中文**

ChatCut 已连接。我可以帮你剪口播、清理语音、加字幕和转场，穿插 B-roll 补充画面。也可以做动态标题等 MG 动画，或生成视频素材、旁白、音乐和音效。

我们可以根据你的需求，在这里一步步剪。你也可以随时打开 ChatCut 编辑器，自己调整时间线、字幕和动效。你手里有哪些素材，想做一条什么样的视频？

[Manus connector settings](https://manus.im/app/plugins#settings/connectors) · [Manus custom MCP documentation](https://manus.im/docs/integrations/custom-mcp)

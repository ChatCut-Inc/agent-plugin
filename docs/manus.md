# Connect ChatCut to this Manus task

Finish by reading the signed-in user's ChatCut project list in this task. Use the official HTTP MCP endpoint `https://api.chatcut.io/api/external-mcp/mcp` and the display name **ChatCut**.

## Choose the connection

If the user asks to **create a new private ChatCut connector**, create it directly, even if a saved connector has the same name. Otherwise, look for a saved ChatCut connector with this exact name and endpoint. Reuse its UID if identified, or create a connector if none exists. Leave existing connectors intact. Use the native **Apply** action when Manus needs the user to attach a saved connection.

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

## Authorize and verify the read

1. Discover `list_projects` on the selected connector. If OAuth is pending at creation, discovery, or the read, use the native **Log in** card for this UID. Request native login once if no card is already present.
2. Leave the task running while the user acts. Use a native wait or resume-on-authorization action if available. If login returns `waiting` and the turn can run tools, immediately wait 20 seconds in the terminal and retry read-only discovery on the same UID. Repeat for up to two minutes. Keep the original login card and let it serve as the only authorization prompt. Do not ask for a chat reply or a separate **Continue** or **Apply** confirmation after **Connect**.
3. As soon as discovery succeeds, call `list_projects` with `limit: 1` and `query: "ChatCut connection check"`. Report whether the connector was added or reused and the actual matching count, then finish. Zero matches is a successful read. Keep project names and identifiers private. A login success message alone does not verify the read.

If the host suspends the task, allow its native action to resume it. If the bounded checks expire or a tool fails, report the last actual result and leave the read unverified.

[Manus connector settings](https://manus.im/app/plugins#settings/connectors) · [Manus custom MCP documentation](https://manus.im/docs/integrations/custom-mcp)

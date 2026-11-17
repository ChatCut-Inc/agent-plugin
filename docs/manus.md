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

## Refresh this task after Connect or Log in

1. Keep the selected UID. If it needs OAuth, use the native **Log in** card for that UID. Request login once only if Manus has not already shown the card. Keep the task running while the user acts. Respect an explicit **Skip** or **Cancel** from the user.
2. After `ensure` returns, make your **next tool action** a read-only refresh in this turn. Run `manus-config config load` and then `manus-config connector get <uid>` using the saved UID. In particular, the receipt `not enabled (unchanged; original suggestion was not accepted)` can arrive after the user clicked **Connect**, before the login card finishes. That receipt by itself does not establish a cancellation. Refresh now and recheck after login, even if the card already says **Applied**. Use discovery on the runtime server for that enabled UID. Confirm the binding in the refreshed configuration if other saved connectors are also called ChatCut.
3. If OAuth is pending, the UID still looks disabled, or discovery returns `server 'chatcut' not found`, give the original card time to complete. Use a native wait if available, or wait 20 seconds in the terminal. Repeat **both** the configuration refresh and tool discovery in this turn for up to two minutes. Keep using the same UID and card. Do not create, enable, or authorize a second connector or ask for a separate confirmation.
4. As soon as this connector exposes `list_projects`, call it with `limit: 1` and `query: "ChatCut connection check"`. Report whether the connector was added or reused and the returned match count. Zero matches confirms a successful read. Keep project names and identifiers private.

If the host suspends the task, repeat the refresh when it resumes. If the turn ends before a read succeeds, report the last observed state. The user can continue in this same conversation with “Refresh the ChatCut connection you just used and retry the project list.” On that follow-up, resume at step 2 with the original UID.

[Manus connector settings](https://manus.im/app/plugins#settings/connectors) · [Manus custom MCP documentation](https://manus.im/docs/integrations/custom-mcp)

# Connect ChatCut to this Manus conversation

When someone asks Manus to connect ChatCut, finish the connection check in the same task. The connector display name for this guide is **ChatCut**.

1. Find the connector by that display name. Reuse it when it exists. If it needs attaching to the current task, use the native Manus connector picker and let the user click **Apply**. To add it for the first time, use Manus's custom MCP setup with the same display name, HTTP transport, and `https://api.chatcut.io/api/external-mcp/mcp`. Use the server's OAuth defaults and leave custom headers empty.
2. Discover the connector's `list_projects` tool. A login request can appear during setup, tool discovery, or the read itself, including for a **saved** connector. Whenever this happens, follow the authorization step below, then return to the point that required authorization in this task.
3. Call `list_projects` through the connector with `limit: 1` and `query: "ChatCut connection check"`. Once it returns, report whether the connector was added or reused and the matching count. Zero matches is a successful read. Keep project names and identifiers private.

## While authorization is pending

Present the native **Log in** card once and keep the task in progress. The user's action is to complete that card. A login tool result such as “waiting” indicates pending authorization. A final chat reply at this point ends the turn before the user can return. Leave the login card as the user-facing prompt.

Use only the native login card for ordinary OAuth. Do not open a separate blocking question (ask-user, ask-choice, or a Continue button), send a final notification, or request a chat reply. After `auth.login` returns `waiting`, if the current turn can still use tools, make your very next action a native wait for authorization or a 20-second terminal sleep followed by read-only tool discovery for this connector. Leave the login card clickable while tools run. Repeat within the two-minute bound. If authorization already completed, proceed directly to the read. A separate user question pauses execution and cannot serve as a timed wait.

If Manus offers a native wait or resume-on-authorization action, use it. Otherwise, while this task can still run, give the user time to approve and recheck the **same connector** using an available read-only discovery action. For example, wait 20 seconds between checks for up to two minutes. Use an ordinary timed wait in the task's terminal if needed. Reuse the original card throughout. Once discovery succeeds, read `list_projects` as above, even if the authorization card itself already says **Login successful**.

If Manus forcibly suspends execution or the bounded checks expire, preserve the pending state and report the actual tool result and last check if a status is required. Let the native authorization action resume the task when the host supports that. Keep credentials in the authorization screen.

[Manus connector settings](https://manus.im/app/plugins#settings/connectors) · [Manus custom MCP documentation](https://manus.im/docs/integrations/custom-mcp)

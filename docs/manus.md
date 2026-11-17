# Connect ChatCut to this Manus conversation

When someone asks Manus to read this page and connect ChatCut, complete the connection in the current task.

1. Check the connectors and tools available to this task for **ChatCut**. If the user's existing ChatCut connector is available, reuse it. If it is disconnected, start its normal sign-in flow. If it is saved but not attached to this task, use Manus's native connector picker or authorization request to bring it into this conversation.
2. For a first connection, use the native Manus operation for adding a remote custom MCP server. Its name is `ChatCut`, transport is HTTP, and its server URL is `https://api.chatcut.io/api/external-mcp/mcp`. Use the server's OAuth flow with the default settings. Present the normal user authorization prompt and resume this same task after the user approves. Leave custom headers empty and keep credentials in the authorization screen.
3. Call ChatCut's **list_projects** tool through the connector, once, with `limit: 1` and the search `query: "ChatCut connection check"`. Both zero matches and one match are successful reads. Report whether the connector was added or reused, the tool called, and the matching count. Keep all project names and identifiers private.
4. If the action needed to add, authorize, or attach the connector is unavailable in this task, tell the user the specific missing action or error and the next available Manus control. Only report a successful connection after a tool response.

[Manus connector settings](https://manus.im/app/plugins#settings/connectors) · [Manus custom MCP documentation](https://manus.im/docs/integrations/custom-mcp)

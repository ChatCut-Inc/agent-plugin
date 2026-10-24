# Repair and recheck

The helper is read-only with respect to host configuration and credentials.
Keep a separate repair note beside the report with: observed problem and source,
authorized change, prior state/rollback, actual commands, and same-host recheck
result. This is agent-recorded evidence, not a collector-verified recovery claim.

## Missing manual registration — bounded configuration repair

Only use this path when the actual host reports that the named registration is
absent and the user wants that host connected. A plugin-managed server should
be enabled/installed through its existing plugin UI; do not add a duplicate
manual server to bypass a failed plugin installation. An absent tool list alone
does not establish missing registration.

A failed lookup is not necessarily an absent registration. Record the exact
host response and its source/scope. Only an explicit no-entry response from a
completed host lookup (or a successful complete scoped inventory) permits
`lookupResult: not_found` in the registration observation. Permission errors,
configuration parse failures, unavailable CLI/status APIs and generic nonzero
exit codes leave registration existence unknown: use `unavailable` or omit
the field, retain the error and check the same scope read-only. Do not add or
replace an entry as a response to an unreadable state. A `found` response can
coexist with a later connection/health failure and must not trigger registration.

Confirm the intended endpoint/environment from the user's setup or trusted
package metadata. Production is `https://api.chatcut.io/api/external-mcp/mcp`;
preserve beta/dev when selected. Check local CLI help for the installed version.
Examples below register **only a missing manual server**, using a scope the user
selected. Do not overwrite an existing registration or display headers/tokens.

Codex CLI:

```text
codex mcp get chatcut
codex mcp add chatcut --url <intended-url>
codex mcp get chatcut
```

Codex writes to the selected `CODEX_HOME`. Do not change that value to a different
host/profile as a workaround. The exact absent-entry lookup can be retained as
the `host_registration` observation. Rollback for a newly created manual entry
is `codex mcp remove chatcut` in that same home. Lookup success proves the entry
exists, not that OAuth, initialization or tools work.

Claude Code CLI:

```text
claude mcp get chatcut
claude mcp add --transport http --scope local chatcut <intended-url>
claude mcp get chatcut
```

Use the actual desired scope (`local`, `project`, `user`) rather than silently
escalating it. For the newly added local entry, rollback is
`claude mcp remove --scope local chatcut`. Plugin server names such as
`plugin:chatcut:chatcut` are not manual entries to recreate. Verify commands
against the installed CLI; report unavailable CLI capabilities explicitly.

## Authentication required — guided host action

An initial sign-in requirement is normal setup, not proof of a failure. For an
already registered Codex manual server, the host supports
`codex mcp login <actual-server-name>`. For Claude Code, use `/mcp` and choose the
actual server's authentication action in the interactive host. Recent CLI versions
also support `claude mcp login <actual-server-name>`; verify local help before
offering that command on an older version. A browser/account sign-in alone is insufficient.

A bounded Codex SQLite startup WARN from `codex_mcp::rmcp_client` can explicitly
report `OAuth refresh credentials for server chatcut are missing an authorization
server issuer; authorization required: OAuth authorization required`. Preserve
that native response, source and record time as **unassociated host evidence**.
Check the same host/server's current authentication status first; offer its normal
authorization action only if authorization is still required and the user wants
to reconnect. A historical warning does
not establish which original request failed, why the stored refresh state lacks
metadata, or that credentials should be removed. Do not derive this guidance
from a generic WARN, busy error or timeout. An explicitly observed `oauth` failure
is an authentication-attempt fact; a timeout there is not proof of network or
registration failure. A `browser_render` error while tools remain connected is
a tool execution fact and does not call for reconnecting MCP.

The collector does not perform OAuth login. Use the host's guided action and respect
the user's login/permission boundaries; never inspect or clear credential
stores, copy tokens, or change OAuth settings. If a login attempt fails, preserve
the actual new error separately from the original failure. After authorized
sign-in, verify authenticated status and a safe read in that same host.

## Explicit errors — scoped next checks

Keep these as distinct observations, using the actual original error or a
separately attributed server record. A server-side record without an established
request match must not be inserted as a stage of the local report.

- `Another External MCP request is still using this session` confirms that this
  request received a session-occupied rejection. Check existing in-flight
  operations in the same project/session and their status first. It does not
  establish a stuck lock. Do not clear locks or issue concurrent retries.
- An original call timing out after 300 seconds establishes that call's timeout.
  Preserve its original time and call/request IDs when available; confirm whether
  its existing backend operation completed or is still running through a safe
  status read. Do not infer session occupancy, cancel it or replay a mutation.
- `Waiting for browser execution timed out. The browser job may still be running.`
  is an execution-wait timeout, not proof of an MCP disconnect or a failed job.
  Read the existing job's status using its actual job/project ID before any next
  action. If no job ID is available, retain that gap; do not submit the job again.
- `Bad Request: Unsupported protocol version: <requested> (supported versions:
  <versions>)` is an explicit protocol rejection. Preserve the original text,
  requested/supported versions and actual host/server versions; inspect their
  protocol negotiation and check a compatible combination within that setup.
  If the matched server record shows final OAuth acceptance, do not respond by
  repeatedly logging in. Do not automatically edit protocol headers or downgrade
  a global CLI. Earlier JWT-verification errors alone do not override the final
  OAuth verification result.

An anonymous 401 remains an expected authentication challenge. An authenticated
request's explicit `Invalid bearer token` rejection is different: preserve the
final OAuth result and its supplied reason. Use the existing host's normal
authorization action when required; do not invent an expiry reason when the
original reason is unavailable or treat an intermediate JWT rejection followed
by OAuth acceptance as failed authentication.

## Other failures

For startup/metadata/network errors, use observed status, original code/cause,
bounded native logs and later probe failures to choose the next read-only check.
No generic repair for 300-second timeouts, busy requests, malformed framing,
TLS interception or a missing historical log has been established. Do not clear
locks, kill processes, restart the host, increase timeouts or switch environment
based only on those symptoms. Preserve the report and prepare the private
feedback draft when the cause remains unconfirmed.

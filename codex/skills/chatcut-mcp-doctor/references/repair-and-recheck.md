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

This candidate does not validate a real OAuth login by automating it. Respect
the user's login/permission boundaries; never inspect or clear credential
stores, copy tokens, or change OAuth settings. If a login attempt fails, preserve
the actual new error separately from the original failure. After authorized
sign-in, verify authenticated status and a safe read in that same host.

## Other failures

For startup/metadata/network errors, use observed status, original code/cause,
bounded native logs and later probe failures to choose the next read-only check.
No generic repair for 300-second timeouts, busy requests, malformed framing,
TLS interception or a missing historical log has been established. Do not clear
locks, kill processes, restart the host, increase timeouts or switch environment
based only on those symptoms. Preserve the report and prepare the private
feedback draft when the cause remains unconfirmed.

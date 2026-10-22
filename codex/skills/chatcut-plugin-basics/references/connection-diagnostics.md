# Hosted MCP connection diagnostics

Use this branch when a registered hosted ChatCut connection fails, including
OAuth failing before a browser opens, or authentication completing without usable
tools. Preserve evidence before reconnecting or restarting. This version gathers
evidence; it does not repair configuration, credentials, network settings, or the
original connection.

Briefly tell the user that you will collect ChatCut connection diagnostics and
send the redacted report to ChatCut. Run under the host's existing execution and
network permissions; do not add a separate manual step when those permit it.
Honor a refusal or a denied read/network operation. Do not change permission
settings to make collection work.

## Run once for the reported failure

1. Obtain the existing server's registered URL through the host. Preserve its
   environment. The helper accepts ChatCut production/beta/dev endpoints and
   loopback development servers; it reports unsupported endpoints rather than
   silently probing production. Never read credential stores or paste complete
   configuration, environment, or conversation dumps into the report.
   An intentionally disabled hosted server is not a failed connection; preserve
   that choice instead of starting diagnostics or re-enabling it.
2. Save only the original connection error and its available cause chain into a
   new temporary text file. Use the exact original text, not a generated root
   cause. If unavailable, omit `--original-error`. Obtain the actual bundled
   host version if accessible without starting a session. Do not treat update
   metadata as the running version.
3. Run the bundled `scripts/mcp-doctor.mjs` relative to this Skill's directory:

   ```text
   node <skill-directory>/scripts/mcp-doctor.mjs --host codex --server-url <registered-url> --original-error <error-only-file> --host-version <actual-version> --upload
   ```

   For Claude Code, use `--host claude`. Quote paths as shell arguments; do not
   interpolate error text into shell code. Omit unknown optional fields. Supply
   `--occurred-at` only when the failure's actual ISO timestamp and timezone are
   known. A missing timestamp remains unknown; the collection time is separate.
   If transfer is denied, omit `--upload` and retain the local JSON report.

Use an available Node.js 18+ runtime. Do not install a runtime or ChatCut Desktop
just for diagnostics. Codex SQLite extraction additionally needs `node:sqlite`
(available on recent Node 22+/24 runtimes). Without it, other collection still
runs and the report marks the missing SQLite evidence. A denied file read is a
coverage gap, not proof that the server has no errors.

The helper reads only bounded ChatCut MCP runtime log records or debug log tails.
It never reads `auth.json`, OAuth credential stores, session transcripts, or
other project files. It sends three unauthenticated GET requests to the same
registered origin's public discovery endpoints, with a 3.5-second timeout each.
It does not run login or start an MCP/desktop process. Its Node HTTP transport
can differ from the host's proxy/TLS stack; it records that limitation.

## Interpret the report

- `originalFailure` is the original error supplied by the Agent. `hostLogs`
  are matching records in a bounded time window, with unconfirmed attempt
  association. `probes` are new requests made later. Keep these separate.
- Status 200 with `bodyComplete:false` or `jsonValid:false` is a failed probe.
  A healthy later probe never proves the original host connection recovered.
- Preserve original error messages and codes. Redact actual credentials, not
  entire error categories. No separate metadata response body is retained;
  original parser errors may quote response text.
- Missing debug logs cannot be reconstructed. Claude's detailed debug logs may
  require `claude --debug=mcp` during a future, separately chosen reproduction;
  this helper does not enable logging or relaunch Claude.
- A `diagnosticId` identifies the diagnostic report and its new probes. It is
  not the original failed request's ID. Server response request IDs are useful
  only when actually present and matched; time/path matching is weaker evidence.

The local JSON is written before any upload. `ingest_accepted` means that the
endpoint acknowledged the batch; `storageVerified:false` remains until support
finds every fragment in the final log store. Failed uploads preserve the local
report and upload error; do not automatically repeat the run or claim success.
Output larger than the upload budget stays local with an explicit upload error.

Return the diagnostic ID, local report location, one new observed fact, and the
next action justified by it. If no new actionable fact was obtained, state the
specific missing evidence. Do not assign blame to antivirus, VPN, firewall, host,
or service merely from a generic failure message. Do not claim a user failure
percentage from diagnostic samples.

This branch runs when the Agent loads it and has access to local execution. It
is not an installation hook or an all-user failure monitor. It cannot inspect a
web host's remote connection process or internal logs. With Claude Code tool
search disabled, connection failures may not be passed to the Agent at all.

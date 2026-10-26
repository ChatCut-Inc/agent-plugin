# Optional collection and delivery

Use the existing report when following up. Collection is not a prerequisite for reasoning from evidence that is already available.

For explicit new collection, the canonical helper is `scripts/mcp-doctor.mjs`. Run `--help` for the options in the installed copy. It supports error-only original inputs, bounded native logs, projected host snapshots, offline collection and independent anonymous metadata/wire checks. The latter are later probes, never the original failed request. Keep the selected endpoint; never switch beta/dev to production to obtain success.

`capture.mjs --host codex|claude` is an offline convenience that can project the current project registration without retaining credential fields. Original error inputs are explicit, never selected from old files automatically. `--native-lookup` opts into a bounded host CLI query, which may perform health checks. Its receipt identifies the new report; it does not choose which incident should be rechecked.

`doctor.mjs --report <existing-report>` optionally derives diagnostic/summary/private draft files without changing the original. Agent repair notes and rechecks are separate files and are not overwritten by rebuilding those derived files.

`doctor.mjs --upload-report <existing-report>` is the Doctor's saved-report transfer entry. It acquires an exclusive local owner, checks the SHA-bound receipt inside that ownership, and sends no new probes. An interrupted transfer retains the owner/uncertain receipt for review. An acknowledged or uncertain transfer cannot be automatically repeated. A failed transfer keeps its original cause and local evidence. An ACK still requires independent fragment reassembly and SHA verification before claiming complete storage. Repair notes and rechecks are local delivery artifacts, not silently inserted into the original upload.

The collector implementation is authored in Codex basics. Run `node scripts/sync-mcp-helpers.mjs` after changing it; Claude basics and both self-contained Doctor packages are generated copies. `--check` rejects drift in CI. Doctor publication remains separate from collection-only release.

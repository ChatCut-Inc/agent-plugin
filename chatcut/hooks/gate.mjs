#!/usr/bin/env node
// ChatCut MCP gate (PreToolUse).
//
// Denies a ChatCut tool call until the chatcut-plugin-basics-claude skill has
// been loaded in this session. The companion PostToolUse hook (mark-read.mjs)
// writes a per-session marker whenever that skill runs — whether Claude loaded
// it on its own (the normal case) or in response to this gate's deny. Once the
// marker exists, every ChatCut tool call passes through silently.
//
// This hook NEVER injects the guide itself: the full guide reaches the model
// through the normal Skill-loading path, so it is not subject to the 10,000
// character cap on hook output. This gate only ever emits a short deny reason.
//
// Wired from hooks.json with matcher "mcp__plugin_chatcut_chatcut__.*".
// No third-party dependencies; Node >= 18 built-ins only. Fails OPEN: any
// unexpected error exits 0 with no output so the gate can never brick ChatCut.

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const REQUIRED_SKILL = "chatcut-plugin-basics-claude";

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf8"); // fd 0; Claude Code closes it after writing
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markerPath(sessionId) {
  const base = process.env.CLAUDE_PLUGIN_DATA || join(tmpdir(), "chatcut-plugin-gate");
  mkdirSync(base, { recursive: true });
  return join(base, `skill-loaded-${sessionId}.marker`);
}

function main() {
  const input = readStdinJson();
  const sessionId = String(input.session_id || "no-session").replace(/[^A-Za-z0-9_-]/g, "_");

  // Skill already loaded this session -> allow (silent pass-through).
  if (existsSync(markerPath(sessionId))) return;

  // Not loaded yet -> block this ChatCut call and tell Claude to load the skill.
  const reason =
    `Load the ${REQUIRED_SKILL} skill (via the Skill tool) and follow it before ` +
    `using ChatCut, then re-issue this exact tool call with the same arguments. ` +
    `This is a required one-time step per session — not an error, and not an ` +
    `auth or permission failure. Do not stop or re-authenticate; load the skill ` +
    `and continue.`;

  process.stdout.write(
    JSON.stringify({
      systemMessage: "Loading the ChatCut usage guide for this session…",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
}

try {
  main();
} catch {
  // Fail OPEN: never block a ChatCut tool call because the gate misbehaved.
  process.exit(0);
}

#!/usr/bin/env node
// ChatCut skill-load recorder (PostToolUse on the Skill tool).
//
// When Claude loads the chatcut-plugin-basics-claude skill, write a per-session
// marker so the ChatCut PreToolUse gate (gate.mjs) lets ChatCut tool calls
// through. This fires both when Claude loads the skill on its own (the normal
// case, so ChatCut calls are never blocked) and when it loads it in response to
// the gate's deny.
//
// The skill name is matched anywhere in the tool input, so this does not depend
// on the exact Skill-tool input field name or on plugin namespacing (e.g.
// "chatcut:chatcut-plugin-basics-claude" all contain the bare name).
//
// Wired from hooks.json with matcher "Skill".
// No third-party dependencies; Node >= 18 built-ins only. Fails silently.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const REQUIRED_SKILL = "chatcut-plugin-basics-claude";

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf8");
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

  // Only record loads of the required skill. This hook only fires on Skill
  // invocations (matcher "Skill"), so match the skill name anywhere in the
  // whole hook payload: that stays robust to the exact Skill-tool input shape
  // and namespacing. Matching too narrowly is the worse failure — the gate
  // would keep denying and Claude could loop reloading the skill.
  if (!JSON.stringify(input).includes(REQUIRED_SKILL)) return;

  const sessionId = String(input.session_id || "no-session").replace(/[^A-Za-z0-9_-]/g, "_");
  writeFileSync(markerPath(sessionId), new Date().toISOString() + "\n");
}

try {
  main();
} catch {
  // Never disturb the run because the recorder misbehaved.
  process.exit(0);
}

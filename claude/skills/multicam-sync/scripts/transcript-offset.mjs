#!/usr/bin/env node
// Deterministic transcript-based sync offsets for multicam-sync Part 2.
//
// Usage:  node transcript-offset.mjs utterances.json [--reference NAME] [--fps N]
//
// Input JSON: an array of utterances across ALL sources:
//   [{ "file": "MIC1.ogg", "start": 69264, "end": 74000, "text": "..." }, ...]
// `start`/`end` are milliseconds in that file's own clock. `end` is optional.
//
// Output JSON (stdout):
//   offsets.<file>.offsetSeconds — where that file's t=0 sits on the REFERENCE
//   clock: referenceTime = fileTime + offset. Positive = the file started
//   after the reference; negative = before.
//   placement.items[].fromSeconds — ready-to-use timeline position (earliest
//   file at 0, nothing negative). Place each file at fromSeconds with source
//   start 0. Floor durations at asset tails yourself.
//   offsets.<file>.confident is false when matched pairs disagree or the
//   early and late offsets drift beyond the printed toleranceMs. Do not place
//   a false result automatically.
//
// Method: coarse offset by shingle voting, fine offset as the median of
// near-identical utterance-pair deltas (Dice bigram similarity >= 0.85,
// normalized text >= 6 chars). Median beats mean: single pairs carry
// +-1-2 frames of ASR noise; the median of 100+ lands within a few ms.

import fs from "node:fs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.length === 0) {
  const header = fs
    .readFileSync(new URL(import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.startsWith("//"))
    .map((l) => l.slice(3))
    .join("\n");
  console.log(header);
  process.exit(0);
}

const inputPath = args.find((a) => !a.startsWith("--"));
const refArg = args.includes("--reference")
  ? args[args.indexOf("--reference") + 1]
  : null;
const fps = args.includes("--fps")
  ? Number(args[args.indexOf("--fps") + 1])
  : null;
const toleranceMs =
  fps && Number.isFinite(fps) && fps > 0
    ? Math.max(100, Math.ceil(3000 / fps))
    : 100;

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const norm = (s) => (s ?? "").replace(/[^\p{Script=Han}\p{L}\p{N}]/gu, "");

const byFile = new Map();
for (const u of raw) {
  const file = u.file ?? u.f;
  if (!file || typeof u.start !== "number") continue;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push({ start: u.start, text: norm(u.text) });
}
for (const utts of byFile.values()) utts.sort((a, b) => a.start - b.start);
if (byFile.size < 2) {
  console.error("Need utterances from at least two files.");
  process.exit(1);
}

// Reference: named, or the file with the most transcribed characters.
const reference =
  refArg ??
  [...byFile.entries()].sort(
    (a, b) =>
      b[1].reduce((n, u) => n + u.text.length, 0) -
      a[1].reduce((n, u) => n + u.text.length, 0),
  )[0][0];
if (!byFile.has(reference)) {
  console.error(`Reference "${reference}" not found in input.`);
  process.exit(1);
}
const refUtts = byFile.get(reference);

// Coarse: 10-char shingles of reference text vote on second-bucketed deltas.
const SHINGLE = 10;
const refShingles = new Map();
for (const u of refUtts) {
  for (let i = 0; i + SHINGLE <= u.text.length; i += 5) {
    const key = u.text.slice(i, i + SHINGLE);
    if (!refShingles.has(key)) refShingles.set(key, []);
    refShingles.get(key).push(u.start);
  }
}
function coarseOffsetMs(utts) {
  const votes = new Map();
  for (const u of utts) {
    for (let i = 0; i + SHINGLE <= u.text.length; i += 5) {
      const starts = refShingles.get(u.text.slice(i, i + SHINGLE));
      if (!starts || starts.length > 4) continue; // ambiguous shingle
      for (const refStart of starts) {
        const bucket = Math.round((refStart - u.start) / 1000);
        votes.set(bucket, (votes.get(bucket) ?? 0) + 1);
      }
    }
  }
  let best = null;
  for (const [bucket, count] of votes) {
    if (!best || count > best.count) best = { bucket, count };
  }
  return best ? best.bucket * 1000 : null;
}

// Fine: Dice bigram similarity on normalized text.
function dice(a, b) {
  if (a === b) return 1;
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i + 2 <= s.length; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const A = grams(a);
  const B = grams(b);
  let inter = 0;
  let total = 0;
  for (const [, c] of A) total += c;
  for (const [, c] of B) total += c;
  for (const [g, c] of A) inter += Math.min(c, B.get(g) ?? 0);
  return total ? (2 * inter) / total : 0;
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const offsets = {};
for (const [file, utts] of byFile) {
  if (file === reference) {
    offsets[file] = {
      offsetSeconds: 0,
      pairs: refUtts.length,
      madMs: 0,
      driftMs: 0,
      toleranceMs,
      issues: [],
      confident: true,
    };
    continue;
  }
  const coarse = coarseOffsetMs(utts);
  if (coarse === null) {
    offsets[file] = {
      offsetSeconds: null,
      pairs: 0,
      madMs: null,
      driftMs: null,
      toleranceMs,
      issues: ["no_coarse_match"],
      confident: false,
    };
    continue;
  }
  const matchedPairs = [];
  for (const u of utts) {
    if (u.text.length < 6) continue;
    const target = u.start + coarse;
    let best = null;
    for (const r of refUtts) {
      if (r.start < target - 6000) continue;
      if (r.start > target + 6000) break;
      const s = dice(u.text, r.text);
      if (!best || s > best.s) best = { s, r };
    }
    if (best && best.s >= 0.85) {
      matchedPairs.push({ delta: best.r.start - u.start, start: u.start });
    }
  }
  if (matchedPairs.length < 10) {
    offsets[file] = {
      offsetSeconds: coarse / 1000,
      pairs: matchedPairs.length,
      madMs: null,
      driftMs: null,
      toleranceMs,
      issues: ["too_few_pairs"],
      confident: false,
    };
    continue;
  }
  const deltas = matchedPairs.map((pair) => pair.delta);
  const med = median(deltas);
  const madMs = Math.round(median(deltas.map((d) => Math.abs(d - med))));
  const chronological = [...matchedPairs].sort((a, b) => a.start - b.start);
  const edgeCount = Math.max(3, Math.floor(chronological.length / 3));
  const earlyMedian = median(
    chronological.slice(0, edgeCount).map((pair) => pair.delta),
  );
  const lateMedian = median(
    chronological.slice(-edgeCount).map((pair) => pair.delta),
  );
  const driftMs = Math.round(lateMedian - earlyMedian);
  const issues = [];
  if (madMs > toleranceMs) issues.push("inconsistent_pairs");
  if (Math.abs(driftMs) > toleranceMs) issues.push("early_late_drift");
  offsets[file] = {
    offsetSeconds: Math.round(med) / 1000,
    pairs: deltas.length,
    madMs,
    driftMs,
    toleranceMs,
    issues,
    confident: issues.length === 0,
  };
}

// Placement: earliest confident file becomes timeline zero; nothing negative.
const confident = Object.entries(offsets).filter(([, o]) => o.confident);
const zero = Math.min(...confident.map(([, o]) => o.offsetSeconds));
const placement = {
  note: "Place each file at fromSeconds with source start 0. Files marked confident:false need manual verification before placement.",
  items: confident
    .map(([file, o]) => ({
      file,
      fromSeconds: Math.round((o.offsetSeconds - zero) * 1000) / 1000,
      ...(fps
        ? { fromFrames: Math.round((o.offsetSeconds - zero) * fps) }
        : {}),
    }))
    .sort((a, b) => a.fromSeconds - b.fromSeconds),
};

console.log(
  JSON.stringify(
    {
      convention:
        "referenceTime = fileTime + offsetSeconds. Positive means the file started after the reference; negative means it started before.",
      reference,
      offsets,
      placement,
    },
    null,
    2,
  ),
);

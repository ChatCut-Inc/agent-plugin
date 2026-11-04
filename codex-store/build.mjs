#!/usr/bin/env node
// Builds the ZIP uploaded to the existing ChatCut entry in the OpenAI plugin
// directory (shared by Codex and ChatGPT) from the Hosted `codex/` package.
//
// Usage:
//   node codex-store/build.mjs [--out <dir>] [--no-zip]
//
// The store copy differs from `codex/` in exactly three ways, all driven by
// `codex-store/listing.json`:
// - `name` is the dashboard identity (`chatcut-desktop`). ZIP uploads keep the
//   dashboard's plugin identity, and Desktop removes `chatcut@*` plugins when it
//   connects to Codex, so the store entry must not be renamed to `chatcut`.
// - The MCP server has no headers: public submission rejects nonempty server
//   headers. The install channel and host surface can travel only as URL
//   parameters the backend already reads (`chatcutInstallSource`,
//   `chatcutMcpSurface`). Codex keys stored OAuth tokens by the exact server
//   URL and starts plugin MCP sign-in only on a fresh install, not when an
//   update arrives, so marking the plugin's own server URL
//   (`markChannelInMcpUrl`) would leave existing users without tools until they
//   run `codex mcp login`. A version parameter would do that on every release.
// - The direct-registration command in `chatcut-plugin-basics` can carry the
//   marked URL (`markChannelInRegistration`): that path always signs in fresh,
//   so users who register the server by hand keep the channel at no cost.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = "codex";
const PACKAGE_ENTRIES = [".codex-plugin", ".mcp.json", "assets", "skills"];
const REGISTRATION_SKILL = "skills/chatcut-plugin-basics/SKILL.md";
const HOSTED_MCP_URL = "https://api.chatcut.io/api/external-mcp/mcp";

// Limits from https://developers.openai.com/plugins/deploy/submission
// (checked 2026-11-03); Codex itself enforces the defaultPrompt limits.
const LIMITS = {
  displayName: 30,
  shortDescription: 30,
  longDescription: 4000,
  developerName: 80,
  capabilities: 20,
  capabilityLength: 120,
  defaultPrompts: 3,
  defaultPromptLength: 128,
  urlLength: 1024,
  imageBytes: 5 * 1024 * 1024,
  imageMinSide: 48,
  imageMaxSide: 4096,
};
const LISTING_URL_FIELDS = [
  "websiteURL",
  "supportURL",
  "privacyPolicyURL",
  "termsOfServiceURL",
];
// Listing copy sells the result. Setup wording belongs to the skills, and the
// plugin guidelines forbid advertising pricing, trials, or upgrades.
const SETUP_WORDING = /\b(install|connect)/i;
const COMMERCE_WORDING =
  /\b(free|trial|discount|subscription|credits?|pricing|upgrade)\b/i;

function channelMcpUrl(baseUrl, listing) {
  const url = new URL(baseUrl);
  url.searchParams.set("chatcutInstallSource", listing.installSource);
  url.searchParams.set("chatcutMcpSurface", "codex");
  return url.href;
}

export function storeMcpUrl(baseUrl, listing) {
  return listing.markChannelInMcpUrl ? channelMcpUrl(baseUrl, listing) : baseUrl;
}

export function storeRegistrationUrl(baseUrl, listing) {
  return listing.markChannelInRegistration ? channelMcpUrl(baseUrl, listing) : baseUrl;
}

export function buildStoreManifest(manifest, listing) {
  const { mcpServers, ...rest } = manifest;
  return {
    ...rest,
    name: listing.pluginName,
    // Fallback for a portal that refuses MCP on the skills-only entry: the
    // marked registration command in the skill then carries the channel alone.
    ...(listing.includeMcpServer !== false && { mcpServers }),
    interface: { ...manifest.interface, screenshots: listing.screenshots },
  };
}

function packageEntries(listing) {
  return PACKAGE_ENTRIES.filter(
    (entry) => entry !== ".mcp.json" || listing.includeMcpServer !== false,
  );
}

export function buildStoreMcpConfig(mcp, listing) {
  const mcpServers = Object.fromEntries(
    Object.entries(mcp.mcpServers).map(([name, server]) => {
      const { headers, http_headers, env_http_headers, ...rest } = server;
      return [
        name,
        {
          ...rest,
          oauth_resource: server.oauth_resource ?? server.url,
          url: storeMcpUrl(server.url, listing),
        },
      ];
    }),
  );
  return { mcpServers };
}

export function markSkillRegistration(skillText, url) {
  const plain = `--url ${HOSTED_MCP_URL} --oauth-resource`;
  const occurrences = skillText.split(plain).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `${REGISTRATION_SKILL}: expected one direct-registration command, found ${occurrences}`,
    );
  }
  return url === HOSTED_MCP_URL
    ? skillText
    : skillText.replace(plain, `--url '${url}' --oauth-resource`);
}

function checkUrl(field, value, problems) {
  if (typeof value !== "string" || !value) {
    problems.push(`interface.${field} is required`);
    return;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    problems.push(`interface.${field} is not a URL`);
    return;
  }
  if (url.protocol !== "https:") problems.push(`interface.${field} must be HTTPS`);
  if (url.username || url.password) problems.push(`interface.${field} embeds credentials`);
  if (value.length > LIMITS.urlLength) problems.push(`interface.${field} exceeds ${LIMITS.urlLength} characters`);
}

function checkLength(field, value, limit, problems, { required = true } = {}) {
  if (typeof value !== "string" || !value.trim()) {
    if (required) problems.push(`interface.${field} is required`);
    return;
  }
  if ([...value].length > limit) problems.push(`interface.${field} exceeds ${limit} characters`);
}

async function checkImage(field, path, root, problems) {
  if (typeof path !== "string" || !path.startsWith("./")) {
    problems.push(`${field} must be a ./-prefixed path`);
    return;
  }
  let bytes;
  try {
    bytes = await readFile(join(root, path));
  } catch {
    problems.push(`${field} ${path} is missing from the package`);
    return;
  }
  if (bytes.length > LIMITS.imageBytes) problems.push(`${field} ${path} exceeds 5 MiB`);
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(png)) {
    problems.push(`${field} ${path} must be a PNG`);
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (Math.min(width, height) < LIMITS.imageMinSide || Math.max(width, height) > LIMITS.imageMaxSide) {
    problems.push(`${field} ${path} is ${width}x${height}; sides must be ${LIMITS.imageMinSide}-${LIMITS.imageMaxSide} px`);
  }
  if (field !== "interface.screenshots" && width !== height) {
    problems.push(`${field} ${path} must be square`);
  }
}

/** Returns every submission problem found; an empty list means the package passes. */
export async function validateStorePackage({ manifest, mcp, root }) {
  const problems = [];
  const ui = manifest.interface ?? {};

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name ?? "")) {
    problems.push("name must use lowercase letters, numbers, and single hyphens");
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) problems.push("version must be semver");
  if ("apps" in manifest) problems.push("apps / .app.json cannot be submitted");
  if ("hooks" in manifest) problems.push("lifecycle hooks cannot be submitted");

  checkLength("displayName", ui.displayName, LIMITS.displayName, problems);
  checkLength("shortDescription", ui.shortDescription, LIMITS.shortDescription, problems);
  checkLength("longDescription", ui.longDescription, LIMITS.longDescription, problems);
  checkLength("developerName", ui.developerName, LIMITS.developerName, problems);
  checkLength("category", ui.category, Infinity, problems);
  for (const field of LISTING_URL_FIELDS) checkUrl(field, ui[field], problems);

  const capabilities = ui.capabilities;
  if (!Array.isArray(capabilities)) {
    problems.push("interface.capabilities is required (use [] for none)");
  } else if (
    capabilities.length > LIMITS.capabilities ||
    capabilities.some((item) => typeof item !== "string" || item.length > LIMITS.capabilityLength)
  ) {
    problems.push("interface.capabilities exceeds the item or length limit");
  }

  const prompts = ui.defaultPrompt ?? [];
  if (!Array.isArray(prompts) || prompts.length !== LIMITS.defaultPrompts) {
    problems.push(`interface.defaultPrompt must list ${LIMITS.defaultPrompts} starter prompts`);
  } else {
    if (new Set(prompts).size !== prompts.length) problems.push("interface.defaultPrompt entries must be unique");
    for (const prompt of prompts) {
      if ([...prompt].length > LIMITS.defaultPromptLength) problems.push(`starter prompt exceeds ${LIMITS.defaultPromptLength} characters: ${prompt}`);
      if (prompt.includes("@")) problems.push(`starter prompt must not @mention: ${prompt}`);
    }
  }
  for (const [field, text] of [
    ["shortDescription", ui.shortDescription],
    ["longDescription", ui.longDescription],
    ...(Array.isArray(prompts) ? prompts.map((prompt) => ["defaultPrompt", prompt]) : []),
  ]) {
    if (SETUP_WORDING.test(text ?? "")) problems.push(`interface.${field} should describe value, not setup: ${text}`);
    if (COMMERCE_WORDING.test(text ?? "")) problems.push(`interface.${field} must not advertise pricing: ${text}`);
  }

  if (ui.brandColor && !/^#[0-9A-Fa-f]{6}$/.test(ui.brandColor)) problems.push("interface.brandColor must be #RRGGBB");
  await checkImage("interface.logo", ui.logo, root, problems);
  await checkImage("interface.composerIcon", ui.composerIcon, root, problems);
  for (const screenshot of ui.screenshots ?? []) {
    await checkImage("interface.screenshots", screenshot, root, problems);
  }

  for (const [name, server] of Object.entries(mcp?.mcpServers ?? {})) {
    for (const key of ["headers", "http_headers", "env_http_headers"]) {
      if (server[key] && Object.keys(server[key]).length) {
        problems.push(`mcpServers.${name}.${key} must be empty for public submission`);
      }
    }
    if (!server.url?.startsWith("https://")) problems.push(`mcpServers.${name}.url must be HTTPS`);
    if (!server.oauth_resource) problems.push(`mcpServers.${name}.oauth_resource is required`);
  }
  return problems;
}

/** Codex's OAuth callback id for a server URL (SHA-256 of the full URL, as in rmcp-client). */
export function codexOAuthCallbackId(serverUrl) {
  const url = new URL(serverUrl);
  url.hash = "";
  return createHash("sha256").update(url.href).digest().subarray(0, 9).toString("base64url");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function stageStorePackage({ repoRoot = REPO_ROOT, outDir }) {
  const sourceDir = join(repoRoot, SOURCE_DIR);
  const listing = await readJson(join(repoRoot, "codex-store", "listing.json"));
  const manifest = buildStoreManifest(
    await readJson(join(sourceDir, ".codex-plugin", "plugin.json")),
    listing,
  );
  const mcp = manifest.mcpServers
    ? buildStoreMcpConfig(await readJson(join(sourceDir, ".mcp.json")), listing)
    : null;
  const entries = packageEntries(listing);
  const stageDir = join(outDir, manifest.name);

  await rm(stageDir, { recursive: true, force: true });
  await mkdir(stageDir, { recursive: true });
  for (const entry of entries) {
    await cp(join(sourceDir, entry), join(stageDir, entry), {
      recursive: true,
      dereference: true,
      filter: (path) => basename(path) !== ".DS_Store",
    });
  }
  await writeFile(join(stageDir, ".codex-plugin", "plugin.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (mcp) await writeFile(join(stageDir, ".mcp.json"), `${JSON.stringify(mcp, null, 2)}\n`);
  const skillPath = join(stageDir, REGISTRATION_SKILL);
  const serverUrl = storeMcpUrl(HOSTED_MCP_URL, listing);
  const registrationUrl = storeRegistrationUrl(HOSTED_MCP_URL, listing);
  await writeFile(skillPath, markSkillRegistration(await readFile(skillPath, "utf8"), registrationUrl));

  const problems = await validateStorePackage({ manifest, mcp, root: stageDir });
  return { entries, listing, manifest, mcp, problems, registrationUrl, serverUrl, stageDir };
}

async function main(argv) {
  const outIndex = argv.indexOf("--out");
  const outDir = resolve(outIndex >= 0 ? argv[outIndex + 1] : join(REPO_ROOT, "dist", "codex-store"));
  const { entries, listing, manifest, problems, registrationUrl, serverUrl, stageDir } = await stageStorePackage({ outDir });
  if (problems.length) {
    console.error(`Store package has ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Staged ${manifest.name} ${manifest.version} for ${listing.dashboardPluginId} at ${stageDir}`);
  console.log(`MCP URL: ${serverUrl} (Codex OAuth callback id ${codexOAuthCallbackId(serverUrl)})${manifest.mcpServers ? "" : "; MCP server omitted, skill registration only"}`);
  console.log(`Skill registration URL: ${registrationUrl} (Codex OAuth callback id ${codexOAuthCallbackId(registrationUrl)})`);
  if (argv.includes("--no-zip")) return;

  const zipPath = join(outDir, `${manifest.name}-${manifest.version}.zip`);
  await rm(zipPath, { force: true });
  execFileSync("zip", ["-X", "-q", "-r", zipPath, ...entries, "-x", "*/.DS_Store"], { cwd: stageDir });
  const zip = await readFile(zipPath);
  console.log(`ZIP: ${zipPath} (${(await stat(zipPath)).size} bytes, sha256 ${createHash("sha256").update(zip).digest("hex")})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}

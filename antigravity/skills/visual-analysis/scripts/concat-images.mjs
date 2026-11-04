#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const parsed = parseArgs(process.argv.slice(2));
const outputPath = resolve(parsed.output);
const outputExtension = extname(outputPath).toLowerCase();

if (![".jpg", ".jpeg", ".png", ".webp"].includes(outputExtension)) {
  fail("--output must end in .jpg, .jpeg, .png, or .webp");
}
if (parsed.inputs.length === 0 || parsed.inputs.length > 25) {
  fail("Pass between 1 and 25 input images");
}
if (parsed.captions.length && parsed.captions.length !== parsed.inputs.length) {
  fail("Pass exactly one --caption per input image, or omit captions entirely");
}

const inputs = parsed.inputs.map((input) => resolve(input));
for (const input of inputs) {
  if (!existsSync(input)) fail(`Input image does not exist: ${input}`);
}

mkdirSync(dirname(outputPath), { recursive: true });
const temporaryDirectory = mkdtempSync(
  join(dirname(outputPath), ".concat-images-"),
);
const imageMagick = resolveImageMagick();
// Some ImageMagick builds cannot discover installed fonts without fontconfig.
const captions = parsed.captions.length
  ? parsed.captions
  : inputs.map(defaultCaption);
const captionFont = [
  ...(captions.every((caption) => /^[\x00-\x7F]*$/.test(caption))
    ? [
        "/System/Library/Fonts/Menlo.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
      ]
    : []),
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  join(process.env.WINDIR ?? "C:\\Windows", "Fonts", "arial.ttf"),
].find((font) => existsSync(font));

try {
  const prepared = inputs.map((input, index) => {
    const preparedPath = join(temporaryDirectory, `${index}.png`);
    const args = imageMagick.prefix.concat([
      input,
      ...(parsed.crop ? ["-crop", parsed.crop, "+repage"] : []),
      "-auto-orient",
      "+profile",
      "icc",
      "-resize",
      `${parsed.tileWidth}x${parsed.tileWidth}>`,
      preparedPath,
    ]);
    run(imageMagick.command, args, `prepare ${input}`);
    return preparedPath;
  });

  const dimensions = run(
    imageMagick.command,
    imageMagick.prefix.concat(prepared, ["-format", "%w %h\n", "info:"]),
    "read image dimensions",
  )
    .trim()
    .split("\n")
    .map((line) => line.split(" ").map(Number));
  const aspect =
    Math.max(...dimensions.map(([width]) => width)) /
    Math.max(...dimensions.map(([, height]) => height));
  const captionHeight = parsed.noCaptions ? 0 : 28;
  let columns = parsed.columns ?? 1;
  let tileWidth = 0;
  for (
    let candidate = 1;
    candidate <= Math.max(inputs.length, parsed.columns ?? 1);
    candidate++
  ) {
    if (parsed.columns && candidate !== parsed.columns) continue;
    const rows = Math.ceil(inputs.length / candidate);
    const width = Math.floor(
      Math.min(
        parsed.tileWidth,
        1568 / candidate - 2 * parsed.gap,
        (Math.floor(1568 / rows) - 2 * parsed.gap - captionHeight) * aspect,
      ),
    );
    if (width > tileWidth) {
      tileWidth = width;
      columns = candidate;
    }
  }
  if (tileWidth < 1) fail("The requested columns/gap leave no room for images");
  const tileHeight = Math.max(1, Math.floor(tileWidth / aspect));
  const captioned = prepared.map((input, index) => {
    const output = join(temporaryDirectory, `captioned-${index}.png`);
    run(
      imageMagick.command,
      imageMagick.prefix.concat([
        input,
        "-resize",
        `${tileWidth}x${tileHeight}`,
        "-background",
        "#000000",
        "-gravity",
        "center",
        "-extent",
        `${tileWidth}x${tileHeight}`,
        ...(parsed.noCaptions
          ? []
          : [
              "(",
              "-size",
              `${tileWidth}x${captionHeight}`,
              "xc:#eeeeee",
              ...(captionFont ? ["-font", captionFont] : []),
              "-fill",
              "#111111",
              "-stroke",
              "none",
              "-pointsize",
              "18",
              "-gravity",
              "west",
              "-annotate",
              "+5+0",
              captions[index],
              ")",
              "-append",
            ]),
        output,
      ]),
      "add caption below image",
    );
    return output;
  });
  const montageArgs = imageMagick.montagePrefix.concat([
    ...(captionFont ? ["-font", captionFont] : []),
    ...captioned,
    "-tile",
    `${columns}x`,
    "-geometry",
    `+${parsed.gap}+${parsed.gap}`,
    "-background",
    "#eeeeee",
    outputPath,
  ]);
  run(imageMagick.command, montageArgs, "compose contact sheet");

  process.stdout.write(
    `${JSON.stringify(
      {
        columns,
        crop: parsed.crop ?? null,
        inputs: inputs.map((input, index) => ({
          caption: captions[index],
          path: input,
        })),
        ...(parsed.noCaptions
          ? {}
          : {
              note: "The light-gray strips below the images contain tool-added position labels, not video content.",
            }),
        width: columns * (tileWidth + 2 * parsed.gap),
        height:
          Math.ceil(inputs.length / columns) *
          (tileHeight + captionHeight + 2 * parsed.gap),
        outputPath,
        rows: Math.ceil(inputs.length / columns),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

// Frame filenames carry the exact coordinate returned by the preview tools.
function defaultCaption(input) {
  const name = basename(input, extname(input));
  const timeline =
    name.match(/^timeline-(\d+)f-\d+ms-\d+$/) ??
    name.match(/^timeline-frame-(\d+)$/);
  if (timeline) return `f${timeline[1]}`;
  const source =
    name.match(/^source-(\d+)ms-\d+$/) ?? name.match(/^asset-frame-(\d+)ms$/);
  if (source) return `${(Number(source[1]) / 1000).toFixed(3)}s`;
  return basename(input);
}

function parseArgs(args) {
  const result = {
    noCaptions: false,
    captions: [],
    columns: undefined,
    crop: undefined,
    gap: 0,
    inputs: [],
    output: undefined,
    tileWidth: 720,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--no-captions") result.noCaptions = true;
    else if (arg === "--caption")
      result.captions.push(requiredValue(args, ++index, arg));
    else if (arg === "--columns")
      result.columns = boundedInteger(
        requiredValue(args, ++index, arg),
        arg,
        1,
        9,
      );
    else if (arg === "--crop") result.crop = requiredValue(args, ++index, arg);
    else if (arg === "--gap")
      result.gap = boundedInteger(
        requiredValue(args, ++index, arg),
        arg,
        0,
        100,
      );
    else if (arg === "--output")
      result.output = requiredValue(args, ++index, arg);
    else if (arg === "--tile-width")
      result.tileWidth = boundedInteger(
        requiredValue(args, ++index, arg),
        arg,
        100,
        2000,
      );
    else if (arg === "--help" || arg === "-h") usage(0);
    else if (arg.startsWith("-")) fail(`Unknown option: ${arg}`);
    else result.inputs.push(arg);
  }
  if (!result.output) fail("--output is required");
  if (result.crop && !/^\d+x\d+\+\d+\+\d+$/.test(result.crop)) {
    fail("--crop must use WIDTHxHEIGHT+X+Y pixel geometry");
  }
  return result;
}

function resolveImageMagick() {
  if (commandExists("magick")) {
    return { command: "magick", montagePrefix: ["montage"], prefix: [] };
  }
  if (commandExists("convert") && commandExists("montage")) {
    return { command: "convert", montagePrefix: [], prefix: [] };
  }
  fail("ImageMagick is unavailable; expected magick or convert + montage");
}

function commandExists(command) {
  return (
    spawnSync("sh", ["-c", `command -v ${command}`], {
      stdio: "ignore",
    }).status === 0
  );
}

function run(command, args, step) {
  const executable =
    step === "compose contact sheet" && command === "convert"
      ? "montage"
      : command;
  const result = spawnSync(executable, args, { encoding: "utf8" });
  if (result.status !== 0) {
    fail(
      `${step} failed: ${(result.stderr || result.stdout || "unknown error").trim()}`,
    );
  }
  return result.stdout;
}

function requiredValue(args, index, option) {
  const value = args[index];
  if (!value) fail(`${option} requires a value`);
  return value;
}

function boundedInteger(value, option, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    fail(`${option} must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}

function fail(message) {
  process.stderr.write(`concat-images: ${message}\n`);
  process.exit(1);
}

function usage(exitCode) {
  process.stdout.write(
    "Usage: concat-images.mjs --output <image> [--columns N] [--crop WxH+X+Y] [--caption text ...] <images...>\n",
  );
  process.exit(exitCode);
}

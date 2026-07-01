import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const rawAudioDir = path.join(projectRoot, "tmp", "raw-audio");
const outputRoot = path.join(projectRoot, "public", "assets", "audio", "bgm");
const CLIP_SECONDS = 30;
const FADE_IN_SECONDS = 1.5;
const FADE_OUT_SECONDS = 2.5;
const FADE_OUT_START = CLIP_SECONDS - FADE_OUT_SECONDS;

const mappings = [
  ["bgm-role-00-street.mp3", "roles/bgm-role-00.mp3"],
  ["bgm-role-01-maid.mp3", "roles/bgm-role-01.mp3"],
  ["bgm-role-02-guard.mp3", "roles/bgm-role-02.mp3"],
  ["bgm-role-03-apprentice-maid.mp3", "roles/bgm-role-03.mp3"],
  ["bgm-role-04-attendant.mp3.mp3", "roles/bgm-role-04.mp3"],
  ["bgm-role-05-guard-close.mp3.mp3", "roles/bgm-role-05.mp3"],
  ["bgm-role-06-personal-maid.mp3.mp3", "roles/bgm-role-06.mp3"],
  ["bgm-role-07-assistant-steward.mp3.mp3", "roles/bgm-role-07.mp3"],
  ["bgm-role-08-household-chief.mp3.mp3", "roles/bgm-role-08.mp3"],
  ["bgm-role-09-personal-secretary.mp3.mp3", "roles/bgm-role-09.mp3"],
  ["bgm-role-10-chief-butler.mp3.mp3", "roles/bgm-role-10.mp3"],
  ["bgm-role-11-grand-steward.mp3.mp3", "roles/bgm-role-11.mp3"],
  ["bgm-wife-level-00-02-ice-queen-court.mp3.mp3", "wife/bgm-wife-00-02.mp3"],
  ["bgm-wife-level-03-04-cold-court.mp3.mp3", "wife/bgm-wife-03-04.mp3"],
  ["bgm-wife-level-05-06-frosted-palace.mp3.mp3", "wife/bgm-wife-05-06.mp3"],
  ["bgm-wife-level-07-08-royal-ruling.mp3.mp3", "wife/bgm-wife-07-08.mp3"],
  [
    "bgm-wife-level-09-10-active-queen-dashboard.mp3.mp3",
    "wife/bgm-wife-09-10.mp3",
  ],
  ["bgm-wife-level-11-grand-wedding-march.mp3.mp3", "wife/bgm-wife-11.mp3"],
  ["bgm-slave-frozen-servant.mp3.mp3", "bgm-slave.mp3"],
  ["stinger-wife-task-complete.mp3.mp3", "wife/bgm-wife-task-complete.mp3"],
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${detail}`);
  }
  return result.stdout.trim();
}

function assertTool(command) {
  run(command, ["-version"]);
}

function normalizeAudioName(name) {
  return name.replace(/(?:\.mp3)+$/i, ".mp3");
}

function collectFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return [fullPath];
  });
}

function buildSourceIndex() {
  if (!existsSync(rawAudioDir)) {
    throw new Error(`Missing raw audio directory: ${rawAudioDir}`);
  }
  const files = collectFiles(rawAudioDir).filter((file) =>
    file.toLowerCase().endsWith(".mp3"),
  );
  const index = new Map();
  for (const file of files) {
    const basename = path.basename(file);
    index.set(basename.toLowerCase(), file);
    index.set(normalizeAudioName(basename).toLowerCase(), file);
  }
  return index;
}

function probeDuration(inputPath) {
  const output = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const duration = Number(output);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid duration for ${inputPath}: ${output}`);
  }
  return duration;
}

function clipStartForDuration(duration) {
  if (duration < 35) return 0;
  const preferred = duration * 0.25;
  const maxStart = Math.max(0, duration - CLIP_SECONDS);
  return Math.min(preferred, maxStart);
}

function prepareOutputDir() {
  mkdirSync(outputRoot, { recursive: true });
  for (const relativeDir of ["roles", "wife"]) {
    mkdirSync(path.join(outputRoot, relativeDir), { recursive: true });
  }
}

function cleanPreviousBgm() {
  for (const [, relativeOutput] of mappings) {
    const outputPath = path.join(outputRoot, relativeOutput);
    if (existsSync(outputPath)) rmSync(outputPath);
  }
}

function encodeClip(inputPath, outputPath) {
  const duration = probeDuration(inputPath);
  const start = clipStartForDuration(duration);
  const outputDuration = Math.min(CLIP_SECONDS, duration - start);
  const fadeOutStart = Math.max(0, outputDuration - FADE_OUT_SECONDS);
  const filters = [
    `afade=t=in:st=0:d=${Math.min(FADE_IN_SECONDS, outputDuration / 3)}`,
    `afade=t=out:st=${Math.min(FADE_OUT_START, fadeOutStart)}:d=${Math.min(
      FADE_OUT_SECONDS,
      outputDuration / 3,
    )}`,
  ].join(",");

  mkdirSync(path.dirname(outputPath), { recursive: true });
  run(
    "ffmpeg",
    [
      "-y",
      "-ss",
      start.toFixed(3),
      "-i",
      inputPath,
      "-t",
      outputDuration.toFixed(3),
      "-ar",
      "44100",
      "-b:a",
      "128k",
      "-af",
      filters,
      outputPath,
    ],
    { stdio: "pipe" },
  );

  return {
    duration,
    outputDuration,
    start,
  };
}

function main() {
  assertTool("ffmpeg");
  assertTool("ffprobe");
  prepareOutputDir();
  cleanPreviousBgm();
  const sourceIndex = buildSourceIndex();
  const results = [];

  for (const [rawName, relativeOutput] of mappings) {
    const sourcePath =
      sourceIndex.get(rawName.toLowerCase()) ??
      sourceIndex.get(normalizeAudioName(rawName).toLowerCase());
    if (!sourcePath) {
      throw new Error(`Missing source audio for mapping: ${rawName}`);
    }
    const outputPath = path.join(outputRoot, relativeOutput);
    const info = encodeClip(sourcePath, outputPath);
    results.push({
      source: path.relative(rawAudioDir, sourcePath),
      output: path.relative(projectRoot, outputPath),
      ...info,
    });
  }

  console.table(
    results.map((item) => ({
      source: item.source,
      output: item.output,
      start: item.start.toFixed(2),
      seconds: item.outputDuration.toFixed(2),
    })),
  );
}

main();

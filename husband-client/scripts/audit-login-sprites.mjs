import { createReadStream, existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src/assets/login-final");

function readPngSize(filePath) {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: 23 });
    const chunks = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      const header = Buffer.concat(chunks);
      const signature = "89504e470d0a1a0a";

      if (header.length < 24 || header.subarray(0, 8).toString("hex") !== signature) {
        reject(new Error(`${filePath} is not a PNG file`));
        return;
      }

      resolve({
        h: header.readUInt32BE(20),
        w: header.readUInt32BE(16),
      });
    });
  });
}

function listActionDirs(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) return [];

    const indexPath = path.join(fullPath, "index.json");
    if (existsSync(indexPath)) return [fullPath];
    return listActionDirs(fullPath);
  });
}

function formatSeconds(value) {
  return `${Number(value.toFixed(3))}s`;
}

const actionDirs = listActionDirs(root);
const failures = [];

if (actionDirs.length === 0) {
  failures.push(`No sprite actions found under ${root}`);
}

for (const actionDir of actionDirs) {
  const spritePath = path.join(actionDir, "sprite.png");
  const indexPath = path.join(actionDir, "index.json");
  const label = path.relative(root, actionDir).replaceAll(path.sep, "/");

  try {
    if (!existsSync(spritePath)) {
      throw new Error("missing sprite.png");
    }

    const [meta, size] = await Promise.all([
      readFile(indexPath, "utf8").then(JSON.parse),
      readPngSize(spritePath),
    ]);

    if (meta.sheet_size?.w !== size.w || meta.sheet_size?.h !== size.h) {
      throw new Error(
        `sheet_size ${meta.sheet_size?.w}x${meta.sheet_size?.h} does not match PNG ${size.w}x${size.h}`,
      );
    }

    for (const frame of meta.frames ?? []) {
      if (
        frame.x < 0 ||
        frame.y < 0 ||
        frame.w <= 0 ||
        frame.h <= 0 ||
        frame.x + frame.w > size.w ||
        frame.y + frame.h > size.h
      ) {
        throw new Error(`frame ${frame.i} is out of bounds`);
      }
    }

    const frames = meta.frames ?? [];
    const duration =
      frames.length > 1 ? frames.at(-1).t - frames[0].t : 0;

    console.log(
      `${label}: ${frames.length} frames, ${meta.frame_size?.w}x${meta.frame_size?.h}, ${formatSeconds(duration)}`,
    );
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error("\nLogin sprite audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nLogin sprite audit passed: ${actionDirs.length} actions checked.`);

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const assets = resolve(dist, "assets");
const hardLimitBytes = 20 * 1024 * 1024;
const warningLimitBytes = 19 * 1000 * 1000;
const topFileCount = 12;

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      result.push(...walkFiles(fullPath));
    } else {
      result.push({ path: fullPath, size: stats.size });
    }
  }
  return result;
}

function bytesLabel(bytes) {
  const mb = bytes / 1_000_000;
  const mib = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB (${mib.toFixed(2)} MiB)`;
}

function groupByTopLevel(files) {
  const groups = new Map();
  files.forEach((file) => {
    const rel = relative(dist, file.path).replaceAll("\\", "/");
    const key = rel.includes("/") ? rel.split("/")[0] : ".";
    groups.set(key, (groups.get(key) || 0) + file.size);
  });
  return [...groups.entries()].sort((a, b) => b[1] - a[1]);
}

if (!existsSync(dist)) {
  console.error("audit-package: dist does not exist. Run npm run build:weapp first.");
  process.exit(1);
}

const files = walkFiles(dist);
const assetFiles = walkFiles(assets);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const assetBytes = assetFiles.reduce((sum, file) => sum + file.size, 0);
const topFiles = files
  .slice()
  .sort((a, b) => b.size - a.size)
  .slice(0, topFileCount);

console.log("audit-package: package summary");
console.log(`- dist files: ${files.length}`);
console.log(`- dist total: ${bytesLabel(totalBytes)}`);
console.log(`- assets files: ${assetFiles.length}`);
console.log(`- assets total: ${bytesLabel(assetBytes)}`);

console.log("- top-level groups:");
groupByTopLevel(files).forEach(([name, size]) => {
  console.log(`  ${name}: ${bytesLabel(size)}`);
});

console.log(`- top ${topFileCount} files:`);
topFiles.forEach((file) => {
  console.log(`  ${relative(dist, file.path).replaceAll("\\", "/")}: ${bytesLabel(file.size)}`);
});

if (totalBytes > hardLimitBytes) {
  console.error(`audit-package: dist exceeds hard limit ${bytesLabel(hardLimitBytes)}.`);
  process.exit(1);
}

if (totalBytes > warningLimitBytes || assetBytes > warningLimitBytes) {
  console.warn(`audit-package: warning, package is close to the 20 MB upload limit. Move large role/benefit/sprite assets to remote resources or stricter subpackage groups before adding more heavy assets.`);
}

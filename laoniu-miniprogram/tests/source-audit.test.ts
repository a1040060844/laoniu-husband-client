import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoots = ["src", "scripts"].map((name) => join(root, name));
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);

const mojibakePattern = /[鎵鑰鏉閽鍗瑁椹鈥俙]|銆|锛|锟|€|鐨|涓€|瀹|鏃|绾|濂栧|浠诲姟/;
const forbiddenBrowserApiPattern = /\b(ReactDOM|localStorage|document|history|location|web-view|window)\b/g;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return listSourceFiles(fullPath);
    return sourceExtensions.has(extname(entry)) ? [fullPath] : [];
  });
}

function isAllowedBrowserApiMatch(relativePath: string, match: string, source: string) {
  if (relativePath === "src\\app.config.ts" || relativePath === "src/app.config.ts") {
    return match === "window" || source.includes("window: {");
  }
  return false;
}

test("source text does not contain mojibake markers", () => {
  const offenders = sourceRoots
    .flatMap(listSourceFiles)
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const match = source.match(mojibakePattern);
      return match ? [`${relative(root, file)} contains ${match[0]}`] : [];
    });

  assert.deepEqual(offenders, []);
});

test("mini program runtime source avoids browser-only APIs", () => {
  const offenders = sourceRoots
    .flatMap(listSourceFiles)
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(root, file);
      const matches = Array.from(source.matchAll(forbiddenBrowserApiPattern));
      return matches
        .filter((match) => !isAllowedBrowserApiMatch(relativePath, match[0], source))
        .map((match) => `${relativePath} contains ${match[0]}`);
    });

  assert.deepEqual(offenders, []);
});

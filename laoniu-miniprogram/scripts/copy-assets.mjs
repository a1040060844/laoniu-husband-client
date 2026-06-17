import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "src/assets");
const target = resolve(root, "dist/assets");
const skippedDirs = new Set(["source", "login-final"]);
const skippedExtensions = new Set([".psd", ".psb"]);

if (!existsSync(source)) {
  console.log("copy-assets: no src/assets directory");
  process.exit(0);
}

mkdirSync(resolve(root, "dist"), { recursive: true });
if (existsSync(target)) rmSync(target, { recursive: true, force: true });

function copyFiltered(from, to) {
  const stats = statSync(from);

  if (stats.isDirectory()) {
    const name = from.split(/[\\/]/).at(-1);
    if (name && skippedDirs.has(name)) return;

    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from)) {
      copyFiltered(join(from, entry), join(to, entry));
    }
    return;
  }

  const extension = extname(from).toLowerCase();
  if (skippedExtensions.has(extension)) return;

  mkdirSync(resolve(to, ".."), { recursive: true });
  copyFileSync(from, to);
}

copyFiltered(source, target);
console.log(`copy-assets: copied filtered assets ${source} -> ${target}`);

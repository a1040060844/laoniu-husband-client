import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface MiniProgramConfig {
  pages: string[];
  subpackages?: Array<{
    root: string;
    pages: string[];
  }>;
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcRoot = join(root, "src");

function loadAppConfig(): MiniProgramConfig {
  const source = readFileSync(join(srcRoot, "app.config.ts"), "utf8");
  const executable = source.replace(/^export default\s+/, "return ");
  return new Function("defineAppConfig", executable)((config: MiniProgramConfig) => config);
}

function configuredRoutes(config = loadAppConfig()) {
  return new Set([
    ...config.pages,
    ...(config.subpackages || []).flatMap((subpackage) =>
      subpackage.pages.map((page) => `${subpackage.root}/${page}`),
    ),
  ]);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return listSourceFiles(fullPath);
    return [".ts", ".tsx"].includes(extname(entry)) ? [fullPath] : [];
  });
}

function normalizeRoute(route: string) {
  return route.replace(/^\//, "").split("?")[0];
}

function pageReferences() {
  const routePattern = /["'`]\/((?:pages|subpackages)\/[A-Za-z0-9_\-\/]+\/index)(?:\?[^"'`]*)?["'`]/g;
  return listSourceFiles(srcRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return Array.from(source.matchAll(routePattern)).map((match) => ({
      file: relative(root, file),
      route: normalizeRoute(match[1]),
    }));
  });
}

test("configured mini program pages have page and config files", () => {
  const missing = Array.from(configuredRoutes()).flatMap((route) => {
    const pageFile = join(srcRoot, `${route}.tsx`);
    const configFile = join(srcRoot, `${route}.config.ts`);
    return [
      existsSync(pageFile) ? "" : `${route}.tsx`,
      existsSync(configFile) ? "" : `${route}.config.ts`,
    ].filter(Boolean);
  });

  assert.deepEqual(missing, []);
});

test("page navigation references are registered in app config", () => {
  const routes = configuredRoutes();
  const offenders = pageReferences()
    .filter((reference) => !routes.has(reference.route))
    .map((reference) => `${reference.file} -> ${reference.route}`);

  assert.deepEqual(offenders, []);
});

test("login flow can reach both role roots", () => {
  const routes = configuredRoutes();
  assert.equal(routes.has("pages/login/index"), true);
  assert.equal(routes.has("pages/loading/index"), true);
  assert.equal(routes.has("subpackages/husband/pages/role/index"), true);
  assert.equal(routes.has("subpackages/wife/pages/dashboard/index"), true);
});

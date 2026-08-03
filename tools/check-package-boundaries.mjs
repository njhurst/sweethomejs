#!/usr/bin/env node
/*
 * check-package-boundaries.mjs — like the Java upstream PackageDependenciesTest:
 * every package may only import @sweethomejs/* and third-party modules it
 * declares in package.json dependencies/devDependencies. Fails with exit 1.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const root = process.cwd();
const packages = ["packages/core", "packages/render2d", "packages/render3d", "packages/photo", "packages/export", "packages/codecs", "packages/ui", "apps/cli", "apps/web"];

const allowedInternalPrefixes = new Map([
  ["@sweethomejs/core", "packages/core"],
  ["@sweethomejs/render2d", "packages/render2d"],
  ["@sweethomejs/render3d", "packages/render3d"],
  ["@sweethomejs/photo", "packages/photo"],
  ["@sweethomejs/export", "packages/export"],
  ["@sweethomejs/codecs", "packages/codecs"],
  ["@sweethomejs/ui", "packages/ui"],
  ["@sweethomejs/cli", "apps/cli"],
  ["@sweethomejs/web", "apps/web"],
]);

/** Walks .ts/.tsx files under a dir (skipping tests and dist). */
function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      yield* walk(full);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts")) continue;
      yield full;
    }
  }
}

/** Extracts import specifiers (static + dynamic imports). */
function imports(source) {
  const found = [];
  const re = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    found.push(match[1]);
  }
  return found;
}

let failures = 0;
for (const pkgDir of packages) {
  const pkgPath = join(root, pkgDir);
  const pkgJson = JSON.parse(readFileSync(join(pkgPath, "package.json"), "utf8"));
  const declared = new Set([
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.devDependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
  ]);
  for (const file of walk(join(pkgPath, "src"))) {
    const source = readFileSync(file, "utf8");
    for (const specifier of imports(source)) {
      if (specifier.startsWith(".") || specifier.startsWith("/")) continue; // relative
      const bare = specifier.split("/").slice(0, 2).join("/"); // scoped, or first part
      const bareSingle = specifier.startsWith("@") ? bare : specifier.split("/")[0];
      const importName = specifier.startsWith("@") ? bare : bareSingle;
      if (importName.startsWith("@sweethomejs/")) {
        const targetPkg = allowedInternalPrefixes.get(importName);
        if (targetPkg === undefined) {
          console.error(`ERROR ${pkgDir}: unknown internal import ${importName} in ${relative(root, file)}`);
          failures++;
        } else if (!declared.has(importName)) {
          console.error(`ERROR ${pkgDir}: imports ${importName} (internal) without declaring it in ${pkgDir}/package.json (${relative(root, file)})`);
          failures++;
        }
      } else if (!declared.has(importName) && !declared.has(specifier)) {
        console.error(`ERROR ${pkgDir}: imports ${specifier} without declaring it (${relative(root, file)})`);
        failures++;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} package-boundary violation(s)`);
  process.exit(1);
}
console.log("package boundaries OK");

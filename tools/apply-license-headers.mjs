#!/usr/bin/env node
/**
 * apply-license-headers.mjs — prepend the SweetHomeJS license header to files.
 *
 * Usage:
 *   node tools/apply-license-headers.mjs <template> <file...>
 *   # e.g. after scaffolding a translated class:
 *   node tools/apply-license-headers.mjs templates/header-translated.txt \
 *     packages/core/src/model/Home.ts
 *
 * The template's <FileName> and <OriginalJavaFile> placeholders are replaced
 * from the target path. Files that already contain a GPL header are skipped.
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const [templatePath, ...targets] = process.argv.slice(2);
if (!templatePath || targets.length === 0) {
  console.error("Usage: apply-license-headers.mjs <template> <file...>");
  process.exit(1);
}

const template = await readFile(templatePath, "utf8");
let applied = 0;
let skipped = 0;

for (const target of targets) {
  const abs = resolve(target);
  const content = await readFile(abs, "utf8");
  if (content.includes("GNU General Public License")) {
    skipped++;
    continue;
  }
  const header = template
    .replaceAll("<FileName>", basename(abs))
    .replaceAll("<OriginalJavaFile>", basename(abs).replace(/\.ts$/, ".java"))
    .trim();
  await writeFile(abs, `${header}\n\n${content}`);
  applied++;
}

console.log(`applied ${applied} header(s), skipped ${skipped}`);

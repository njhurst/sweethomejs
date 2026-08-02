/*
 * build-help.mjs
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

/**
 * build-help.mjs (task 7.6): copies the Java help resources into the web
 * app's public directory so they ship as static assets.
 *
 * Usage: node tools/help/build-help.mjs [--locale en]
 * Output: apps/web/public/help/
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../..");
const HELP_SOURCE = join(REPO_ROOT, "src/SweetHome3D-7.5-src/src/com/eteks/sweethome3d/viewcontroller/resources/help");
const OUT_DIR = join(REPO_ROOT, "apps/web/public/help");

const localeArg = process.argv.find((a) => a.startsWith("--locale="));
const locales = localeArg ? [localeArg.split("=")[1]] : ["en"];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const sourcePath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(sourcePath).isDirectory()) {
      copyDir(sourcePath, destPath);
    } else {
      copyFileSync(sourcePath, destPath);
    }
  }
}

for (const locale of locales) {
  const localeDir = join(HELP_SOURCE, locale);
  if (!existsSync(localeDir)) {
    console.error(`help locale not found: ${localeDir}`);
    process.exit(1);
  }
  // Copy the locale's pages + the shared css and images
  const localeOut = join(OUT_DIR, locale);
  copyDir(localeDir, localeOut);
  for (const shared of ["help.css", "helpLargerFont.css"]) {
    const sharedPath = join(HELP_SOURCE, shared);
    if (existsSync(sharedPath) && !statSync(sharedPath).isDirectory()) {
      copyFileSync(sharedPath, join(OUT_DIR, shared));
    }
  }
  const imagesDir = join(HELP_SOURCE, "images");
  if (existsSync(imagesDir)) {
    copyDir(imagesDir, join(OUT_DIR, "images"));
  }
  const count = readdirSync(localeOut).length;
  console.log(`copied ${locale} help (${count} files) to apps/web/public/help/${locale}`);
}

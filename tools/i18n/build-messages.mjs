/**
 * build-messages.mjs (task 7.5): converts the Java .properties bundles
 * (model/package.properties, viewcontroller/package.properties + locale
 * variants) into JSON message bundles for the web app.
 *
 * Bundle naming: the core's getLocalizedString(Class, key) asks for a bundle
 * named by the class and the key; the Java files store `<ClassName>.<key>` in
 * the package bundle. The JSON structure is:
 *   { "HomeController": { "undoCutName": "…" }, … }
 * merged with locale fallback (base ← _lang ← _lang_country).
 *
 * Usage: node tools/i18n/build-messages.mjs [--locales en,fr,de,es,it,pt,nl,ru]
 * Output: packages/ui/src/i18n/messages.json + messages_<locale>.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJavaProperties } from "@sweethomejs/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../..");
const SOURCE_PACKAGES = [
  "src/SweetHome3D-7.5-src/src/com/eteks/sweethome3d/model",
  "src/SweetHome3D-7.5-src/src/com/eteks/sweethome3d/viewcontroller",
];
const OUT_DIR = join(REPO_ROOT, "packages/ui/src/i18n");

const DEFAULT_LOCALES = ["en", "fr", "de", "es", "it", "pt", "nl", "ru"];

function parsePackageFile(path) {
  if (!existsSync(path)) {
    return null;
  }
  const props = parseJavaProperties(new Uint8Array(readFileSync(path)));
  const bundle = {};
  for (const [key, value] of props.entries()) {
    const dot = key.indexOf(".");
    if (dot === -1) {
      bundle[key] = value;
      continue;
    }
    const className = key.substring(0, dot);
    const messageKey = key.substring(dot + 1);
    if (bundle[className] === undefined) {
      bundle[className] = {};
    }
    bundle[className][messageKey] = value;
  }
  return bundle;
}

/** Merges child bundles over parent (deep, per class). */
function mergeBundles(parent, child) {
  const merged = { ...parent };
  for (const [className, messages] of Object.entries(child)) {
    merged[className] = { ...(parent[className] ?? {}), ...messages };
  }
  return merged;
}

/** Loads a package's base + locale variants for the given locale. */
function loadPackageBundles(packageDir, locale) {
  const base = parsePackageFile(join(packageDir, "package.properties")) ?? {};
  if (locale === "en") {
    return base;
  }
  const [lang, country] = locale.split("-");
  const langBundle = parsePackageFile(join(packageDir, `package_${lang}.properties`));
  let bundle = base;
  if (langBundle !== null) {
    bundle = mergeBundles(bundle, langBundle);
  }
  if (country !== undefined) {
    const countryBundle = parsePackageFile(join(packageDir, `package_${lang}_${country}.properties`));
    if (countryBundle !== null) {
      bundle = mergeBundles(bundle, countryBundle);
    }
  }
  return bundle;
}

function buildLocale(locale) {
  let messages = {};
  for (const packageDir of SOURCE_PACKAGES) {
    const absoluteDir = join(REPO_ROOT, packageDir);
    const bundle = loadPackageBundles(absoluteDir, locale);
    messages = mergeBundles(messages, bundle);
  }
  return messages;
}

const localeArg = process.argv.find((a) => a.startsWith("--locales="));
const locales = localeArg ? localeArg.split("=")[1].split(",") : DEFAULT_LOCALES;

mkdirSync(OUT_DIR, { recursive: true });
for (const locale of locales) {
  const messages = buildLocale(locale);
  const fileName = locale === "en" ? "messages.json" : `messages_${locale}.json`;
  writeFileSync(join(OUT_DIR, fileName), JSON.stringify(messages, null, 1));
  const classCount = Object.keys(messages).length;
  const keyCount = Object.values(messages).reduce((sum, m) => sum + Object.keys(m).length, 0);
  console.log(`wrote ${fileName}: ${classCount} classes, ${keyCount} keys`);
}

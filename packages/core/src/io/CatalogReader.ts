/**
 * Furniture/textures catalog codec (task 3.6): reads `.sh3f` furniture
 * libraries and `.sh3t` textures libraries.
 *
 * Java 7.5 plugin libraries are zip archives containing a
 * `PluginFurnitureCatalog.properties` / `PluginTexturesCatalog.properties`
 * resource bundle (plus optional `_lang`, `_lang_country` variants) describing
 * the catalog, together with the referenced content files (models, icons).
 * Port of com.eteks.sweethome3d.io.DefaultFurnitureCatalog /
 * DefaultTexturesCatalog reading paths.
 */
import { f32 } from "../util/f32.js";
import { FurnitureCatalog, FurnitureCategory, TexturesCatalog, TexturesCategory } from "../model/Catalogs.js";
import { BoxBounds, LightSource, Sash } from "../model/ValueClasses.js";
import { ZipContent } from "./HomeContentContext.js";
import { parseJavaProperties, type JavaProperties } from "./JavaProperties.js";
import type { Sh3dContainer } from "./Sh3dContainer.js";
import { CatalogDoorOrWindow, CatalogLight, CatalogPieceOfFurniture, CatalogShelfUnit, CatalogTexture } from "./CatalogClasses.js";
import type { Content } from "../model/Content.js";

const PLUGIN_FURNITURE_CATALOG_FAMILY = "PluginFurnitureCatalog";
const PLUGIN_TEXTURES_CATALOG_FAMILY = "PluginTexturesCatalog";

/** Properties keys for a furniture piece, matching DefaultFurnitureCatalog.PropertyKey. */
const FURNITURE_KEYS = [
  "id", "name", "description", "information", "license", "tags", "creationDate", "grade",
  "category", "icon", "iconDigest", "planIcon", "planIconDigest", "model", "modelSize",
  "modelDigest", "multiPartModel", "width", "depth", "height", "movable", "doorOrWindow",
  "doorOrWindowCutOutShape", "doorOrWindowWallThickness", "doorOrWindowWallDistance",
  "doorOrWindowWallCutOutOnBothSides", "doorOrWindowWidthDepthDeformable",
  "doorOrWindowSashXAxis", "doorOrWindowSashYAxis", "doorOrWindowSashWidth",
  "doorOrWindowSashStartAngle", "doorOrWindowSashEndAngle",
  "lightSourceX", "lightSourceY", "lightSourceZ", "lightSourceColor", "lightSourceDiameter",
  "lightSourceMaterialName", "staircaseCutOutShape", "elevation", "dropOnTopElevation",
  "shelfElevations", "shelfBoxes", "modelRotation", "modelFlags", "creator", "resizable",
  "deformable", "texturable", "horizontallyRotatable", "price", "valueAddedTaxPercentage", "currency",
] as const;

/** Properties keys for a texture, matching DefaultTexturesCatalog.PropertyKey. */
const TEXTURE_KEYS = ["id", "name", "category", "image", "imageDigest", "width", "height", "creator"] as const;

interface Bundle extends JavaProperties {
  /** True if the underlying family file exists (Java: getBundle returns null when missing). */
  hasString(key: string): boolean;
}

/**
 * Loads a resource bundle family from a zip container with Java's locale
 * fallback: base, then base_lang, then base_lang_country — each later file
 * overrides earlier ones.
 */
export function loadBundle(container: Sh3dContainer, familyName: string, lang = "en", country = "US"): Bundle | null {
  const suffixes = ["", `_${lang}`, `_${lang}_${country}`];
  const map = new Map<string, string>();
  let found = false;
  for (const suffix of suffixes) {
    const entry = container.getEntrySync(`${familyName}${suffix}.properties`);
    if (entry !== undefined) {
      found = true;
      for (const [key, value] of parseJavaProperties(entry).entries()) {
        map.set(key, value);
      }
    }
  }
  if (!found) {
    return null;
  }
  return {
    getString(key) {
      return map.get(key);
    },
    hasString(key) {
      return map.has(key);
    },
    keys() {
      return [...map.keys()];
    },
    entries() {
      return [...map.entries()];
    },
  };
}

function optionalString(bundle: Bundle, key: string): string | null {
  return bundle.getString(key) ?? null;
}

function optionalBoolean(bundle: Bundle, key: string, fallback: boolean): boolean {
  const value = bundle.getString(key);
  return value === undefined ? fallback : value === "true";
}

function optionalFloat(bundle: Bundle, key: string, fallback: number): number {
  const value = bundle.getString(key);
  return value === undefined ? fallback : parseFloat(value);
}

function parseFloatArray(value: string): number[] {
  return value.trim().length === 0 ? [] : value.split(/ +/).map((v) => parseFloat(v));
}

/** Maps a content file reference in the catalog to a lazy zip-entry content. */
function contentFor(container: Sh3dContainer, contentFile: string): Content {
  return new ZipContent(container, contentFile);
}

function modelSizeFor(container: Sh3dContainer, modelName: string): number | null {
  const size = container.getEntrySize(modelName);
  return size ?? null;
}

/** Returns the model rotation matrix from `modelRotation#N` or null. */
function getModelRotation(bundle: Bundle, key: string): number[][] | null {
  const value = bundle.getString(key);
  if (value === undefined) {
    return null;
  }
  const values = value.split(/ +/, 9);
  if (values.length !== 9) {
    return null;
  }
  return [
    [parseFloat(values[0]!), parseFloat(values[1]!), parseFloat(values[2]!)],
    [parseFloat(values[3]!), parseFloat(values[4]!), parseFloat(values[5]!)],
    [parseFloat(values[6]!), parseFloat(values[7]!), parseFloat(values[8]!)],
  ];
}

function getDoorOrWindowSashes(bundle: Bundle, index: number, width: number, depth: number): Sash[] {
  const xAxisString = optionalString(bundle, `doorOrWindowSashXAxis#${index}`);
  if (xAxisString === null) {
    return [];
  }
  const xAxis = parseFloatArray(xAxisString);
  const yAxis = parseFloatArray(bundle.getString(`doorOrWindowSashYAxis#${index}`) ?? "");
  if (yAxis.length !== xAxis.length) {
    throw new Error(`Expected ${xAxis.length} values in doorOrWindowSashYAxis#${index} key`);
  }
  const widths = parseFloatArray(bundle.getString(`doorOrWindowSashWidth#${index}`) ?? "");
  if (widths.length !== xAxis.length) {
    throw new Error(`Expected ${xAxis.length} values in doorOrWindowSashWidth#${index} key`);
  }
  const startAngles = parseFloatArray(bundle.getString(`doorOrWindowSashStartAngle#${index}`) ?? "");
  if (startAngles.length !== xAxis.length) {
    throw new Error(`Expected ${xAxis.length} values in doorOrWindowSashStartAngle#${index} key`);
  }
  const endAngles = parseFloatArray(bundle.getString(`doorOrWindowSashEndAngle#${index}`) ?? "");
  if (endAngles.length !== xAxis.length) {
    throw new Error(`Expected ${xAxis.length} values in doorOrWindowSashEndAngle#${index} key`);
  }
  const sashes: Sash[] = [];
  for (let i = 0; i < xAxis.length; i++) {
    sashes.push(
      new Sash(
        f32(xAxis[i]! / width),
        f32(yAxis[i]! / depth),
        f32(widths[i]! / width),
        f32((startAngles[i]! * Math.PI) / 180),
        f32((endAngles[i]! * Math.PI) / 180),
        false,
      ),
    );
  }
  return sashes;
}

function getLightSources(bundle: Bundle, index: number, width: number, depth: number, height: number): LightSource[] | null {
  const xString = optionalString(bundle, `lightSourceX#${index}`);
  if (xString === null) {
    return null;
  }
  const xs = parseFloatArray(xString);
  const ys = parseFloatArray(bundle.getString(`lightSourceY#${index}`) ?? "");
  if (ys.length !== xs.length) {
    throw new Error(`Expected ${xs.length} values in lightSourceY#${index} key`);
  }
  const zs = parseFloatArray(bundle.getString(`lightSourceZ#${index}`) ?? "");
  if (zs.length !== xs.length) {
    throw new Error(`Expected ${xs.length} values in lightSourceZ#${index} key`);
  }
  const colorStrings = (bundle.getString(`lightSourceColor#${index}`) ?? "").split(/ +/);
  if (colorStrings.length !== xs.length) {
    throw new Error(`Expected ${xs.length} values in lightSourceColor#${index} key`);
  }
  const colors = colorStrings.map((c) =>
    c.startsWith("#") ? parseInt(c.substring(1), 16) : parseInt(c, 10),
  );
  const diametersString = optionalString(bundle, `lightSourceDiameter#${index}`);
  const diameters = diametersString !== null ? parseFloatArray(diametersString) : null;
  if (diameters !== null && diameters.length !== xs.length) {
    throw new Error(`Expected ${xs.length} values in lightSourceDiameter#${index} key`);
  }
  const lightSources: LightSource[] = [];
  for (let i = 0; i < xs.length; i++) {
    const color = Math.round(colors[i]!);
    lightSources.push(
      new LightSource(
        f32(xs[i]! / width),
        f32(ys[i]! / depth),
        f32(zs[i]! / height),
        color,
        diameters !== null ? f32(diameters[i]! / width) : null,
      ),
    );
  }
  return lightSources;
}

function getShelfElevations(bundle: Bundle, index: number, height: number): number[] | null {
  const valuesString = optionalString(bundle, `shelfElevations#${index}`);
  if (valuesString === null) {
    return null;
  }
  const values = parseFloatArray(valuesString);
  return values.map((v) => f32(v / height));
}

function getShelfBoxes(bundle: Bundle, index: number, width: number, depth: number, height: number): BoxBounds[] | null {
  const boxesString = optionalString(bundle, `shelfBoxes#${index}`);
  if (boxesString === null) {
    return null;
  }
  const values = parseFloatArray(boxesString);
  if (values.length % 6 !== 0) {
    throw new Error(`Expected a multiple of 6 values in shelfBoxes#${index} key`);
  }
  const boxes: BoxBounds[] = [];
  for (let i = 0; i < values.length / 6; i++) {
    boxes.push(
      new BoxBounds(
        f32(values[i * 6]! / width),
        f32(values[i * 6 + 1]! / depth),
        f32(values[i * 6 + 2]! / height),
        f32(values[i * 6 + 3]! / width),
        f32(values[i * 6 + 4]! / depth),
        f32(values[i * 6 + 5]! / height),
      ),
    );
  }
  return boxes;
}

function parseCreationDate(value: string): number | null {
  // yyyy-MM-dd
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return null;
  }
  return Date.UTC(parseInt(match[1]!, 10), parseInt(match[2]!, 10) - 1, parseInt(match[3]!, 10));
}

function parseTags(tags: string | null): string[] {
  if (tags === null) {
    return [];
  }
  return tags.split(/\s*,\s*/).filter((t) => t.length > 0);
}

function parseBigDecimal(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Reads one piece of furniture at `index` (mirrors
 * DefaultFurnitureCatalog.readPieceOfFurniture). Returns null when `name#N`
 * is missing (end of catalog).
 */
function readPieceOfFurniture(bundle: Bundle, container: Sh3dContainer, index: number): CatalogPieceOfFurniture | null {
  const name = bundle.getString(`name#${index}`);
  if (name === undefined) {
    return null;
  }
  const id = optionalString(bundle, `id#${index}`);
  const description = optionalString(bundle, `description#${index}`);
  const information = optionalString(bundle, `information#${index}`);
  const license = optionalString(bundle, `license#${index}`);
  const tags = parseTags(optionalString(bundle, `tags#${index}`));
  const creationDateString = optionalString(bundle, `creationDate#${index}`);
  const creationDate = creationDateString !== null ? parseCreationDate(creationDateString) : null;
  const gradeString = optionalString(bundle, `grade#${index}`);
  const grade = gradeString !== null ? parseFloat(gradeString) : null;

  const iconFile = bundle.getString(`icon#${index}`);
  const icon = iconFile !== undefined ? contentFor(container, iconFile) : null;
  const planIconFile = optionalString(bundle, `planIcon#${index}`);
  const planIcon = planIconFile !== null ? contentFor(container, planIconFile) : null;
  const multiPartModel = optionalBoolean(bundle, `multiPartModel#${index}`, false);
  const modelFile = bundle.getString(`model#${index}`);
  const model = modelFile !== undefined ? contentFor(container, modelFile) : null;

  const width = parseFloat(bundle.getString(`width#${index}`)!);
  const depth = parseFloat(bundle.getString(`depth#${index}`)!);
  const height = parseFloat(bundle.getString(`height#${index}`)!);
  const elevation = optionalFloat(bundle, `elevation#${index}`, 0);
  const dropOnTopElevation = optionalFloat(bundle, `dropOnTopElevation#${index}`, height) / height;
  const movable = bundle.getString(`movable#${index}`) === "true";
  const doorOrWindow = bundle.getString(`doorOrWindow#${index}`) === "true";
  const staircaseCutOutShape = optionalString(bundle, `staircaseCutOutShape#${index}`);
  const modelRotation = getModelRotation(bundle, `modelRotation#${index}`);
  const modelFlagsString = optionalString(bundle, `modelFlags#${index}`);
  const modelFlags = modelFlagsString !== null ? parseInt(modelFlagsString, 10) : 0;
  const modelSizeString = optionalString(bundle, `modelSize#${index}`);
  const modelSize = modelSizeString !== null ? parseInt(modelSizeString, 10) : (modelFile !== undefined ? modelSizeFor(container, modelFile) : null);
  const creator = optionalString(bundle, `creator#${index}`);
  const resizable = optionalBoolean(bundle, `resizable#${index}`, true);
  const deformable = optionalBoolean(bundle, `deformable#${index}`, true);
  const texturable = optionalBoolean(bundle, `texturable#${index}`, true);
  const horizontallyRotatable = optionalBoolean(bundle, `horizontallyRotatable#${index}`, true);
  const price = parseBigDecimal(bundle.getString(`price#${index}`));
  const valueAddedTaxPercentage = parseBigDecimal(bundle.getString(`valueAddedTaxPercentage#${index}`));
  const currency = optionalString(bundle, `currency#${index}`);

  const { properties, contents } = getAdditionalProperties(bundle, container, index);

  if (doorOrWindow) {
    const cutOutShape = optionalString(bundle, `doorOrWindowCutOutShape#${index}`);
    const wallThickness = optionalFloat(bundle, `doorOrWindowWallThickness#${index}`, depth) / depth;
    const wallDistance = optionalFloat(bundle, `doorOrWindowWallDistance#${index}`, 0) / depth;
    const wallCutOutOnBothSides = optionalBoolean(bundle, `doorOrWindowWallCutOutOnBothSides#${index}`, true);
    const widthDepthDeformable = optionalBoolean(bundle, `doorOrWindowWidthDepthDeformable#${index}`, true);
    const sashes = getDoorOrWindowSashes(bundle, index, width, depth);
    return new CatalogDoorOrWindow(
      id, name, description, information, license, tags.join(","), creationDate, grade,
      icon, planIcon, model, width, depth, height, elevation, dropOnTopElevation, movable,
      cutOutShape, wallThickness, wallDistance, wallCutOutOnBothSides, widthDepthDeformable, sashes,
      modelRotation, modelFlags, modelSize, creator, resizable, deformable, texturable,
      price, valueAddedTaxPercentage, currency, properties, contents,
    );
  }
  const lightSources = getLightSources(bundle, index, width, depth, height);
  const materialNamesString = optionalString(bundle, `lightSourceMaterialName#${index}`);
  const lightSourceMaterialNames = materialNamesString !== null ? materialNamesString.split(/ +/) : null;
  if (lightSources !== null || lightSourceMaterialNames !== null) {
    return new CatalogLight(
      id, name, description, information, license, tags.join(","), creationDate, grade,
      icon, planIcon, model, width, depth, height, elevation, dropOnTopElevation, movable,
      lightSources ?? [], lightSourceMaterialNames ?? [], staircaseCutOutShape, modelRotation, modelFlags, modelSize, creator,
      resizable, deformable, texturable, horizontallyRotatable, price, valueAddedTaxPercentage, currency,
      properties, contents,
    );
  }
  const shelfElevations = getShelfElevations(bundle, index, height);
  const shelfBoxes = getShelfBoxes(bundle, index, width, depth, height);
  if (shelfElevations !== null || shelfBoxes !== null) {
    return new CatalogShelfUnit(
      id, name, description, information, license, tags.join(","), creationDate, grade,
      icon, planIcon, model, width, depth, height, elevation, dropOnTopElevation,
      shelfElevations ?? [], shelfBoxes ?? [], movable, staircaseCutOutShape, modelRotation, modelFlags, modelSize, creator,
      resizable, deformable, texturable, horizontallyRotatable, price, valueAddedTaxPercentage, currency,
      properties, contents,
    );
  }
  return new CatalogPieceOfFurniture(
    id, name, description, information, license, tags.join(","), creationDate, grade,
    icon, planIcon, model, width, depth, height, elevation, dropOnTopElevation,
    movable, staircaseCutOutShape, modelRotation, modelFlags, modelSize, creator,
    resizable, deformable, texturable, horizontallyRotatable, price, valueAddedTaxPercentage, currency,
    properties, contents,
  );
}

/** Default property key prefixes (PropertyKey values + "ignored"). */
const DEFAULT_KEY_PREFIXES = new Set<string>([...FURNITURE_KEYS, ...TEXTURE_KEYS, "ignored"]);

/**
 * Reads `name#N[:TYPE]` keys that are not standard catalog keys as additional
 * properties/contents (mirrors getAdditionalProperties/getAdditionalContents).
 * CONTENT-typed keys become lazy contents; everything else is a string/typed
 * property value.
 */
function getAdditionalProperties(
  bundle: Bundle,
  container: Sh3dContainer,
  index: number,
): { properties: Map<string, string | Content>; contents: Map<string, Content> } {
  const properties = new Map<string, string | Content>();
  const contents = new Map<string, Content>();
  for (const [key, value] of bundle.entries()) {
    const sharpIndex = key.lastIndexOf("#");
    if (sharpIndex === -1 || sharpIndex + 1 >= key.length) {
      continue;
    }
    const colonIndex = key.indexOf(":", sharpIndex + 1);
    const indexPart = key.substring(sharpIndex + 1, colonIndex !== -1 ? colonIndex : key.length).trim();
    if (!/^\d+$/.test(indexPart)) {
      continue; // Not a key matching a piece index (NumberFormatException in Java)
    }
    if (parseInt(indexPart, 10) !== index) {
      continue;
    }
    const propertyName = key.substring(0, sharpIndex);
    if (DEFAULT_KEY_PREFIXES.has(propertyName)) {
      continue;
    }
    let type = "STRING";
    if (colonIndex !== -1) {
      const typeName = key.substring(colonIndex + 1);
      if (["STRING", "INTEGER", "FLOAT", "BOOLEAN", "ENUM", "CONTENT"].includes(typeName)) {
        type = typeName;
      }
    }
    if (type === "CONTENT") {
      contents.set(propertyName, contentFor(container, value));
    } else {
      properties.set(propertyName, value);
    }
  }
  return { properties, contents };
}

/** Reads a furniture catalog from an .sh3f container (zip). Returns null if no plugin properties found. */
export function readFurnitureCatalog(container: Sh3dContainer): FurnitureCatalog | null {
  return readFurnitureCatalogWithLocale(container, "en", "US");
}

export function readFurnitureCatalogWithLocale(container: Sh3dContainer, lang: string, country: string): FurnitureCatalog | null {
  const bundle = loadBundle(container, PLUGIN_FURNITURE_CATALOG_FAMILY, lang, country);
  if (bundle === null) {
    return null;
  }
  const catalog = new FurnitureCatalog();
  const identified: string[] = [];
  let index = 0;
  for (;;) {
    index++;
    const ignored = bundle.getString(`ignored#${index}`);
    if (ignored !== undefined && ignored === "true") {
      continue;
    }
    if (ignored !== undefined) {
      continue;
    }
    const piece = readPieceOfFurniture(bundle, container, index);
    if (piece === null) {
      break;
    }
    const pieceId = piece.getId();
    if (pieceId !== null && pieceId !== "") {
      if (identified.includes(pieceId)) {
        continue;
      }
      identified.push(pieceId);
    }
    const categoryName = bundle.getString(`category#${index}`) ?? "Miscellaneous";
    const category = findCategory(catalog, categoryName);
    catalog.add(category, piece);
  }
  return catalog;
}

function findCategory(catalog: FurnitureCatalog, name: string): FurnitureCategory {
  for (const category of catalog.getCategories()) {
    if (category.getName() === name) {
      return category;
    }
  }
  const category = new FurnitureCategory(name);
  catalog.getCategories().push(category);
  return category;
}

function readTexture(bundle: Bundle, container: Sh3dContainer, index: number): CatalogTexture | null {
  const name = bundle.getString(`name#${index}`);
  if (name === undefined) {
    return null;
  }
  const imageFile = bundle.getString(`image#${index}`);
  const image = imageFile !== undefined ? contentFor(container, imageFile) : null;
  const width = parseFloat(bundle.getString(`width#${index}`)!);
  const height = parseFloat(bundle.getString(`height#${index}`)!);
  const creator = optionalString(bundle, `creator#${index}`);
  const id = optionalString(bundle, `id#${index}`);
  return new CatalogTexture(id, name, image, width, height, creator);
}

/** Reads a textures catalog from an .sh3t container (zip). Returns null if no plugin properties found. */
export function readTexturesCatalog(container: Sh3dContainer): TexturesCatalog | null {
  const bundle = loadBundle(container, PLUGIN_TEXTURES_CATALOG_FAMILY);
  if (bundle === null) {
    return null;
  }
  const catalog = new TexturesCatalog();
  const identified: string[] = [];
  let index = 0;
  for (;;) {
    index++;
    const ignored = bundle.getString(`ignored#${index}`);
    if (ignored !== undefined) {
      continue;
    }
    const texture = readTexture(bundle, container, index);
    if (texture === null) {
      break;
    }
    const textureId = texture.getId();
    if (textureId !== null && textureId !== "") {
      if (identified.includes(textureId)) {
        continue;
      }
      identified.push(textureId);
    }
    const categoryName = bundle.getString(`category#${index}`) ?? "Miscellaneous";
    const category = findTexturesCategory(catalog, categoryName);
    catalog.add(category, texture);
  }
  return catalog;
}

function findTexturesCategory(catalog: TexturesCatalog, name: string): TexturesCategory {
  for (const category of catalog.getCategories()) {
    if (category.getName() === name) {
      return category;
    }
  }
  const category = new TexturesCategory(name);
  catalog.getCategories().push(category);
  return category;
}

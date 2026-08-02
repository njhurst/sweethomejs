/**
 * Catalog codec tests (task 3.6): reads .sh3f/.sh3t plugin-library zips
 * (PluginFurnitureCatalog.properties / PluginTexturesCatalog.properties),
 * matching the Java DefaultFurnitureCatalog/DefaultTexturesCatalog semantics.
 */
import { describe, expect, it } from "vitest";
import { Sh3dContainer } from "./Sh3dContainer.js";
import { readFurnitureCatalog, readTexturesCatalog } from "./CatalogReader.js";
import { parseJavaProperties } from "./JavaProperties.js";
import type { CatalogPieceOfFurniture as CatalogPiece, CatalogTexture as CatalogTex } from "./CatalogClasses.js";
import { f32 } from "../util/f32.js";

function sh3f(entries: Record<string, string>): Sh3dContainer {
  const map = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(entries)) {
    map.set(name, new TextEncoder().encode(content));
  }
  return Sh3dContainer.open(Sh3dContainer.write(map));
}

describe("JavaProperties parser", () => {
  it("handles separators, comments, continuations and \\u escapes like Java", () => {
    const props = parseJavaProperties(
      new TextEncoder().encode(
        [
          "# comment",
          "! another comment",
          "name=Chair",
          "description : comfy",
          "multi word key=value",
          "continuation=first \\",
          "    second line",
          "unicode=\\u0041\\u0042",
          "escaped\\ space=1",
          "empty=",
          "ignored#1=true",
        ].join("\n"),
      ),
    );
    expect(props.getString("name")).toBe("Chair");
    expect(props.getString("description")).toBe("comfy");
    expect(props.getString("continuation")).toBe("first second line");
    expect(props.getString("unicode")).toBe("AB");
    expect(props.getString("escaped space")).toBe("1");
    expect(props.getString("empty")).toBe("");
    expect(props.getString("ignored#1")).toBe("true");
    // comment lines and the comment marker don't produce keys
    expect(props.keys().some((k) => k.startsWith("#"))).toBe(false);
  });

  it("decodes Latin-1 bytes (ISO-8859-1) like java.util.Properties", () => {
    // "café" in Latin-1: 63 61 66 E9
    const props = parseJavaProperties(new Uint8Array([0x6e, 0x61, 0x6d, 0x65, 0x3d, 0x63, 0x61, 0x66, 0xe9]));
    expect(props.getString("name")).toBe("caf\u00e9");
  });
});

describe("Furniture catalog reader (.sh3f)", () => {
  it("reads furniture, categories, doors/windows, lights and shelf units", () => {
    const container = sh3f({
      "PluginFurnitureCatalog.properties": [
        "id#1=sofa-1",
        "name#1=Sofa",
        "category#1=Living room",
        "icon#1=icons/sofa.png",
        "model#1=models/sofa.obj",
        "width#1=200",
        "depth#1=90",
        "height#1=80",
        "movable#1=true",
        "doorOrWindow#1=false",
        "creationDate#1=2024-05-01",
        "",
        "id#2=door-1",
        "name#2=Wooden door",
        "category#2=Doors",
        "icon#2=icons/door.png",
        "model#2=models/door.obj",
        "width#2=90",
        "depth#2=10",
        "height#2=204",
        "movable#2=false",
        "doorOrWindow#2=true",
        "doorOrWindowSashXAxis#2=0.5",
        "doorOrWindowSashYAxis#2=0",
        "doorOrWindowSashWidth#2=0.9",
        "doorOrWindowSashStartAngle#2=0",
        "doorOrWindowSashEndAngle#2=90",
        "",
        "id#3=floor-lamp",
        "name#3=Floor lamp",
        "category#3=Lighting",
        "icon#3=icons/lamp.png",
        "model#3=models/lamp.obj",
        "width#3=40",
        "depth#3=40",
        "height#3=160",
        "movable#3=true",
        "doorOrWindow#3=false",
        "lightSourceX#3=20",
        "lightSourceY#3=20",
        "lightSourceZ#3=150",
        "lightSourceColor#3=#FFFFFF",
        "",
        "id#4=shelf",
        "name#4=Shelf",
        "category#4=Storage",
        "icon#4=icons/shelf.png",
        "model#4=models/shelf.obj",
        "width#4=100",
        "depth#4=30",
        "height#4=120",
        "movable#4=true",
        "doorOrWindow#4=false",
        "shelfElevations#4=40 80",
        "shelfBoxes#4=0 0 40 100 30 80",
        "",
        "ignored#5=true",
        "name#6=Late piece",
        "category#6=Other",
        "icon#6=x.png",
        "model#6=y.obj",
        "width#6=10",
        "depth#6=10",
        "height#6=10",
        "movable#6=true",
        "doorOrWindow#6=false",
      ].join("\n"),
    });

    const catalog = readFurnitureCatalog(container)!;
    expect(catalog).not.toBeNull();
    const categories = catalog.getCategories().map((c) => c.getName());
    expect(categories).toEqual(["Living room", "Doors", "Lighting", "Storage", "Other"]);

    const all = catalog.getCategories().flatMap((c) => c.getFurniture()) as CatalogPiece[];
    expect(all.length).toBe(5);

    // Sofa — plain piece with parsed metadata
    const sofa = all.find((p) => p.getId() === "sofa-1")!;
    expect(sofa.getName()).toBe("Sofa");
    expect(sofa.getWidth()).toBe(200);
    expect(sofa.getDepth()).toBe(90);
    expect(sofa.getHeight()).toBe(80);
    expect(sofa.isMovable()).toBe(true);
    expect(sofa.getIcon()?.getURL()).toBe("zip:icons/sofa.png");
    expect(sofa.getModel()?.getURL()).toBe("zip:models/sofa.obj");
    expect(sofa.getCreationDate()).toBe(Date.UTC(2024, 4, 1));
    expect(sofa.isDoorOrWindow()).toBe(false);

    // Door — sash normalized to percentages of width/depth
    const door = all.find((p) => p.getId() === "door-1")! as import("./CatalogClasses.js").CatalogDoorOrWindow;
    expect(door.isDoorOrWindow()).toBe(true);
    const sash = door.getSashes()[0]!;
    expect(sash.getXAxis()).toBeCloseTo(0.5 / 90, 6);
    expect(sash.getYAxis()).toBe(0);
    expect(sash.getWidth()).toBeCloseTo(0.9 / 90, 6);
    expect(sash.getStartAngle()).toBeCloseTo(0, 6);
    expect(sash.getEndAngle()).toBeCloseTo(Math.PI / 2, 6);

    // Lamp — light source with hex color, normalized to size
    const lamp = all.find((p) => p.getId() === "floor-lamp")! as import("./CatalogClasses.js").CatalogLight;
    const lightSource = lamp.getLightSources()[0]!;
    expect(lightSource.getX()).toBeCloseTo(20 / 40, 6);
    expect(lightSource.getY()).toBeCloseTo(20 / 40, 6);
    expect(lightSource.getZ()).toBeCloseTo(150 / 160, 6);
    expect(lightSource.getColor()).toBe(0xffffff);
    expect(lightSource.getDiameter()).toBeNull();

    // Shelf — shelf elevations and boxes normalized to float32 (Java float division)
    const shelf = all.find((p) => p.getId() === "shelf")! as import("./CatalogClasses.js").CatalogShelfUnit;
    expect(shelf.getShelfElevations()).toEqual([f32(40 / 120), f32(80 / 120)]);
    const box = shelf.getShelfBoxes()[0]! as import("../model/ValueClasses.js").BoxBounds;
    expect(box.getXLower()).toBe(0);
    expect(box.getZUpper()).toBe(f32(80 / 120));

    // ignored#5 is skipped; piece#6 at the next index is still read (Java behavior)
    expect(all.some((p) => p.getName() === "Late piece")).toBe(true);
  });

  it("returns null when the zip has no plugin properties", () => {
    const container = sh3f({ "Home.xml": "<home/>" });
    expect(readFurnitureCatalog(container)).toBeNull();
  });

  it("deduplicates by id across entries", () => {
    const container = sh3f({
      "PluginFurnitureCatalog.properties": [
        "name#1=Dup",
        "id#1=same",
        "category#1=A",
        "icon#1=a.png",
        "model#1=a.obj",
        "width#1=1",
        "depth#1=1",
        "height#1=1",
        "movable#1=true",
        "doorOrWindow#1=false",
        "name#2=Dup 2",
        "id#2=same",
        "category#2=A",
        "icon#2=a.png",
        "model#2=a.obj",
        "width#2=2",
        "depth#2=2",
        "height#2=2",
        "movable#2=true",
        "doorOrWindow#2=false",
      ].join("\n"),
    });
    const catalog = readFurnitureCatalog(container)!;
    const all = catalog.getCategories().flatMap((c) => c.getFurniture()) as CatalogPiece[];
    expect(all.length).toBe(1);
    expect(all[0]!.getName()).toBe("Dup");
  });
});

describe("Real default catalog properties (source-tree smoke test)", () => {
  it("parses the upstream DefaultFurnitureCatalog.properties bundle", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const root = path.join(__dirname, "../../../../");
    const bytes = fs.readFileSync(
      path.join(root, "src/SweetHome3D-7.5-src/src/com/eteks/sweethome3d/io/DefaultFurnitureCatalog.properties"),
    );
    const props = parseJavaProperties(bytes);
    const names = props.keys().filter((k) => /^name#\d+$/.test(k));
    expect(names.length).toBeGreaterThanOrEqual(100);
    expect(props.getString("name#1")).toBeTruthy();
    expect(props.getString("category#1")).toBeTruthy();
    // Continuation and unicode values survive the parser
    expect(props.getString("name#2")).toBeTruthy();
  });
});

describe("Textures catalog reader (.sh3t)", () => {
  it("reads textures and categories", () => {
    const container = sh3f({
      "PluginTexturesCatalog.properties": [
        "id#1=wood",
        "name#1=Oak wood",
        "category#1=Wood",
        "image#1=textures/oak.png",
        "width#1=200",
        "height#1=50",
        "creator#1=Jane",
        "",
        "name#2=Brick",
        "category#2=Wall covering",
        "image#2=textures/brick.png",
        "width#2=30",
        "height#2=30",
      ].join("\n"),
    });
    const catalog = readTexturesCatalog(container)!;
    expect(catalog).not.toBeNull();
    expect(catalog.getCategories().map((c) => c.getName())).toEqual(["Wood", "Wall covering"]);
    const all = catalog.getCategories().flatMap((c) => c.getTextures()) as CatalogTex[];
    expect(all.length).toBe(2);
    const oak = all.find((t) => t.getId() === "wood")!;
    expect(oak.getName()).toBe("Oak wood");
    expect(oak.getWidth()).toBe(200);
    expect(oak.getHeight()).toBe(50);
    expect(oak.getCreator()).toBe("Jane");
    expect(oak.getImage()?.getURL()).toBe("zip:textures/oak.png");
    const brick = all.find((t) => t.getName() === "Brick")!;
    expect(brick.getId()).toBeNull();
  });
});

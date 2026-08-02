/**
 * HomeFileRecorder tests (task 3.7): readHomeFromZip entry detection
 * (Home.xml preferred over serialized Home), damaged-file detection, and
 * writeHome round-trip identity on the fixture homes.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { HomeFileRecorder, DamagedHomeRecorderException } from "./HomeFileRecorder.js";
import { Sh3dContainer } from "./Sh3dContainer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

describe("HomeFileRecorder readHomeFromZip", () => {
  it("prefers the Home.xml entry and resolves content against the same zip", async () => {
    const recorder = new HomeFileRecorder();
    const { home, source } = await recorder.readHomeFromZip(fixtureBytes("examples/ls_2819.sh3d"));
    expect(source).toBe("xml");
    expect(home.getFurniture().length).toBe(152);
    expect(home.getWalls().length).toBe(79);
    expect(home.getRooms().length).toBe(15);
    expect(home.getLevels().length).toBe(6);
    expect(home.getDimensionLines().length).toBe(10);
    // Furniture contents are ZipContent-backed (lazy entries in the same file)
    const piece = home.getFurniture().find((p) => p.getModel() !== null)!;
    expect(piece.getModel()!.getURL()).toMatch(/^zip:/);
  });

  it("falls back to the serialized Home entry when Home.xml is absent", async () => {
    const recorder = new HomeFileRecorder();
    const { home, source } = await recorder.readHomeFromZip(fixtureBytes("test/fixtures/generated/serialized-only.sh3d"));
    expect(source).toBe("serialized");
    expect(home.getWalls().length).toBeGreaterThan(0);
  });

  it("throws DamagedHomeRecorderException when neither entry exists", async () => {
    const recorder = new HomeFileRecorder();
    const container = Sh3dContainer.write(new Map([["Other.txt", new TextEncoder().encode("x")]]));
    await expect(recorder.readHomeFromZip(container)).rejects.toThrow(DamagedHomeRecorderException);
  });

  it("throws DamagedHomeRecorderException on non-zip bytes", async () => {
    const recorder = new HomeFileRecorder();
    await expect(recorder.readHomeFromZip(new TextEncoder().encode("not a zip"))).rejects.toThrow();
  });
});

describe("HomeFileRecorder writeHome", () => {
  it("round-trips the generated fixtures through write -> read", async () => {
    const recorder = new HomeFileRecorder();
    const names = [
      "walls", "rooms", "furniture", "levels", "dimensions-labels",
      "cameras", "environment",
    ];
    for (const name of names) {
      const bytes = fixtureBytes(`test/fixtures/generated/${name}.sh3d`);
      const original = await recorder.readHomeFromZip(bytes);
      const written = await recorder.writeHome(original.home);
      const reread = await recorder.readHomeFromZip(written);

      expect(reread.home.getWalls().length).toBe(original.home.getWalls().length);
      expect(reread.home.getFurniture().length).toBe(original.home.getFurniture().length);
      expect(reread.home.getRooms().length).toBe(original.home.getRooms().length);
      expect(reread.home.getLevels().length).toBe(original.home.getLevels().length);
      // A wall's geometry survives the round trip (float32-stable)
      const w0 = original.home.getWalls()[0];
      if (w0 !== undefined) {
        const w0r = reread.home.getWalls()[0]!;
        expect(w0r.getXStart()).toBe(w0.getXStart());
        expect(w0r.getYStart()).toBe(w0.getYStart());
        expect(w0r.getXEnd()).toBe(w0.getXEnd());
        expect(w0r.getYEnd()).toBe(w0.getYEnd());
        expect(w0r.getThickness()).toBe(w0.getThickness());
      }
    }
  });

  it("writes a valid zip with Home.xml + ContentDigests + content entries", async () => {
    const recorder = new HomeFileRecorder();
    const original = await recorder.readHomeFromZip(fixtureBytes("examples/ls_2819.sh3d"));
    const written = await recorder.writeHome(original.home);
    const container = Sh3dContainer.open(written);
    expect(container.hasEntry("Home.xml")).toBe(true);
    const homeXml = new TextDecoder().decode(container.getEntrySync("Home.xml")!);
    expect(homeXml.startsWith("<?xml")).toBe(true);
    // Content entries are named 0/…, 1/… and referenced from the XML
    const contentNames = container.getEntryNames().filter((n) => /^\d+\//.test(n));
    expect(contentNames.length).toBeGreaterThan(0);
    for (const name of contentNames.slice(0, 3)) {
      expect(homeXml).toContain(name);
    }
    expect(container.hasEntry("ContentDigests")).toBe(true);
  });
});

describe("HomeFileRecorder catalog helpers", () => {
  it("reads furniture/textures catalogs from .sh3f/.sh3t bytes", async () => {
    const recorder = new HomeFileRecorder();
    const catalogBytes = (() => {
      const map = new Map<string, Uint8Array>();
      map.set(
        "PluginFurnitureCatalog.properties",
        new TextEncoder().encode(
          [
            "id#1=table-1",
            "name#1=Table",
            "category#1=Furniture",
            "icon#1=table.png",
            "model#1=table.obj",
            "width#1=120",
            "depth#1=60",
            "height#1=75",
            "movable#1=true",
            "doorOrWindow#1=false",
          ].join("\n"),
        ),
      );
      return Sh3dContainer.write(map);
    })();
    const catalog = recorder.readCatalogFromZip(catalogBytes)!;
    expect(catalog).not.toBeNull();
    expect(catalog.getCategories().flatMap((c) => c.getFurniture())[0]!.getId()).toBe("table-1");
  });
});

/**
 * Legacy serialized-Home deserializer parity (task 3.4): decodes the Java
 * serialized `Home` zip entry and verifies the resulting Home matches the
 * Java field dump.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../../util/f32.js";
import { Sh3dContainer } from "../Sh3dContainer.js";
import { readHomeXmlWithContentResolver, SerializedContent } from "../HomeXMLReader.js";
import { JavaObjectDecoder } from "./JavaObjectDecoder.js";

import { Wall } from "../../model/Wall.js";
import { HomeDecoder, SerializedContent } from "./HomeDecoder.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

describe("Legacy serialized Home deserializer (task 3.4)", () => {
  it("decodes the 2019 user home's serialized Home entry", async () => {
    const container = Sh3dContainer.open(fixtureBytes("examples/ls_2819.sh3d"));
    const homeEntry = (await container.getEntry("Home"))!;
    const { root } = new JavaObjectDecoder(homeEntry).decode();
    const home = new HomeDecoder().decodeHome(root);

    expect(home.getFurniture().length).toBe(152);
    expect(home.getWalls().length).toBe(79);
    expect(home.getRooms().length).toBe(15);
    expect(home.getLevels().length).toBe(6);
    expect(home.getDimensionLines().length).toBe(10);
    expect(home.getName()).toBe("ls_2819.sh3d");
    expect(home.getVersion()).toBe(6000);

    // Walls carry UUID ids (serialized entry) with connections resolved
    for (const wall of home.getWalls()) {
      expect(wall.getId()).toMatch(/^wall-/);
    }
    const connected = home.getWalls().find((w) => w.getWallAtEnd() !== null);
    expect(connected).toBeDefined();
    expect(connected!.getWallAtEnd()!.getId()).toMatch(/^wall-/);
    // Wall geometry must match the XML read of the same .sh3d (same home, different order)
    const xmlHome = readHomeXmlWithContentResolver(
      new TextDecoder().decode((await container.getEntry("Home.xml"))!),
      (name) => new SerializedContent(name),
    );
    const wallKey = (w: Wall) =>
      [w.getXStart(), w.getYStart(), w.getXEnd(), w.getYEnd(), w.getThickness(), w.getHeight()]
        .map((v) => f32(v).toExponential())
        .join(",");
    const serializedKeys = home.getWalls().map(wallKey).sort();
    const xmlKeys = xmlHome.getWalls().map(wallKey).sort();
    expect(serializedKeys).toEqual(xmlKeys);
    // Spot-check the joined polygon of a wall that participates in a T-join
    const joined = home.getWalls().find((w) => w.getPoints().length > 2);
    expect(joined).toBeDefined();
    expect(joined!.getPoints().length).toBeGreaterThan(2);
  });

  it("decodes the serialized-only fixture", async () => {
    const container = Sh3dContainer.open(fixtureBytes("test/fixtures/generated/serialized-only.sh3d"));
    const homeEntry = (await container.getEntry("Home"))!;
    const { root } = new JavaObjectDecoder(homeEntry).decode();
    const home = new HomeDecoder().decodeHome(root);
    expect(home.getWalls().length).toBe(2);
    expect(home.getName()).toBe("serialized-only");
    expect(home.getVersion()).toBe(7400);
  });

  it("decodes the walls fixture", async () => {
    const container = Sh3dContainer.open(fixtureBytes("test/fixtures/generated/walls.sh3d"));
    const homeEntry = (await container.getEntry("Home"))!;
    const { root } = new JavaObjectDecoder(homeEntry).decode();
    const home = new HomeDecoder().decodeHome(root);
    expect(home.getWalls().length).toBe(5);
    // The arc wall
    const arc = home.getWalls().find((w) => w.getArcExtent() !== null);
    expect(arc).toBeDefined();
    expect(arc!.getArcExtent()).toBe(f32(90));
    expect(arc!.getPoints().length).toBeGreaterThan(4);
    // Baseboard wall
    const tall = home.getWalls().find((w) => w.getLeftSideBaseboard() !== null);
    expect(tall).toBeDefined();
    expect(tall!.getHeight()).toBe(f32(300));
    expect(tall!.getHeightAtEnd()).toBe(f32(240));
    expect(tall!.getLeftSideBaseboard()!.getHeight()).toBe(f32(10));
  });
});

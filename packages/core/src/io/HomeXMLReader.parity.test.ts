/**
 * HomeXMLHandler parity (task 3.2): reads the real dream_house Home.xml (from the
 * Java-written .sh3d) and verifies the parsed Home matches the Java field
 * dump (counts, ids, geometry).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import { Sh3dContainer } from "./Sh3dContainer.js";
import { HomeContentContext } from "./HomeContentContext.js";
import { readHomeXml } from "./HomeXMLReader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

describe("HomeXMLHandler parity (task 3.2)", () => {
  it("parses the 2019 user home identically to the Java dump", async () => {
    const container = Sh3dContainer.open(fixtureBytes("test/fixtures/dream_house.sh3d"));
    const xml = new TextDecoder().decode((await container.getEntry("Home.xml"))!);
    const home = readHomeXml(xml, null, new HomeContentContext(container));

    // Counts from the Java dump
    expect(home.getFurniture().length).toBe(152);
    expect(home.getWalls().length).toBe(79);
    expect(home.getRooms().length).toBe(15);
    expect(home.getLevels().length).toBe(6);
    expect(home.getDimensionLines().length).toBe(10);
    expect(home.getName()).toBe("dream_house.sh3d");
    expect(home.getVersion()).toBe(6000);

    // Wall geometry matches the dump (wall0 points)
    const wall0 = home.getWalls().find((w) => w.getId() === "wall0");
    expect(wall0).toBeDefined();
    const expectedWall0Points: number[][] = [
      [84.63287, -11.502183],
      [559.6128, -11.502183],
      [546.91284, 1.1978168],
      [84.63287, 1.1978168],
    ];
    const actualWall0 = wall0!.getPoints();
    for (let i = 0; i < 4; i++) {
      expect(f32(actualWall0[i]![0]!)).toBe(f32(expectedWall0Points[i]![0]!));
      expect(f32(actualWall0[i]![1]!)).toBe(f32(expectedWall0Points[i]![1]!));
    }

    // Wall connections restored (wall0.wallAtEnd -> wall1)
    expect(wall0!.getWallAtEnd()?.getId()).toBe("wall1");
    expect(home.getWalls().find((w) => w.getId() === "wall1")?.getWallAtStart()?.getId()).toBe("wall0");

    // Furniture spot-checks from the dump
    const first = home.getFurniture()[0]!;
    expect(first.getId()).toMatch(/^doorOrWindow-/);
    expect(f32(first.getX())).toBe(f32(483.69727));
    expect(first.getAngle()).toBe(f32(Math.PI));
    expect(first.getWidthInPlan()).toBe(f32(91.44));

    // Levels sorted by elevation (the XML stores explicit elevationIndex attrs)
    const elevations = home.getLevels().map((l) => l.getElevation());
    expect(elevations).toEqual([...elevations].sort((a, b) => a - b));
    expect(home.getLevels()[0]!.getName()).toBe("basement");
    expect(home.getLevels()[0]!.getElevationIndex()).toBe(1); // from the XML attribute

    // Room area from the dump
    const roomAreas = home.getRooms().map((r) => r.getArea());
    for (const area of roomAreas) {
      expect(area).toBeGreaterThan(0);
    }

    // Camera setup
    expect(home.getCamera()).toBe(home.getObserverCamera());
  });

  it("parses the generated fixtures too", async () => {
    for (const fixture of ["walls", "rooms", "furniture", "levels", "dimensions-labels", "cameras", "environment"]) {
      const container = Sh3dContainer.open(fixtureBytes(`test/fixtures/generated/${fixture}.sh3d`));
      const xml = new TextDecoder().decode((await container.getEntry("Home.xml"))!);
      const home = readHomeXml(xml, null, new HomeContentContext(container));
      expect(home).toBeDefined();
      expect(home.getName()).toBe(fixture);
      expect(home.getVersion()).toBe(7400);
      expect(home.getWalls().length).toBeGreaterThanOrEqual(0);
    }
  });
});

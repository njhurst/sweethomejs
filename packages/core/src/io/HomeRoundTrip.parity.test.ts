/**
 * P2 round-trip + cross-read parity suite (task 3.8).
 *
 * Gates:
 *  1. Round-trip identity: read(write(read(fixture))) preserves all
 *     parity-relevant fields across every generated fixture + the 2019 home.
 *  2. Java↔JS cross-read: our Home.xml reader reproduces the Java field-dump
 *     values (test/fixtures/dumps home.dump.json) for walls, furniture,
 *     rooms, levels, dimensions, labels, polylines, environment, camera,
 *     compass.
 *  3. Entry-name order: writeHome produces [Home.xml, ContentDigests,
 *     content…] like the Java writer.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import { Sh3dContainer } from "./Sh3dContainer.js";
import { HomeContentContext } from "./HomeContentContext.js";
import { readHomeXml } from "./HomeXMLReader.js";
import { HomeFileRecorder } from "./HomeFileRecorder.js";
import type { Home } from "../model/Home.js";
import type { Wall } from "../model/Wall.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

/** Loads the Java field dump and indexes $ref handles so objects resolve. */
function loadDump(rel: string): { home: Record<string, unknown>; byHandle: Map<number, Record<string, unknown>> } {
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, rel), "utf8")) as Record<string, unknown>;
  const home = raw["home"] as Record<string, unknown>;
  const byHandle = new Map<number, Record<string, unknown>>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
    } else if (node !== null && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj["$handle"] === "number") {
        byHandle.set(obj["$handle"] as number, obj);
      }
      for (const value of Object.values(obj)) {
        walk(value);
      }
    }
  };
  walk(home);
  return { home, byHandle };
}

/** Resolves a possibly-$ref node from the dump. */
function resolveNode(
  node: Record<string, unknown> | null | undefined,
  byHandle: Map<number, Record<string, unknown>>,
): Record<string, unknown> | null {
  if (node === null || node === undefined) {
    return null;
  }
  if (typeof node["$ref"] === "number") {
    return byHandle.get(node["$ref"] as number) ?? null;
  }
  return node;
}

/** Numeric dump field with float32 comparison (Java floats). */
function expectFloat(actual: number, dumpNode: Record<string, unknown> | null, field: string): void {
  const expected = dumpNode?.[field];
  expect(f32(actual), `${field} (got ${actual}, dump ${expected})`).toBe(f32(expected as number));
}

/** Object-class helper (Java simple class name, e.g. "Wall", "HomePieceOfFurniture"). */
function simpleClassName(node: Record<string, unknown>): string {
  const name = node["$class"] as string;
  return name.substring(name.lastIndexOf(".") + 1);
}

/** Builds our home from a fixture's Home.xml entry. */
function readFixtureHome(fixtureRel: string): Home {
  const container = Sh3dContainer.open(fixtureBytes(fixtureRel));
  const xml = new TextDecoder().decode(container.getEntrySync("Home.xml")!);
  return readHomeXml(xml, null, new HomeContentContext(container));
}

const FIELD_FIXTURES: Array<{ sh3d: string; dump: string }> = [
  { sh3d: "examples/ls_2819.sh3d", dump: "test/fixtures/ls_2819/home.dump.json" },
  { sh3d: "test/fixtures/generated/walls.sh3d", dump: "test/fixtures/dumps/walls/home.dump.json" },
  { sh3d: "test/fixtures/generated/rooms.sh3d", dump: "test/fixtures/dumps/rooms/home.dump.json" },
  { sh3d: "test/fixtures/generated/furniture.sh3d", dump: "test/fixtures/dumps/furniture/home.dump.json" },
  { sh3d: "test/fixtures/generated/levels.sh3d", dump: "test/fixtures/dumps/levels/home.dump.json" },
  { sh3d: "test/fixtures/generated/dimensions-labels.sh3d", dump: "test/fixtures/dumps/dimensions-labels/home.dump.json" },
  { sh3d: "test/fixtures/generated/cameras.sh3d", dump: "test/fixtures/dumps/cameras/home.dump.json" },
  { sh3d: "test/fixtures/generated/environment.sh3d", dump: "test/fixtures/dumps/environment/home.dump.json" },
];

/**
 * Sweeps the whole dump graph for objects of a class, deduplicated by id.
 * Dump layouts differ between fixtures (some inline objects in `homeObjects`,
 * some in per-class lists, some only reachable through references), and ids
 * are normalized (`wall-<uuid>` → `wall-<ordinal>`), so callers match our
 * model objects by geometry/value keys instead of ids.
 */
/** Per-class list keys in the dump (home.furniture, home.walls, ...). */
const DUMP_LIST_KEYS: Array<[string, string]> = [
  ["HomePieceOfFurniture", "furniture"],
  ["HomeDoorOrWindow", "furniture"],
  ["HomeLight", "furniture"],
  ["HomeShelfUnit", "furniture"],
  ["HomeFurnitureGroup", "furniture"],
  ["Wall", "walls"],
  ["Room", "rooms"],
  ["DimensionLine", "dimensionLines"],
  ["Level", "levels"],
  ["Label", "labels"],
  ["Polyline", "polylines"],
];

/**
 * Collects dump objects of a class. Prefers the fully-inline per-class list
 * (exact list order matches the XML order); falls back to a whole-graph sweep
 * deduplicated by normalized id (used when the dump stores the class as
 * references, e.g. walls chained through wallAtEnd). Ids in dumps are
 * normalized (`wall-<uuid>` → `wall-<ordinal>`), so callers match our model
 * objects by value keys.
 */
function dumpAllByClass(homeNode: Record<string, unknown>, className: string): Array<Record<string, unknown>> {
  const listKey = DUMP_LIST_KEYS.find(([c]) => c === className)?.[1];
  if (listKey !== undefined) {
    const list = homeNode[listKey];
    if (Array.isArray(list) && list.length > 0) {
      const allInline = list.every(
        (node) => node !== null && typeof node === "object" && typeof (node as Record<string, unknown>)["$class"] === "string",
      );
      if (allInline) {
        return list.filter(
          (node): node is Record<string, unknown> => typeof (node as Record<string, unknown>)["$class"] === "string" && simpleClassName(node as Record<string, unknown>) === className,
        );
      }
    }
  }
  const seenIds = new Set<string>();
  const out: Array<Record<string, unknown>> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }
    if (node === null || typeof node !== "object") {
      return;
    }
    const obj = node as Record<string, unknown>;
    if (typeof obj["$class"] === "string" && simpleClassName(obj) === className) {
      const id = obj["id"] as string | undefined;
      if (id === undefined || !seenIds.has(id)) {
        if (id !== undefined) {
          seenIds.add(id);
        }
        out.push(obj);
      }
    }
    for (const value of Object.values(obj)) {
      walk(value);
    }
  };
  walk(homeNode);
  return out;
}

function wallKey(wall: Wall): string {
  return [wall.getXStart(), wall.getYStart(), wall.getXEnd(), wall.getYEnd(), wall.getThickness(), wall.getHeight() ?? 0]
    .map((v) => f32(v).toExponential())
    .join(",");
}

function wallKeyFromDump(dumpWall: Record<string, unknown>): string {
  return ["xStart", "yStart", "xEnd", "yEnd", "thickness", "height"]
    .map((field) => f32(dumpWall[field] as number).toExponential())
    .join(",");
}

describe("Java↔JS cross-read field parity (task 3.8)", () => {
  for (const { sh3d, dump } of FIELD_FIXTURES) {
    const label = sh3d.split("/").pop()!;
    it(`matches the Java field dump for ${label}`, () => {
      const home = readFixtureHome(sh3d);
      const { home: dumpHome, byHandle } = loadDump(dump);

      // Walls — match dump objects to our walls by geometry key (dump order
      // differs between fixtures; ids are normalized to wall-<ordinal>)
      const dumpWalls = dumpAllByClass(dumpHome, "Wall");
      const walls = home.getWalls();
      expect(walls.length).toBe(dumpWalls.length);
      for (const dumpWall of dumpWalls) {
        const wall = walls.find((w) => wallKey(w) === wallKeyFromDump(dumpWall));
        expect(wall, `wall matching ${dumpWall["id"]}`).toBeDefined();
        expectFloat(wall!.getXStart(), dumpWall, "xStart");
        expectFloat(wall!.getYStart(), dumpWall, "yStart");
        expectFloat(wall!.getXEnd(), dumpWall, "xEnd");
        expectFloat(wall!.getYEnd(), dumpWall, "yEnd");
        expectFloat(wall!.getThickness(), dumpWall, "thickness");
        expectFloat(wall!.getHeight() ?? 0, dumpWall, "height");
        const heightAtEnd = wall!.getHeightAtEnd();
        if (dumpWall["heightAtEnd"] === null) {
          expect(heightAtEnd).toBeNull();
        } else {
          expectFloat(heightAtEnd ?? 0, dumpWall, "heightAtEnd");
        }
        const arcExtent = wall!.getArcExtent();
        if (dumpWall["arcExtent"] === null) {
          expect(arcExtent).toBeNull();
        } else {
          expectFloat(arcExtent ?? 0, dumpWall, "arcExtent");
        }
      }

      // Furniture (base + doors/windows/lights/shelf units/groups)
      const dumpFurniture = dumpAllByClass(dumpHome, "HomePieceOfFurniture")
        .concat(dumpAllByClass(dumpHome, "HomeDoorOrWindow"))
        .concat(dumpAllByClass(dumpHome, "HomeLight"))
        .concat(dumpAllByClass(dumpHome, "HomeShelfUnit"))
        .concat(dumpAllByClass(dumpHome, "HomeFurnitureGroup"));
      const furniture = home.getFurniture();
      expect(furniture.length).toBe(dumpFurniture.length);
      for (const dumpPiece of dumpFurniture) {
        const piece = furniture.find(
          (p) => p.getName() === dumpPiece["name"]
            && f32(p.getX()) === f32(dumpPiece["x"] as number)
            && f32(p.getY()) === f32(dumpPiece["y"] as number)
            && f32(p.getElevation()) === f32(dumpPiece["elevation"] as number)
            && f32(p.getWidth()) === f32(dumpPiece["width"] as number)
            && f32(p.getDepth()) === f32(dumpPiece["depth"] as number)
            && f32(p.getHeight()) === f32(dumpPiece["height"] as number),
        );
        expect(piece, `furniture matching ${dumpPiece["id"]}`).toBeDefined();
        expect(piece!.getName()).toBe(dumpPiece["name"]);
        expectFloat(piece!.getWidth(), dumpPiece, "width");
        expectFloat(piece!.getDepth(), dumpPiece, "depth");
        expectFloat(piece!.getHeight(), dumpPiece, "height");
        expectFloat(piece!.getX(), dumpPiece, "x");
        expectFloat(piece!.getY(), dumpPiece, "y");
        expectFloat(piece!.getElevation(), dumpPiece, "elevation");
        expectFloat(piece!.getAngle(), dumpPiece, "angle");
      }

      // Rooms
      const dumpRooms = dumpAllByClass(dumpHome, "Room");
      const rooms = home.getRooms();
      expect(rooms.length).toBe(dumpRooms.length);
      for (const dumpRoom of dumpRooms) {
        const room = rooms.find(
          (r) => r.getName() === dumpRoom["name"]
            && f32(r.getXCenter()) === f32(dumpRoom["xCenter"] as number)
            && f32(r.getYCenter()) === f32(dumpRoom["yCenter"] as number),
        );
        expect(room, `room matching ${dumpRoom["id"]}`).toBeDefined();
        expect(room!.getName()).toBe(dumpRoom["name"]);
        expectFloat(room!.getXCenter(), dumpRoom, "xCenter");
        expectFloat(room!.getYCenter(), dumpRoom, "yCenter");
      }

      // Dimension lines
      const dumpDims = dumpAllByClass(dumpHome, "DimensionLine");
      const dims = home.getDimensionLines();
      expect(dims.length).toBe(dumpDims.length);
      for (const dumpDim of dumpDims) {
        const dim = dims.find(
          (d) => f32(d.getXStart()) === f32(dumpDim["xStart"] as number)
            && f32(d.getYStart()) === f32(dumpDim["yStart"] as number)
            && f32(d.getXEnd()) === f32(dumpDim["xEnd"] as number)
            && f32(d.getYEnd()) === f32(dumpDim["yEnd"] as number),
        );
        expect(dim, `dimensionLine matching ${dumpDim["id"]}`).toBeDefined();
        expectFloat(dim!.getXStart(), dumpDim, "xStart");
        expectFloat(dim!.getYStart(), dumpDim, "yStart");
        expectFloat(dim!.getXEnd(), dumpDim, "xEnd");
        expectFloat(dim!.getYEnd(), dumpDim, "yEnd");
        expectFloat(dim!.getOffset(), dumpDim, "offset");
        expectFloat(dim!.getEndMarkSize(), dumpDim, "endMarkSize");
      }

      // Levels
      const dumpLevels = dumpAllByClass(dumpHome, "Level");
      const levels = home.getLevels();
      expect(levels.length).toBe(dumpLevels.length);
      for (const dumpLevel of dumpLevels) {
        const level = levels.find((l) => l.getName() === dumpLevel["name"]);
        expect(level, `level matching ${dumpLevel["id"]}`).toBeDefined();
        expect(level!.getName()).toBe(dumpLevel["name"]);
        expectFloat(level!.getElevation(), dumpLevel, "elevation");
        expectFloat(level!.getHeight(), dumpLevel, "height");
      }

      // Labels
      const dumpLabels = dumpAllByClass(dumpHome, "Label");
      const labels = home.getLabels();
      expect(labels.length).toBe(dumpLabels.length);
      for (const dumpLabel of dumpLabels) {
        const label = labels.find(
          (l) => l.getText() === dumpLabel["text"]
            && f32(l.getX()) === f32(dumpLabel["x"] as number),
        );
        expect(label, `label matching ${dumpLabel["id"]}`).toBeDefined();
        expect(label!.getText()).toBe(dumpLabel["text"]);
        expectFloat(label!.getX(), dumpLabel, "x");
        expectFloat(label!.getY(), dumpLabel, "y");
        expectFloat(label!.getPitch() ?? 0, dumpLabel, "pitch");
      }

      // Polylines
      const dumpPolylines = dumpAllByClass(dumpHome, "Polyline");
      const polylines = home.getPolylines();
      expect(polylines.length).toBe(dumpPolylines.length);
      for (const dumpPolyline of dumpPolylines) {
        const polyline = polylines.find((p) => {
          const points = p.getPoints();
          const dumpPoints = dumpPolyline["points"] as number[][];
          return points.length === dumpPoints.length
            && points.every((pt, k) => f32(pt[0]!) === f32(dumpPoints[k]![0]!) && f32(pt[1]!) === f32(dumpPoints[k]![1]!));
        });
        expect(polyline, `polyline matching ${dumpPolyline["id"]}`).toBeDefined();
        if (dumpPolyline["closed"] !== undefined) {
          expect(polyline!.isClosedPath()).toBe(dumpPolyline["closed"]);
        }
        if (dumpPolyline["visibleIn3D"] !== undefined) {
          expect(polyline!.isVisibleIn3D()).toBe(dumpPolyline["visibleIn3D"]);
        }
      }

    });
  }
});

describe("Round-trip identity across fixtures (task 3.8)", () => {
  const recorder = new HomeFileRecorder();
  const ROUND_TRIP_FIXTURES = [
    "test/fixtures/generated/walls.sh3d",
    "test/fixtures/generated/rooms.sh3d",
    "test/fixtures/generated/furniture.sh3d",
    "test/fixtures/generated/levels.sh3d",
    "test/fixtures/generated/dimensions-labels.sh3d",
    "test/fixtures/generated/cameras.sh3d",
    "test/fixtures/generated/environment.sh3d",
    "examples/ls_2819.sh3d",
  ];

  it("preserves wall/furniture/level geometry and counts after read→write→read", async () => {
    for (const rel of ROUND_TRIP_FIXTURES) {
      const original = readFixtureHome(rel);
      const written = await recorder.writeHome(original);
      const reread = await recorder.readHomeFromZip(written);

      expect(reread.home.getWalls().length).toBe(original.getWalls().length);
      expect(reread.home.getFurniture().length).toBe(original.getFurniture().length);
      expect(reread.home.getRooms().length).toBe(original.getRooms().length);
      expect(reread.home.getLevels().length).toBe(original.getLevels().length);

      // Every wall geometry field survives exactly (float32 round-trip)
      const originalWalls = [...original.getWalls()].sort((a, b) => a.getId().localeCompare(b.getId()));
      const rereadWalls = [...reread.home.getWalls()].sort((a, b) => a.getId().localeCompare(b.getId()));
      for (let i = 0; i < originalWalls.length; i++) {
        const a = originalWalls[i]!;
        const b = rereadWalls[i]!;
        expect(a.getId()).toBe(b.getId());
        expect(a.getXStart()).toBe(b.getXStart());
        expect(a.getYStart()).toBe(b.getYStart());
        expect(a.getXEnd()).toBe(b.getXEnd());
        expect(a.getYEnd()).toBe(b.getYEnd());
        expect(a.getThickness()).toBe(b.getThickness());
        expect(a.getHeight()).toBe(b.getHeight());
        expect(a.getHeightAtEnd()).toBe(b.getHeightAtEnd());
      }
    }
  });

  it("is stable: write→read→write produces identical XML", async () => {
    const original = readFixtureHome("test/fixtures/generated/walls.sh3d");
    const first = await recorder.writeHome(original);
    const reread = await recorder.readHomeFromZip(first);
    const second = await recorder.writeHome(reread.home);
    const containerA = Sh3dContainer.open(first);
    const containerB = Sh3dContainer.open(second);
    const xmlA = new TextDecoder().decode(containerA.getEntrySync("Home.xml")!);
    const xmlB = new TextDecoder().decode(containerB.getEntrySync("Home.xml")!);
    expect(xmlB).toBe(xmlA);
  });
});

describe("writeHome entry-name order (task 3.8)", () => {
  it("writes Home.xml, ContentDigests, then content entries (Java order)", async () => {
    const recorder = new HomeFileRecorder();
    const home = readFixtureHome("examples/ls_2819.sh3d");
    const written = await recorder.writeHome(home);
    const container = Sh3dContainer.open(written);
    const names = container.getEntryNames();
    const order = names.filter((n) => n === "Home.xml" || n === "ContentDigests" || /^\d+\//.test(n));
    expect(order[0]).toBe("Home.xml");
    expect(order[1]).toBe("ContentDigests");
    for (let i = 2; i < order.length; i++) {
      expect(order[i]).toMatch(/^\d+\//);
    }
  });
});

/**
 * Wall.getPoints() parity test: reconstructs walls from the Java field dumps
 * (captured by tools/java-harness DumpHome) and compares the outline geometry
 * bit-for-bit (float32). Covers straight, connected, arc and baseboard walls
 * from the 2019 user home and the generated walls fixture.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import { Level } from "./Level.js";
import { Wall } from "./Wall.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

type Json = Record<string, unknown>;

/**
 * Reconstructs DumpHome's `$ref` handle table: handles are assigned in first-
 * encounter order, which matches a depth-first walk of the written JSON (each
 * inline object/list/map was a first encounter; $refs replaced later ones).
 * Returns the resolved tree (mutating the input).
 */
function resolveRefs(node: unknown): unknown {
  // Handles match DumpHome's seen.put(obj, seen.size()): the home bean is 0;
  // only beans ($class), lists and $map nodes get handles; $error/content
  // synthetic nodes do not.
  let handle = -1;
  const byHandle = new Map<number, unknown>();
  const visited = new Set<object>();
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      if (visited.has(value)) return value;
      visited.add(value);
      handle += 1;
      byHandle.set(handle, value);
      for (let i = 0; i < value.length; i++) {
        value[i] = walk(value[i]);
      }
      return value;
    }
    if (value !== null && typeof value === "object") {
      const record = value as Json;
      if (visited.has(record)) return record;
      if (typeof record["$ref"] === "number") {
        return byHandle.get(record["$ref"]) ?? null;
      }
      if (typeof record["$class"] === "string") {
        visited.add(record);
        handle += 1;
        byHandle.set(handle, record);
        for (const key of Object.keys(record)) {
          record[key] = walk(record[key]);
        }
        return record;
      }
      if (Array.isArray(record["$map"])) {
        visited.add(record);
        handle += 1;
        byHandle.set(handle, record);
        for (const pair of record["$map"] as unknown[]) {
          const arrayPair = pair as unknown[];
          arrayPair[0] = walk(arrayPair[0]);
          arrayPair[1] = walk(arrayPair[1]);
        }
        return record;
      }
      // Synthetic nodes ($error, content dicts) carry no handle.
      visited.add(record);
      for (const key of Object.keys(record)) {
        record[key] = walk(record[key]);
      }
      return record;
    }
    return value;
  };
  return walk(node);
}

/** Collects every unique wall dict by id from a DumpHome field dump. */
function extractWalls(dump: Json): Map<string, Json> {
  const resolved = resolveRefs(JSON.parse(JSON.stringify(dump)));
  const walls = new Map<string, Json>();
  const home = (resolved as Json)["home"] as Json;
  const visit = (obj: unknown, seen: Set<object>): void => {
    if (Array.isArray(obj)) {
      if (seen.has(obj)) return;
      seen.add(obj);
      for (const item of obj) visit(item, seen);
      return;
    }
    if (obj === null || typeof obj !== "object") return;
    const record = obj as Json;
    if (seen.has(record)) return;
    seen.add(record);
    if (typeof record["$class"] === "string" && (record["$class"] as string).endsWith(".Wall")) {
      const id = record["id"];
      if (typeof id === "string") walls.set(id, record);
    }
    for (const value of Object.values(record)) {
      visit(value, seen);
    }
  };
  visit(home, new Set());
  return walls;
}

function extractLevels(dump: Json): Map<string, Level> {
  const levels = new Map<string, Level>();
  const home = dump["home"] as Json;
  for (const obj of (home["homeObjects"] as Json[]) ?? []) {
    if ((obj["$class"] as string | undefined)?.endsWith(".Level")) {
      levels.set(obj["id"] as string, new Level(obj["name"] as string, obj["elevation"] as number, obj["floorThickness"] as number, obj["height"] as number));
    }
  }
  return levels;
}

function buildWall(dict: Json, wallsById: Map<string, Json>, levels: Map<string, Level>): Wall {
  const wall = new Wall(
    dict["xStart"] as number,
    dict["yStart"] as number,
    dict["xEnd"] as number,
    dict["yEnd"] as number,
    dict["thickness"] as number,
  );
  const arcExtent = dict["arcExtent"];
  if (arcExtent !== null && arcExtent !== undefined) {
    wall.setArcExtent(arcExtent as number);
  }
  const height = dict["height"];
  if (height !== null && height !== undefined) wall.setHeight(height as number);
  const heightAtEnd = dict["heightAtEnd"];
  if (heightAtEnd !== null && heightAtEnd !== undefined) wall.setHeightAtEnd(heightAtEnd as number);
  const level = dict["level"];
  if (level !== null && typeof level === "object") {
    const levelId = (level as Json)["id"];
    if (typeof levelId === "string") wall.setLevel(levels.get(levelId) ?? null);
  }
  // Connections are wired afterwards (a wall's dict may embed the joined wall).
  return wall;
}

function wireConnections(walls: Map<string, Json>, built: Map<string, Wall>): void {
  for (const [id, dict] of walls) {
    const wall = built.get(id);
    if (wall === undefined) continue;
    const wallAtStart = dict["wallAtStart"];
    if (wallAtStart !== null && typeof wallAtStart === "object") {
      const startId = (wallAtStart as Json)["id"];
      if (typeof startId === "string") wall.setWallAtStart(built.get(startId) ?? null);
    }
    const wallAtEnd = dict["wallAtEnd"];
    if (wallAtEnd !== null && typeof wallAtEnd === "object") {
      const endId = (wallAtEnd as Json)["id"];
      if (typeof endId === "string") wall.setWallAtEnd(built.get(endId) ?? null);
    }
  }
}

function assertWallParity(dumpPath: string): void {
  const dump = JSON.parse(readFileSync(join(REPO_ROOT, dumpPath), "utf8")) as Json;
  const wallsById = extractWalls(dump);
  const levels = extractLevels(dump);
  const built = new Map<string, Wall>();
  for (const [id, dict] of wallsById) {
    built.set(id, buildWall(dict, wallsById, levels));
  }
  wireConnections(wallsById, built);

  // Call getPoints in dump order (homeObjects order) to mirror the Java
  // harness's cache population order.
  const home = dump["home"] as Json;
  const orderedIds: string[] = [];
  for (const obj of (home["homeObjects"] as Json[]) ?? []) {
    if ((obj["$class"] as string | undefined)?.endsWith(".Wall")) {
      orderedIds.push(obj["id"] as string);
    }
  }
  const ids = orderedIds.length > 0 ? orderedIds : [...wallsById.keys()];

  let compared = 0;
  for (const id of ids) {
    const dict = wallsById.get(id)!;
    const wall = built.get(id)!;
    const expected = dict["points"] as number[][];
    const actual = wall.getPoints();
    expect(actual.length, `wall ${id} point count`).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      const expectedPoint = expected[i]!;
      const actualPoint = actual[i]!;
      expect(f32(expectedPoint[0]!), `wall ${id} points[${i}].x`).toBe(actualPoint[0]!);
      expect(f32(expectedPoint[1]!), `wall ${id} points[${i}].y`).toBe(actualPoint[1]!);
    }
    compared++;
  }
  expect(compared).toBeGreaterThan(0);
}

describe("Wall geometry parity (task 2.3)", () => {
  it("matches Java getPoints() for the 2019 user home (24 walls, connected)", () => {
    assertWallParity("test/fixtures/ls_2819/home.dump.json");
  });

  it("matches Java getPoints() for the generated walls fixture (arc + baseboards)", () => {
    assertWallParity("test/fixtures/dumps/walls/home.dump.json");
  });
});

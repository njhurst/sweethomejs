/**
 * Room parity test (task 2.3): reconstructs rooms from the Java field dumps
 * and compares area, points, clockwise and singularity against Java's
 * computed values.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import { Room } from "./Room.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

type Json = Record<string, unknown>;

function collectRooms(dumpPath: string): Room[] {
  const dump = JSON.parse(readFileSync(join(REPO_ROOT, dumpPath), "utf8")) as Json;
  const home = dump["home"] as Json;
  const rooms: Room[] = [];
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
    if (typeof record["$class"] === "string" && (record["$class"] as string).endsWith(".Room")) {
      if (Array.isArray(record["points"])) {
        const points = (record["points"] as number[][]).map((p) => [p[0]!, p[1]!]);
        rooms.push(new Room(record["id"] as string, points));
      }
      return; // skip nested duplicates
    }
    for (const value of Object.values(record)) {
      visit(value, seen);
    }
  };
  visit(home, new Set());
  return rooms;
}

function assertRoomParity(dumpPath: string): void {
  const dump = JSON.parse(readFileSync(join(REPO_ROOT, dumpPath), "utf8")) as Json;
  const home = dump["home"] as Json;
  const rooms = collectRooms(dumpPath);
  expect(rooms.length).toBeGreaterThan(0);

  // Match each dump room to its built room by points (the dump stores rooms
  // inline under the rooms getter with their computed values).
  const dumpRooms: Json[] = [];
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
    if (typeof record["$class"] === "string" && (record["$class"] as string).endsWith(".Room") && Array.isArray(record["points"])) {
      dumpRooms.push(record);
    }
    for (const value of Object.values(record)) {
      visit(value, seen);
    }
  };
  visit(home, new Set());

  let compared = 0;
  for (const dumpRoom of dumpRooms) {
    const dumpPoints = (dumpRoom["points"] as number[][]).map((p) => [f32(p[0]!), f32(p[1]!)]);
    const room = rooms.find((r) => r.getPoints().length === dumpPoints.length && r.getPoints().every((p, i) => p[0] === dumpPoints[i]![0] && p[1] === dumpPoints[i]![1]));
    if (room === undefined) continue;

    // getArea matches the dump's area value (float32)
    const dumpArea = f32(dumpRoom["area"] as number);
    expect(f32(room.getArea()), `room area ${JSON.stringify(dumpPoints.slice(0, 2))}`).toBe(dumpArea);

    // isClockwise matches
    expect(room.isClockwise(), `room clockwise ${JSON.stringify(dumpPoints.slice(0, 2))}`).toBe(dumpRoom["clockwise"] as boolean);

    // isSingular matches (Java: new Area(getShape()).isSingular())
    expect(room.isSingular(), `room singular ${JSON.stringify(dumpPoints.slice(0, 2))}`).toBe(dumpRoom["singular"] as boolean);

    // getPoints round-trips
    expect(room.getPoints()).toEqual(dumpPoints);
    compared++;
  }
  expect(compared).toBeGreaterThan(0);
}

describe("Room parity (task 2.3)", () => {
  it("matches Java area/points/clockwise/singular for the 2019 user home rooms", () => {
    assertRoomParity("test/fixtures/ls_2819/home.dump.json");
  });

  it("matches Java for the generated rooms fixture", () => {
    assertRoomParity("test/fixtures/dumps/rooms/home.dump.json");
  });
});

/**
 * Furniture parity test (task 2.4): reconstructs furniture from the Java field
 * dumps and compares plan footprint points (getPoints) bit-for-bit.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import { HomeDoorOrWindow } from "./HomeDoorOrWindow.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

type Json = Record<string, unknown>;

function collectFurniture(dumpPath: string): Json[] {
  const dump = JSON.parse(readFileSync(join(REPO_ROOT, dumpPath), "utf8")) as Json;
  const home = dump["home"] as Json;
  const items: Json[] = [];
  const seen = new Set<object>();
  const visit = (obj: unknown): void => {
    if (Array.isArray(obj)) {
      if (seen.has(obj)) return;
      seen.add(obj);
      for (const item of obj) visit(item);
      return;
    }
    if (obj === null || typeof obj !== "object") return;
    const record = obj as Json;
    if (seen.has(record)) return;
    seen.add(record);
    const cls = record["$class"] as string | undefined;
    if (typeof cls === "string" && (cls.endsWith(".HomePieceOfFurniture") || cls.endsWith(".HomeDoorOrWindow") || cls.endsWith(".HomeLight") || cls.endsWith(".HomeShelfUnit"))) {
      if (Array.isArray(record["points"])) {
        items.push(record);
        return;
      }
    }
    for (const value of Object.values(record)) {
      visit(value);
    }
  };
  visit(home);
  return items;
}

function buildPiece(dict: Json): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture(
    dict["id"] as string,
    // Minimal PieceOfFurniture supplier from the dump fields
    {
      getName: () => dict["name"] as string | null,
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => dict["depth"] as number,
      getHeight: () => dict["height"] as number,
      getWidth: () => dict["width"] as number,
      getElevation: () => dict["elevation"] as number,
      getDropOnTopElevation: () => dict["dropOnTopElevation"] as number,
      isMovable: () => dict["movable"] as boolean,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => null,
      getModelFlags: () => 0,
      getModelSize: () => null,
      getModelRotation: () => [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => dict["color"] as number | null,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => dict["currency"] as string | null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    },
  );
  piece.setX(dict["x"] as number);
  piece.setY(dict["y"] as number);
  piece.setAngle(dict["angle"] as number);
  piece.setPitch((dict["pitch"] as number) ?? 0);
  piece.setRoll((dict["roll"] as number) ?? 0);
  piece.setModelMirrored(dict["modelMirrored"] as boolean);
  piece.setWidthInPlan(dict["widthInPlan"] as number);
  piece.setDepthInPlan(dict["depthInPlan"] as number);
  piece.setHeightInPlan(dict["heightInPlan"] as number);
  piece.setVisible(dict["visible"] as boolean);
  piece.setElevation(dict["elevation"] as number);
  return piece;
}

function assertFurnitureParity(dumpPath: string): void {
  const items = collectFurniture(dumpPath);
  expect(items.length).toBeGreaterThan(0);
  let compared = 0;
  for (const dict of items) {
    const piece = buildPiece(dict);
    const expected = dict["points"] as number[][];
    const actual = piece.getPoints();
    expect(actual.length, `piece ${dict["id"]}`).toBe(expected.length);
    for (let i = 0; i < expected.length; i++) {
      expect(f32(expected[i]![0]!), `piece ${dict["id"]} points[${i}].x`).toBe(actual[i]![0]!);
      expect(f32(expected[i]![1]!), `piece ${dict["id"]} points[${i}].y`).toBe(actual[i]![1]!);
    }
    compared++;
  }
  expect(compared).toBe(items.length);
}

describe("Furniture parity (task 2.4)", () => {
  it("matches Java getPoints() for the 2019 user home furniture (152 pieces incl. doors/windows)", () => {
    assertFurnitureParity("test/fixtures/dream_house/home.dump.json");
  });

  it("matches Java getPoints() for the generated furniture fixture (rotated/mirrored pieces + group)", () => {
    assertFurnitureParity("test/fixtures/dumps/furniture/home.dump.json");
  });
});

#!/usr/bin/env node
/**
 * replay-home — model replay harness (task 2.10).
 *
 * Builds a Home object graph from a DumpHome field dump (test/fixtures) and
 * prints a structural summary. Used to verify the ported model classes work
 * together on real data before the .sh3d XML reader lands (P2).
 *
 * Usage: node tools/replay-home.mjs <home.dump.json>
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

async function main() {
  const dumpPath = process.argv[2] ?? "test/fixtures/ls_2819/home.dump.json";
  const dump = JSON.parse(readFileSync(dumpPath, "utf8"));
  const home = dump["home"];

  // Resolve $refs the same way the parity tests do.
  const resolved = resolveRefs(structuredClone(dump));
  const homeObj = resolved["home"];

  const { Home } = await import("../packages/core/src/model/Home.ts");
  const { Wall } = await import("../packages/core/src/model/Wall.ts");
  const { Room } = await import("../packages/core/src/model/Room.ts");
  const { HomePieceOfFurniture } = await import("../packages/core/src/model/HomePieceOfFurniture.ts");
  const { HomeDoorOrWindow } = await import("../packages/core/src/model/HomeDoorOrWindow.ts");
  const { HomeLight } = await import("../packages/core/src/model/HomeLight.ts");
  const { Level } = await import("../packages/core/src/model/Level.ts");
  const { Polyline } = await import("../packages/core/src/model/Polyline.ts");
  const { DimensionLine } = await import("../packages/core/src/model/DimensionLine.ts");
  const { Label } = await import("../packages/core/src/model/Label.ts");

  const built = new Home();
  built.setName(homeObj["name"] ?? null);
  built.setVersion(homeObj["version"] ?? 7400);

  // Levels
  for (const obj of homeObj["homeObjects"] ?? []) {
    if (obj?.["$class"]?.endsWith(".Level")) {
      built.addLevel(new Level(obj["id"], obj["name"], obj["elevation"], obj["floorThickness"], obj["height"]));
    }
  }
  const levelById = new Map(built.getLevels().map((l) => [l.getId(), l]));

  // Furniture (top-level list only; homeObjects also contains group members)
  for (const obj of homeObj["furniture"] ?? []) {
    const cls = obj?.["$class"] ?? "";
    if (cls.endsWith(".HomePieceOfFurniture") || cls.endsWith(".HomeDoorOrWindow") || cls.endsWith(".HomeLight") || cls.endsWith(".HomeShelfUnit")) {
      const piece = new HomePieceOfFurniture(
        obj["id"],
        {
          getName: () => obj["name"],
          getDescription: () => obj["description"],
          getInformation: () => obj["information"],
          getLicense: () => obj["license"],
          getDepth: () => obj["depth"],
          getHeight: () => obj["height"],
          getWidth: () => obj["width"],
          getElevation: () => obj["elevation"],
          getDropOnTopElevation: () => obj["dropOnTopElevation"],
          isMovable: () => obj["movable"],
          isDoorOrWindow: () => cls.endsWith(".HomeDoorOrWindow"),
          getIcon: () => null,
          getPlanIcon: () => null,
          getModel: () => null,
          getModelFlags: () => 0,
          getModelSize: () => null,
          getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          getStaircaseCutOutShape: () => obj["staircaseCutOutShape"],
          getCreator: () => obj["creator"],
          isBackFaceShown: () => false,
          getColor: () => obj["color"],
          isResizable: () => true,
          isDeformable: () => true,
          isWidthDepthDeformable: () => true,
          isTexturable: () => true,
          isHorizontallyRotatable: () => true,
          getPrice: () => null,
          getValueAddedTaxPercentage: () => null,
          getCurrency: () => obj["currency"],
          getProperty: () => null,
          getPropertyNames: () => [],
          getContentProperty: () => null,
          isContentProperty: () => false,
          getLevel: () => null,
        },
      );
      piece.setX(obj["x"]);
      piece.setY(obj["y"]);
      piece.setAngle(obj["angle"]);
      piece.setPitch(obj["pitch"] ?? 0);
      piece.setRoll(obj["roll"] ?? 0);
      piece.setModelMirrored(obj["modelMirrored"]);
      piece.setWidthInPlan(obj["widthInPlan"]);
      piece.setDepthInPlan(obj["depthInPlan"]);
      piece.setHeightInPlan(obj["heightInPlan"]);
      piece.setElevation(obj["elevation"]);
      const levelRef = obj["level"];
      if (levelRef?.id) piece.setLevel(levelById.get(levelRef.id) ?? null);
      built.addPieceOfFurniture(piece);
    } else if (cls.endsWith(".HomeFurnitureGroup") && Array.isArray(obj["furniture"])) {
      // Build the group from its children (recursively).
      const children = obj["furniture"].map((child) => {
        const childPiece = new HomePieceOfFurniture(
          child["id"],
          {
            getName: () => child["name"],
            getDescription: () => null,
            getInformation: () => null,
            getLicense: () => null,
            getDepth: () => child["depth"],
            getHeight: () => child["height"],
            getWidth: () => child["width"],
            getElevation: () => child["elevation"],
            getDropOnTopElevation: () => child["dropOnTopElevation"],
            isMovable: () => child["movable"],
            isDoorOrWindow: () => false,
            getIcon: () => null,
            getPlanIcon: () => null,
            getModel: () => null,
            getModelFlags: () => 0,
            getModelSize: () => null,
            getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
            getStaircaseCutOutShape: () => null,
            getCreator: () => null,
            isBackFaceShown: () => false,
            getColor: () => child["color"],
            isResizable: () => true,
            isDeformable: () => true,
            isWidthDepthDeformable: () => true,
            isTexturable: () => true,
            isHorizontallyRotatable: () => true,
            getPrice: () => null,
            getValueAddedTaxPercentage: () => null,
            getCurrency: () => null,
            getProperty: () => null,
            getPropertyNames: () => [],
            getContentProperty: () => null,
            isContentProperty: () => false,
            getLevel: () => null,
          },
        );
        childPiece.setX(child["x"]);
        childPiece.setY(child["y"]);
        childPiece.setAngle(child["angle"]);
        childPiece.setWidthInPlan(child["widthInPlan"]);
        childPiece.setDepthInPlan(child["depthInPlan"]);
        childPiece.setHeightInPlan(child["heightInPlan"]);
        return childPiece;
      });
      const { HomeFurnitureGroup } = await import("../packages/core/src/model/HomeFurnitureGroup.ts");
      built.addPieceOfFurniture(new HomeFurnitureGroup(obj["id"], children, obj["angle"], obj["modelMirrored"], obj["name"] ?? ""));
    }
  }

  // Walls
  for (const obj of homeObj["homeObjects"] ?? []) {
    if (obj?.["$class"]?.endsWith(".Wall")) {
      const wall = new Wall(obj["id"], obj["xStart"], obj["yStart"], obj["xEnd"], obj["yEnd"], obj["thickness"]);
      if (obj["arcExtent"] !== null) wall.setArcExtent(obj["arcExtent"]);
      if (obj["height"] !== null) wall.setHeight(obj["height"]);
      if (obj["heightAtEnd"] !== null) wall.setHeightAtEnd(obj["heightAtEnd"]);
      const levelRef = obj["level"];
      if (levelRef?.id) wall.setLevel(levelById.get(levelRef.id) ?? null);
      built.addWall(wall);
    }
  }
  // Wall connections by id
  const wallsById = new Map(built.getWalls().map((w) => [w.getId(), w]));
  for (const obj of homeObj["homeObjects"] ?? []) {
    if (obj?.["$class"]?.endsWith(".Wall")) {
      const wall = wallsById.get(obj["id"]);
      if (obj["wallAtStart"]?.id) wall?.setWallAtStart(wallsById.get(obj["wallAtStart"].id) ?? null);
      if (obj["wallAtEnd"]?.id) wall?.setWallAtEnd(wallsById.get(obj["wallAtEnd"].id) ?? null);
    }
  }

  // Rooms
  for (const obj of homeObj["homeObjects"] ?? []) {
    if (obj?.["$class"]?.endsWith(".Room") && Array.isArray(obj["points"])) {
      const room = new Room(obj["id"], obj["points"].map((p) => [p[0], p[1]]));
      if (obj["name"] !== null) room.setName(obj["name"]);
      const levelRef = obj["level"];
      if (levelRef?.id) room.setLevel(levelById.get(levelRef.id) ?? null);
      built.addRoom(room);
    }
  }

  // Dimension lines, polylines, labels
  for (const obj of homeObj["homeObjects"] ?? []) {
    const cls = obj?.["$class"] ?? "";
    if (cls.endsWith(".DimensionLine")) {
      const dl = new DimensionLine(obj["id"], obj["xStart"], obj["yStart"], obj["elevationStart"], obj["xEnd"], obj["yEnd"], obj["elevationEnd"], obj["offset"]);
      const levelRef = obj["level"];
      if (levelRef?.id) dl.setLevel(levelById.get(levelRef.id) ?? null);
      built.addDimensionLine(dl);
    } else if (cls.endsWith(".Polyline")) {
      const pl = new Polyline(obj["id"], obj["points"].map((p) => [p[0], p[1]]));
      pl.setThickness(obj["thickness"]);
      pl.setColor(obj["color"]);
      pl.setClosedPath(obj["closedPath"]);
      const levelRef = obj["level"];
      if (levelRef?.id) pl.setLevel(levelById.get(levelRef.id) ?? null);
      built.addPolyline(pl);
    } else if (cls.endsWith(".Label")) {
      const label = new Label(obj["id"], obj["text"], obj["x"], obj["y"]);
      const levelRef = obj["level"];
      if (levelRef?.id) label.setLevel(levelById.get(levelRef.id) ?? null);
      built.addLabel(label);
    }
  }

  // Summary vs Java dump
  const expected = {
    furniture: homeObj["furniture"].length,
    walls: homeObj["walls"].length,
    rooms: homeObj["rooms"].length,
    levels: homeObj["levels"].length,
    dimensionLines: homeObj["dimensionLines"].length,
    polylines: homeObj["polylines"].length,
    labels: homeObj["labels"].length,
  };
  const actual = {
    furniture: built.getFurniture().length,
    walls: built.getWalls().length,
    rooms: built.getRooms().length,
    levels: built.getLevels().length,
    dimensionLines: built.getDimensionLines().length,
    polylines: built.getPolylines().length,
    labels: built.getLabels().length,
  };
  console.log("expected:", JSON.stringify(expected));
  console.log("actual:  ", JSON.stringify(actual));
  const ok = Object.keys(expected).every((k) => expected[k] === actual[k]);
  console.log(ok ? "REPLAY OK" : "REPLAY MISMATCH");
  process.exit(ok ? 0 : 1);
}

/** Resolves DumpHome $refs (same algorithm as the parity tests). */
function resolveRefs(node) {
  let handle = -1;
  const byHandle = new Map();
  const visited = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) {
      if (visited.has(value)) return value;
      visited.add(value);
      handle += 1;
      byHandle.set(handle, value);
      for (let i = 0; i < value.length; i++) value[i] = walk(value[i]);
      return value;
    }
    if (value !== null && typeof value === "object") {
      if (visited.has(value)) return value;
      if (typeof value["$ref"] === "number") return byHandle.get(value["$ref"]) ?? null;
      if (typeof value["$class"] === "string") {
        visited.add(value);
        handle += 1;
        byHandle.set(handle, value);
        for (const k of Object.keys(value)) value[k] = walk(value[k]);
        return value;
      }
      if (Array.isArray(value["$map"])) {
        visited.add(value);
        handle += 1;
        byHandle.set(handle, value);
        for (const p of value["$map"]) { p[0] = walk(p[0]); p[1] = walk(p[1]); }
        return value;
      }
      visited.add(value);
      for (const k of Object.keys(value)) value[k] = walk(value[k]);
      return value;
    }
    return value;
  };
  return walk(node);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

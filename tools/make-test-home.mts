/*
 * make-test-home.mts
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

/**
 * make-test-home.mts — generates a self-contained test home fixture
 * (apps/web/public/fixtures/test-home.sh3d) replacing the 58-anderson file
 * (someone else's real home, removed from the public repo). The home has a
 * walled house, rooms, and furniture with EMBEDDED OBJ models so the plan
 * icon cache and 3D view have real models to render.
 */
import { writeFileSync } from "node:fs";
// Import from source (not the dist bundle): the dist transpiles class names
// to _Home/_Wall etc., which would write non-canonical XML tags (<_Home>) the
// reader can't parse.
import { Home } from "../packages/core/src/model/Home.ts";
import { Wall } from "../packages/core/src/model/Wall.ts";
import { Room } from "../packages/core/src/model/Room.ts";
import { HomePieceOfFurniture } from "../packages/core/src/model/HomePieceOfFurniture.ts";
import { HomeDoorOrWindow } from "../packages/core/src/model/HomeDoorOrWindow.ts";
import { HomeFileRecorder } from "../packages/core/src/io/HomeFileRecorder.ts";
import type { Content } from "../packages/core/src/model/Content.ts";

class MemoryContent implements Content {
  constructor(private readonly url: string, private readonly bytes: Uint8Array) {}
  async openStream(): Promise<ReadableStream<Uint8Array>> {
    return new Blob([this.bytes]).stream();
  }
  getURL(): string {
    return this.url;
  }
}

/** A simple OBJ box (unit-ish; the model normalizes to the piece size). */
function boxObj(name: string, sx: number, sy: number, sz: number): string {
  const v: string[] = [];
  const f: string[] = [];
  let i = 1;
  for (let x = 0; x <= 1; x++) {
    for (let y = 0; y <= 1; y++) {
      for (let z = 0; z <= 1; z++) {
        v.push(`v ${(x - 0.5) * sx} ${(y - 0.5) * sy} ${(z - 0.5) * sz}`);
      }
    }
  }
  const idx = (x: number, y: number, z: number): number => x * 4 + y * 2 + z + 1;
  const quad = (a: number, b: number, c: number, d: number): void => {
    f.push(`f ${a} ${b} ${c} ${d}`);
  };
  // six faces of the box
  for (const [x, dir] of [[0, 1], [1, -1]] as Array<[number, number]>) {
    const xx = dir > 0 ? x : x;
    quad(idx(xx, 0, 0), idx(xx, 0, 1), idx(xx, 1, 1), idx(xx, 1, 0));
  }
  for (const [y, dir] of [[0, 1], [1, -1]] as Array<[number, number]>) {
    quad(idx(0, y, 0), idx(1, y, 0), idx(1, y, 1), idx(0, y, 1));
  }
  for (const [z, dir] of [[0, 1], [1, -1]] as Array<[number, number]>) {
    quad(idx(0, 0, z), idx(1, 0, z), idx(1, 1, z), idx(0, 1, z));
  }
  return `# ${name}\n${v.join("\n")}\n${f.join("\n")}\n`;
}

function piece(
  id: string,
  name: string,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  angle: number,
  modelUrl: string | null,
  doorOrWindow = false,
): HomePieceOfFurniture {
  const model = modelUrl === null ? null : new MemoryContent(modelUrl, new TextEncoder().encode(boxObj(name, w, h, d)));
  const ctor = doorOrWindow ? HomeDoorOrWindow : HomePieceOfFurniture;
  const p = new ctor(id, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => d, getHeight: () => h, getWidth: () => w, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => doorOrWindow, getIcon: () => null, getPlanIcon: () => null, getModel: () => model,
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    // Door/window extras (used by HomeDoorOrWindow)
    getWallThickness: () => 20, getWallDistance: () => 0, isWallCutOutOnBothSides: () => false,
    getSashes: () => doorOrWindow ? [{
      getXAxis: () => 0.015, getYAxis: () => 0.72, getWidth: () => 0.48, getStartAngle: () => 0, getEndAngle: () => -Math.PI / 2,
    }] : [],
    getCutOutShape: () => "M0,0 v1 h1 v-1 z",
  } as never);
  p.setX(x);
  p.setY(y);
  p.setAngle(angle);
  return p;
}

async function main(): Promise<void> {
  const home = new Home();
  home.setName("test-home.sh3d");

  // A walled house 1000 x 600 with an interior divider
  const addWall = (x1: number, y1: number, x2: number, y2: number): void => {
    home.addWall(new Wall("w", x1, y1, x2, y2, 20, 366));
  };
  addWall(0, 0, 1000, 0);
  addWall(1000, 0, 1000, 600);
  addWall(1000, 600, 0, 600);
  addWall(0, 600, 0, 0);
  addWall(600, 0, 600, 300); // interior divider
  // A closed box (for the room bucket-fill test): 400 x 300 at (100, 650)
  addWall(100, 650, 500, 650);
  addWall(500, 650, 500, 950);
  addWall(500, 950, 100, 950);
  addWall(100, 950, 100, 650);

  // Rooms
  home.addRoom(new Room("living", [[20, 20], [980, 20], [980, 580], [620, 580], [620, 20]]));
  home.addRoom(new Room("bedroom", [[620, 20], [980, 20], [980, 280], [620, 280]]));

  // Furniture — several pieces with embedded OBJ models (plan icons + 3D)
  home.addPieceOfFurniture(piece("bed", "Bed", 300, 400, 224, 226, 77, 0, "model-bed.obj"));
  home.addPieceOfFurniture(piece("piano", "Grand piano", 200, 150, 132, 170, 178, Math.PI / 2, "model-piano.obj"));
  home.addPieceOfFurniture(piece("cabinet-1", "Kitchen cabinet", 700, 420, 60, 64, 85, 0, "model-cabinet.obj"));
  home.addPieceOfFurniture(piece("cabinet-2", "Kitchen cabinet", 770, 420, 60, 64, 85, 0, "model-cabinet.obj"));
  home.addPieceOfFurniture(piece("cooker", "Cooker", 840, 420, 60, 62, 85, 0, "model-cooker.obj"));
  home.addPieceOfFurniture(piece("sink", "Sink", 910, 420, 120, 64, 106, 0, "model-sink.obj"));
  home.addPieceOfFurniture(piece("sofa", "Sofa 2 seats", 400, 300, 160, 90, 80, 0, null));
  home.addPieceOfFurniture(piece("table", "Dining table", 500, 150, 120, 70, 75, 0, null));
  // A door (selectable through the wall) + a window, both with models
  home.addPieceOfFurniture(piece("door", "Front door", 600, 0, 102, 15, 208, 0, "model-door.obj", true));
  home.addPieceOfFurniture(piece("window", "Window", 500, 0, 110, 8, 134, 0, "model-window.obj", true));

  const bytes = await new HomeFileRecorder().writeHome(home);
  writeFileSync("apps/web/public/fixtures/test-home.sh3d", bytes);
  console.log("wrote test-home.sh3d:", bytes.length, "bytes");
  // Round-trip check
  const { home: read } = await new HomeFileRecorder().readHomeFromZip(bytes);
  console.log("read walls:", read.getWalls().length, "rooms:", read.getRooms().length, "furniture:", read.getFurniture().length);
  for (const p of read.getFurniture()) {
    console.log("  ", p.getName(), "| door:", p.isDoorOrWindow(), "| model:", p.getModel()?.getURL() ?? "none");
  }
}

void main();

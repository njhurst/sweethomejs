#!/usr/bin/env node
/**
 * build-design-showcase — builds the Design-style 3D fixture (task 11.8).
 *
 * The golden fixtures (dream_house etc.) contain walls, rooms and light
 * sources but NO furniture, NO floor colors, NO shininess and NO textures —
 * nothing that exercises the "nicer surfaces + GI" render path (docs/15 §7).
 * This script constructs a small two-room house with:
 *
 *   - rooms with floorColor + floorShininess (glossy wood floor w/ texture,
 *     glossy tile floor)
 *   - walls with colors
 *   - furniture with modelMaterials shininess (glossy wood, glass,
 *     polished metal) + color-only pieces (sofa, counter)
 *   - HomeLight pieces with warm/cool light sources
 *
 * Output: test/fixtures/generated/design-showcase.sh3d (written through the
 * ported model + HomeFileRecorder — the writer itself is under test).
 *
 * Usage: node tools/build-design-showcase.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "test/fixtures/generated/design-showcase.sh3d");

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGBA/RGB 8-bit, filter 0) — enough for textures.

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeBytes.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return out;
}

/** Encodes RGB pixel rows as a PNG. pixels: Uint8Array(width*height*3). */
function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  // scanlines with filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Procedural wood-plank texture (64×64): 8 horizontal planks with grain.

function woodTexturePng(seed = 7) {
  const w = 64;
  const h = 64;
  const pixels = new Uint8Array(w * h * 3);
  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const planks = 8;
  const plankH = h / planks;
  for (let y = 0; y < h; y++) {
    const plank = Math.min(planks - 1, Math.floor(y / plankH));
    // Each plank has its own base tint; vary between planks
    const baseR = 0.62 + (0.08 * ((plank * 37) % 7)) / 6;
    const baseG = 0.42 + (0.06 * ((plank * 53) % 5)) / 4;
    const baseB = 0.2 + (0.04 * ((plank * 71) % 3)) / 2;
    const darkSeam = y % plankH < 1 ? 0.55 : 1; // plank seam line
    for (let x = 0; x < w; x++) {
      const grain = 0.9 + 0.2 * rand(); // vertical-ish grain noise
      const i = (y * w + x) * 3;
      pixels[i] = Math.min(255, Math.round(255 * baseR * grain * darkSeam));
      pixels[i + 1] = Math.min(255, Math.round(255 * baseG * grain * darkSeam));
      pixels[i + 2] = Math.min(255, Math.round(255 * baseB * grain * darkSeam));
    }
  }
  return encodePng(w, h, pixels);
}

// ---------------------------------------------------------------------------
// Tiny hand-written OBJ models (unit cube, correct CCW outward winding).
// The renderer applies piece modelMaterials by name, so MTLs are illustrative.

const CUBE_OBJ = (mtlName) => `# unit cube
mtllib ${mtlName}.mtl
o ${mtlName}
v -1 -1 -1
v 1 -1 -1
v 1 -1 1
v -1 -1 1
v -1 1 -1
v 1 1 -1
v 1 1 1
v -1 1 1
usemtl ${mtlName}
f 2 6 7 3
f 1 4 8 5
f 5 8 7 6
f 1 2 3 4
f 4 3 7 8
f 1 5 6 2
`;

const MTL = {
  glossy_wood: `newmtl glossy_wood
Ka 0.2 0.15 0.05
Kd 0.62 0.42 0.2
Ks 0.9 0.9 0.9
Ns 96
d 1.0
illum 2
`,
  glass: `newmtl glass
Ka 0.0 0.0 0.0
Kd 0.85 0.9 1.0
Ks 0.95 0.95 0.98
Ns 128
d 0.35
illum 3
`,
  polished_metal: `newmtl polished_metal
Ka 0.1 0.1 0.1
Kd 0.55 0.58 0.62
Ks 0.95 0.95 0.95
Ns 200
d 1.0
illum 2
`,
};

// ---------------------------------------------------------------------------
// Content (bytes) + model helpers

class BytesContent {
  constructor(bytes, url) {
    this.bytes = bytes;
    this.url = url;
  }
  openStream() {
    return Promise.resolve(new Blob([this.bytes]).stream());
  }
  getURL() {
    return this.url;
  }
}

const textureImage = (content, name, width, height) => ({
  getName: () => name,
  getCreator: () => null,
  getImage: () => content,
  getWidth: () => width,
  getHeight: () => height,
});

const pieceGetters = (name, { model = null, color = null } = {}) => ({
  getName: () => name,
  getDescription: () => null,
  getInformation: () => null,
  getLicense: () => null,
  getDepth: () => 60,
  getHeight: () => 80,
  getWidth: () => 120,
  getElevation: () => 0,
  getDropOnTopElevation: () => 1,
  isMovable: () => true,
  isDoorOrWindow: () => false,
  getIcon: () => null,
  getPlanIcon: () => null,
  getModel: () => model,
  getModelFlags: () => 0,
  getModelSize: () => 1,
  getModelRotation: () => [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  getStaircaseCutOutShape: () => null,
  getCreator: () => null,
  isBackFaceShown: () => false,
  getColor: () => color,
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
});

async function main() {
  const { Home } = await import("../packages/core/src/model/Home.ts");
  const { Wall } = await import("../packages/core/src/model/Wall.ts");
  const { Room } = await import("../packages/core/src/model/Room.ts");
  const { HomePieceOfFurniture } =
    await import("../packages/core/src/model/HomePieceOfFurniture.ts");
  const { HomeLight } = await import("../packages/core/src/model/HomeLight.ts");
  const { HomeMaterial } = await import("../packages/core/src/model/HomeMaterial.ts");
  const { HomeTexture } = await import("../packages/core/src/model/HomeTexture.ts");
  const { LightSource } = await import("../packages/core/src/model/ValueClasses.ts");
  const { HomeFileRecorder } = await import("../packages/core/src/io/HomeFileRecorder.ts");

  const home = new Home(250);
  home.setName("Design Showcase");

  // --- content: models + wood texture
  const woodPng = woodTexturePng();
  const woodContent = new BytesContent(woodPng, "wood-planks.png");
  const tableObj = new BytesContent(new TextEncoder().encode(CUBE_OBJ("glossy_wood")), "table.obj");
  const tableMtl = new BytesContent(new TextEncoder().encode(MTL.glossy_wood), "table.mtl");
  const glassObj = new BytesContent(new TextEncoder().encode(CUBE_OBJ("glass")), "glass-table.obj");
  const glassMtl = new BytesContent(new TextEncoder().encode(MTL.glass), "glass-table.mtl");
  const metalObj = new BytesContent(
    new TextEncoder().encode(CUBE_OBJ("polished_metal")),
    "stool.obj",
  );
  const metalMtl = new BytesContent(new TextEncoder().encode(MTL.polished_metal), "stool.mtl");

  // --- walls: 800×600 house, warm white, interior wall with door gap
  const wallColor = 0xe8e4da;
  const addWall = (x1, y1, x2, y2) => {
    const wall = new Wall(x1, y1, x2, y2, 10, 250);
    wall.setLeftSideColor(wallColor);
    wall.setRightSideColor(wallColor);
    home.addWall(wall);
  };
  addWall(0, 0, 800, 0);
  addWall(800, 0, 800, 600);
  addWall(800, 600, 0, 600);
  addWall(0, 600, 0, 0);
  // Interior split with a 100cm door gap at y 250..350
  addWall(400, 0, 400, 250);
  addWall(400, 350, 400, 600);

  // --- rooms
  const living = new Room([
    [0, 0],
    [400, 0],
    [400, 600],
    [0, 600],
  ]);
  living.setName("Living");
  living.setFloorColor(0x9c6b3f);
  living.setFloorShininess(25);
  const woodFloorTexture = new HomeTexture(
    textureImage(woodContent, "wood-planks", 64, 64),
    0,
    60, // angle 0, scale 60cm per texture width
    true,
  );
  living.setFloorTexture(woodFloorTexture);
  living.setCeilingColor(0xf5f2ea);
  home.addRoom(living);

  const kitchen = new Room([
    [400, 0],
    [800, 0],
    [800, 600],
    [400, 600],
  ]);
  kitchen.setName("Kitchen");
  kitchen.setFloorColor(0xd8d8d8);
  kitchen.setFloorShininess(70); // glossy tile
  kitchen.setCeilingColor(0xf5f2ea);
  home.addRoom(kitchen);

  // --- furniture
  const addPiece = (name, x, y, opts, dims = {}) => {
    const piece = new HomePieceOfFurniture(
      "p-" + name.toLowerCase().replace(/\s+/g, "-"),
      pieceGetters(name, opts),
      null,
    );
    piece.setX(x);
    piece.setY(y);
    piece.setWidth(dims.width ?? 120);
    piece.setDepth(dims.depth ?? 60);
    piece.setHeight(dims.height ?? 80);
    piece.setColor(opts.color ?? null);
    if (opts.shininess !== undefined) {
      piece.setShininess(opts.shininess);
    }
    if (opts.modelMaterials !== undefined) {
      piece.setModelMaterials(opts.modelMaterials);
    }
    if (opts.model !== undefined) {
      piece.setModel(opts.model);
    }
    home.addPieceOfFurniture(piece);
    return piece;
  };

  // Red sofa (color-only placeholder)
  addPiece(
    "Sofa",
    60,
    120,
    { color: 0xb8402f, shininess: 0 },
    { width: 200, depth: 90, height: 80 },
  );
  // Glossy wood coffee table (model + modelMaterials shininess)
  addPiece(
    "Coffee table",
    130,
    330,
    {
      model: tableObj,
      modelMaterials: [new HomeMaterial("glossy_wood", 0x9c6b3f, null, 96)],
    },
    { width: 120, depth: 60, height: 45 },
  );
  // Glass top (thin box, translucent material via modelMaterials alpha)
  addPiece(
    "Glass top",
    230,
    180,
    {
      model: glassObj,
      modelMaterials: [new HomeMaterial("glass", 0x59d8e5f2, null, 128)],
    },
    { width: 100, depth: 60, height: 2 },
  );
  // Polished metal stool
  addPiece(
    "Stool",
    280,
    420,
    {
      model: metalObj,
      modelMaterials: [new HomeMaterial("polished_metal", 0x8c939c, null, 200)],
    },
    { width: 40, depth: 40, height: 60 },
  );
  // Kitchen counter (color + shininess)
  addPiece(
    "Counter",
    560,
    420,
    { color: 0xe8e4da, shininess: 40 },
    { width: 180, depth: 60, height: 90 },
  );

  // --- lights: HomeLight pieces with light sources
  const addLight = (name, x, y, { power, color, elevation = 0, lightZ = 120 }) => {
    const light = new HomeLight(
      "l-" + name.toLowerCase().replace(/\s+/g, "-"),
      {
        ...pieceGetters(name, { color: 0x2a2a2a }),
        getPower: () => power,
        getLightSources: () => [],
        getLightSourceMaterialNames: () => [],
      },
      null,
    );
    light.setX(x);
    light.setY(y);
    light.setElevation(elevation);
    light.setWidth(20);
    light.setDepth(20);
    light.setHeight(30);
    light.setPower(power);
    light.setLightSources([new LightSource(0, 0, lightZ, color)]);
    home.addPieceOfFurniture(light);
    return light;
  };
  addLight("Ceiling lamp living", 180, 300, {
    power: 0.5,
    color: 0xfff0c8,
    elevation: 220,
    lightZ: 0,
  });
  addLight("Ceiling lamp kitchen", 600, 300, {
    power: 0.5,
    color: 0xe8f0ff,
    elevation: 220,
    lightZ: 0,
  });
  addLight("Floor lamp", 300, 100, { power: 0.35, color: 0xffe0a8, elevation: 0, lightZ: 120 });

  // --- write
  mkdirSync(dirname(OUT), { recursive: true });
  const bytes = await new HomeFileRecorder().writeHome(home);
  writeFileSync(OUT, bytes);
  console.log(`wrote ${OUT} (${bytes.length} bytes)`);
  console.log(
    `  walls=${home.getWalls().length} rooms=${home.getRooms().length} furniture=${home.getFurniture().length}`,
  );
  console.log(
    `  lights=${home.getFurniture().filter((p) => p instanceof HomeLight).length} lightSources=${home
      .getFurniture()
      .filter((p) => p instanceof HomeLight)
      .reduce((n, p) => n + p.getLightSources().length, 0)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

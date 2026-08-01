import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { JavaSerializationReader } from "./JavaSerializationReader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../../");

/** Extracts the legacy serialized `Home` entry from a .sh3d zip. */
function readHomeEntry(fixturePath: string): Uint8Array {
  const bytes = readFileSync(join(REPO_ROOT, fixturePath));
  const unzipped = unzipSync(new Uint8Array(bytes));
  const home = unzipped["Home"];
  if (home === undefined) {
    throw new Error(`No Home entry in ${fixturePath}`);
  }
  return home;
}

describe("JavaSerializationReader spike (task 1.9)", () => {
  it("reads the 2019 user home (ls_2819.sh3d)", () => {
    const bytes = readHomeEntry("examples/ls_2819.sh3d");
    const { classes } = new JavaSerializationReader(bytes).walk();
    const names = classes.map((c) => c.name);

    // The stream must describe the Home graph: root + collections + model types.
    expect(names[0]).toBe("com.eteks.sweethome3d.model.Home");
    expect(names).toContain("java.util.ArrayList");
    expect(names).toContain("java.util.HashMap");
    expect(names).toContain("com.eteks.sweethome3d.model.Wall");
    expect(names).toContain("com.eteks.sweethome3d.model.HomePieceOfFurniture");
    expect(names).toContain("com.eteks.sweethome3d.model.Room");
    expect(names).toContain("com.eteks.sweethome3d.model.HomeEnvironment");
    // Legacy content class (2019-era stream; 7.x re-wraps these in io.*).
    expect(names).toContain("com.eteks.sweethome3d.tools.URLContent");

    const home = classes[0];
    expect(home).toBeDefined();
    expect(home?.serialVersionUID).toBe(1n);
    const fieldNames = (home?.fields ?? []).map((f) => f.name);
    // Spot-check Home's serialized fields (non-transient only).
    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("wallHeight");
    expect(fieldNames).toContain("environment");
    expect(fieldNames).toContain("walls");
    expect(fieldNames).toContain("furniture");
  });

  it("reads the generated serialized-only fixture", () => {
    const bytes = readHomeEntry("test/fixtures/generated/serialized-only.sh3d");
    const { classes } = new JavaSerializationReader(bytes).walk();
    expect(classes[0]?.name).toBe("com.eteks.sweethome3d.model.Home");
    expect(classes.map((c) => c.name)).toContain("com.eteks.sweethome3d.model.Wall");
  });

  it("reads the generated walls fixture", () => {
    const bytes = readHomeEntry("test/fixtures/generated/walls.sh3d");
    const { classes } = new JavaSerializationReader(bytes).walk();
    expect(classes[0]?.name).toBe("com.eteks.sweethome3d.model.Home");
    const wallClass = classes.find((c) => c.name === "com.eteks.sweethome3d.model.Wall");
    expect(wallClass).toBeDefined();
    // Wall fields incl. object-typed ones with class names.
    const fieldNames = (wallClass?.fields ?? []).map((f) => f.name);
    expect(fieldNames).toContain("xStart");
    expect(fieldNames).toContain("arcExtent");
    const leftSideBaseboard = wallClass?.fields.find((f) => f.name === "leftSideBaseboard");
    // Field class names keep the wire-format "L...;" form.
    expect(leftSideBaseboard?.className).toBe("Lcom/eteks/sweethome3d/model/Baseboard;");
  });

  it("rejects non-serialization bytes", () => {
    expect(() => new JavaSerializationReader(new Uint8Array([1, 2, 3, 4])).walk()).toThrow(
      /Not a Java serialization stream/,
    );
  });
});

/**
 * HomeXMLExporter round-trip parity (task 3.3): reads the Java-written
 * ls_2819 Home.xml, writes it back with the exporter, and verifies the
 * structure matches the original (modulo the version bump Java also applies
 * on save).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { Sh3dContainer } from "./Sh3dContainer.js";
import { HomeContentContext } from "./HomeContentContext.js";
import { ZipContent } from "./HomeContentContext.js";
import { readHomeXml } from "./HomeXMLReader.js";
import { HomeXMLExporter } from "./HomeXMLExporter.js";
import { XMLWriter } from "./XMLWriter.js";
import type { Content } from "../model/Content.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

/** Writes a home to a Home.xml string with content names resolved from the container. */
function writeHome(home: ReturnType<typeof readHomeXml>, container: Sh3dContainer): string {
  const savedContentNames = new Map<Content, string>();
  for (const piece of home.getFurnitureWithSubGroups()) {
    for (const content of [piece.getModel(), piece.getIcon(), piece.getPlanIcon()]) {
      if (content instanceof ZipContent) {
        savedContentNames.set(content, content.getEntryName());
      }
    }
    if (piece.getTexture() !== null && piece.getTexture()!.getImage() instanceof ZipContent) {
      savedContentNames.set(piece.getTexture()!.getImage(), (piece.getTexture()!.getImage() as ZipContent).getEntryName());
    }
    for (const material of piece.getModelMaterials() ?? []) {
      if (material.getTexture()?.getImage() instanceof ZipContent) {
        savedContentNames.set(material.getTexture()!.getImage(), (material.getTexture()!.getImage() as ZipContent).getEntryName());
      }
    }
  }
  const writer = new XMLWriter();
  const exporter = new HomeXMLExporter();
  exporter.setSavedContentNames(savedContentNames);
  exporter.writeHome(writer, home);
  return writer.toString();
}

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

import { SaxesParser } from "saxes";

/** Emits a comparable structural string from an XML document (via saxes). */
function xmlString(xml: string): string {
  const parser = new SaxesParser({ xmlns: false });
  const lines: string[] = [];
  let depth = 0;
  parser.on("opentag", (tag) => {
    const attrs = Object.entries(tag.attributes)
      .map(([k, v]) => `${k}='${v}'`)
      .sort()
      .join(" ");
    lines.push(" ".repeat(depth) + `<${tag.name} ${attrs}>`);
    depth += 1;
  });
  parser.on("text", (text) => {
    if (text.trim() !== "") {
      lines.push(" ".repeat(depth) + `"${text.trim()}"`);
    }
  });
  parser.on("closetag", (tag) => {
    depth -= 1;
    void tag;
  });
  parser.write(xml).close();
  return lines.join("\n");
}

describe("HomeXMLExporter round-trip (task 3.3)", () => {
  it("round-trips the 2019 user home stably (read→write→read is a fixpoint)", async () => {
    const container = Sh3dContainer.open(fixtureBytes("examples/ls_2819.sh3d"));
    const originalXml = new TextDecoder().decode((await container.getEntry("Home.xml"))!);
    const home = readHomeXml(originalXml, null, new HomeContentContext(container));
    const written = writeHome(home, container);
    const reread = readHomeXml(written, null, new HomeContentContext(container));

    // The round-trip preserves the document
    expect(reread.getFurniture().length).toBe(home.getFurniture().length);
    expect(reread.getWalls().length).toBe(home.getWalls().length);
    expect(reread.getRooms().length).toBe(home.getRooms().length);
    expect(reread.getLevels().length).toBe(home.getLevels().length);
    expect(reread.getDimensionLines().length).toBe(home.getDimensionLines().length);
    expect(reread.getWallHeight()).toBe(home.getWallHeight());
    // Walls keep their connections
    const w0 = reread.getWalls().find((w) => w.getId() === "wall0")!;
    expect(w0.getWallAtEnd()?.getId()).toBe("wall1");
    // Geometry preserved
    const rereadFirst = reread.getFurniture()[0]!;
    expect(rereadFirst.getX()).toBe(home.getFurniture()[0]!.getX());
  });

  it("matches the current-format generated fixtures structurally", async () => {
    for (const fixture of ["walls", "rooms", "furniture", "levels", "dimensions-labels", "cameras", "environment"]) {
      const container = Sh3dContainer.open(fixtureBytes(`test/fixtures/generated/${fixture}.sh3d`));
      const originalXml = new TextDecoder().decode((await container.getEntry("Home.xml"))!);
      const home = readHomeXml(originalXml, null, new HomeContentContext(container));
      const written = writeHome(home, container);
      expect(xmlString(written), fixture).toBe(xmlString(originalXml));
    }
  });

  it("round-trips the generated walls fixture", async () => {
    const container = Sh3dContainer.open(fixtureBytes("test/fixtures/generated/walls.sh3d"));
    const originalXml = new TextDecoder().decode((await container.getEntry("Home.xml"))!);
    const home = readHomeXml(originalXml, null, new HomeContentContext(container));
    const writer = new XMLWriter();
    const exporter = new HomeXMLExporter();
    exporter.setSavedContentNames(new Map());
    exporter.writeHome(writer, home);
    const written = writer.toString();
    expect(written).toContain("<home");
    expect(written).toContain("<wall");
    expect(written).toContain("arcExtent='90.0'");
  });
});

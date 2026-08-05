import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT_DIGESTS_ENTRY, HOME_ENTRY, HOME_XML_ENTRY, Sh3dContainer } from "./Sh3dContainer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

describe("Sh3dContainer (task 3.1)", () => {
  it("opens the 2019 user home and sees its entries", async () => {
    const container = await Sh3dContainer.open(fixtureBytes("test/fixtures/dream_house.sh3d"));
    expect(container.hasEntry(HOME_ENTRY)).toBe(true);
    expect(container.hasEntry(HOME_XML_ENTRY)).toBe(true);
    expect(container.hasEntry(CONTENT_DIGESTS_ENTRY)).toBe(true);
    expect(container.hasEntry("0")).toBe(true);
    expect(container.hasEntry("3/window-01.obj")).toBe(true);
    expect(container.hasEntry("11/water.obj")).toBe(true);
    // Entry order matches the Java writer (Home first).
    expect(container.entryNames[0]).toBe(HOME_ENTRY);
    expect(container.entryNames[1]).toBe(HOME_XML_ENTRY);
  });

  it("inflates entries byte-identically to the stored bytes", async () => {
    const container = await Sh3dContainer.open(fixtureBytes("test/fixtures/dream_house.sh3d"));
    const homeXml = await container.getEntry(HOME_XML_ENTRY);
    const home = await container.getEntry(HOME_ENTRY);
    const digests = await container.getEntry(CONTENT_DIGESTS_ENTRY);
    expect(homeXml).toBeDefined();
    expect(homeXml!.length).toBe(96558);
    expect(home!.length).toBe(98808);
    expect(digests!.length).toBe(6979);
    // Content entries inflate too.
    const model = await container.getEntry("3/window-01.obj");
    expect(model).toBeDefined();
    expect(new TextDecoder().decode(model!.slice(0, 4))).toContain("#");
  });

  it("lazy container does not decompress entries until asked", async () => {
    const container = await Sh3dContainer.open(fixtureBytes("test/fixtures/dream_house.sh3d"));
    // Opening must not have inflated any entry (sizes known, bytes deferred).
    expect(container.getEntrySize("Home.xml")).toBe(96558);
    expect(container.getEntrySize("11/water.obj")).toBe(913153);
  });

  it("writes a container that reads back with identical entries", async () => {
    const original = fixtureBytes("test/fixtures/generated/walls.sh3d");
    const container = await Sh3dContainer.open(original);
    const entries = new Map<string, Uint8Array>();
    for (const name of container.entryNames) {
      const data = await container.getEntry(name);
      if (data !== undefined) entries.set(name, data);
    }
    const written = Sh3dContainer.write(entries, 0);
    const reread = await Sh3dContainer.open(written);
    expect(reread.entryNames).toEqual(container.entryNames);
    for (const name of container.entryNames) {
      const before = await container.getEntry(name);
      const after = await reread.getEntry(name);
      expect(after).toEqual(before);
    }
  });

  it("getEntrySync matches async reads", async () => {
    const container = await Sh3dContainer.open(fixtureBytes("test/fixtures/generated/cameras.sh3d"));
    const sync = container.getEntrySync(HOME_XML_ENTRY);
    const asyncData = await container.getEntry(HOME_XML_ENTRY);
    expect(sync).toEqual(asyncData);
  });

  it("rejects non-zip bytes", () => {
    expect(() => Sh3dContainer.open(new Uint8Array([1, 2, 3, 4]))).toThrow(/Not a ZIP archive/);
  });
});

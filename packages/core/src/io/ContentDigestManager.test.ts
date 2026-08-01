import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { Sh3dContainer } from "./Sh3dContainer.js";
import {
  computeEntryDigest,
  parseContentDigests,
  sha1Base64,
  writeContentDigests,
} from "./ContentDigestManager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../../");

function fixtureBytes(rel: string): Uint8Array {
  return new Uint8Array(readFileSync(join(REPO_ROOT, rel)));
}

describe("ContentDigestManager (task 3.5)", () => {
  it("computes SHA-1 matching the Java writer for every content entry", async () => {
    const container = Sh3dContainer.open(fixtureBytes("examples/ls_2819.sh3d"));
    const manifest = new TextDecoder().decode(await container.getEntry("ContentDigests"));
    const expected = parseContentDigests(manifest);
    expect(expected.size).toBeGreaterThan(100);
    for (const [name, digest] of expected) {
      const actual = await computeEntryDigest(container, name);
      expect(actual, `digest mismatch for ${name}`).toBe(digest);
    }
  });

  it("verifies the generated fixtures' manifests too", async () => {
    for (const fixture of ["furniture.sh3d", "big.sh3d"]) {
      const container = Sh3dContainer.open(fixtureBytes(`test/fixtures/generated/${fixture}`));
      const manifest = new TextDecoder().decode(await container.getEntry("ContentDigests"));
      const expected = parseContentDigests(manifest);
      for (const [name, digest] of expected) {
        const actual = await computeEntryDigest(container, name);
        expect(actual, `${fixture} digest mismatch for ${name}`).toBe(digest);
      }
    }
  });

  it("round-trips the manifest format", () => {
    const digests = new Map([
      ["0", "8rc8dtukpDgWT37WuunwXR68QLs="],
      ["3/window-01.obj", "d2CNQWNFFt1oaGXxWDKKRM9Su28="],
    ]);
    const written = writeContentDigests(digests);
    expect(written).toContain("ContentDigests-Version: 1.0");
    expect(parseContentDigests(written)).toEqual(digests);
  });

  it("handles the btoa/atob codecs for binary data", async () => {
    const data = new Uint8Array([0, 1, 2, 254, 255, 128, 10]);
    const digest = await sha1Base64(data);
    expect(digest).toBeTruthy();
    // Deterministic across calls
    expect(await sha1Base64(data)).toBe(digest);
  });
});

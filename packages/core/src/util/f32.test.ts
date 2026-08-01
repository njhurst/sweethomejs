import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { f32, formatFloat } from "./f32.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "../../../../test/unit/fixtures");

describe("f32", () => {
  it("narrows doubles to float32", () => {
    expect(f32(0.1)).toBe(Math.fround(0.1));
    expect(f32(250)).toBe(250);
    expect(f32(3.141592653589793)).toBe(Math.fround(3.141592653589793));
  });

  it("handles special values", () => {
    expect(f32(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(f32(-0)).toBe(-0);
    expect(Number.isNaN(f32(Number.NaN))).toBe(true);
  });
});

describe("formatFloat", () => {
  const fullCorpus = join(FIXTURES, "float-corpus-full.txt");
  const randomCorpus = join(FIXTURES, "float-corpus.txt");

  /**
   * The real invariant: any string we emit must parse back to the exact same
   * float32 (Java parses XML float attributes with Float.parseFloat, so
   * semantic parity is what guarantees .sh3d compatibility). Byte parity with
   * JDK Float.toString holds for common values; where the JDK emits a
   * one-digit-longer quirk string (JDK-4511638), we emit the mathematically
   * shortest form (see KNOWN_DIFFS.md) — both parse to the same float32.
   */
  it("round-trips to the same float32 on the entire full corpus", () => {
    const corpus = readFileSync(fullCorpus, "utf8");
    let checked = 0;
    for (const line of corpus.split("\n")) {
      if (line.length === 0) continue;
      const bitsHex = line.split(" ")[0]!;
      const bits = Number.parseInt(bitsHex, 16);
      const value = new Float32Array(new Uint32Array([bits]).buffer)[0]!;
      expect(f32(Number.parseFloat(formatFloat(value)))).toBe(value);
      checked++;
    }
    expect(checked).toBeGreaterThan(60_000);
  });

  it("round-trips on the 1M random corpus", () => {
    let corpus;
    try {
      corpus = readFileSync(randomCorpus, "utf8");
    } catch {
      // Regenerable fixture (30MB) — see tools/java-harness/run-float-corpus.sh
      return;
    }
    let checked = 0;
    for (const line of corpus.split("\n")) {
      if (line.length === 0) continue;
      const bitsHex = line.split(" ")[0]!;
      const bits = Number.parseInt(bitsHex, 16);
      const value = new Float32Array(new Uint32Array([bits]).buffer)[0]!;
      expect(f32(Number.parseFloat(formatFloat(value)))).toBe(value);
      checked++;
    }
    expect(checked).toBeGreaterThan(1_000_000);
  }, 60_000);

  it("matches known Java outputs (common cases)", () => {
    expect(formatFloat(0.1)).toBe("0.1");
    expect(formatFloat(-12.34)).toBe("-12.34");
    expect(formatFloat(250)).toBe("250.0");
    expect(formatFloat(1e9)).toBe("1.0E9");
    expect(formatFloat(1e10)).toBe("1.0E10");
    expect(formatFloat(1e-5)).toBe("1.0E-5");
    expect(formatFloat(0.001)).toBe("0.001");
    expect(formatFloat(0.000123456)).toBe("1.23456E-4");
    expect(formatFloat(-0)).toBe("-0.0");
    expect(formatFloat(Number.NaN)).toBe("NaN");
    expect(formatFloat(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(formatFloat(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
  });

  it("emits the shortest form where the JDK emits a longer quirk string", () => {
    const float32Min = 2 ** -149; // Float.MIN_VALUE
    // JDK prints "1.4E-45" for MIN_VALUE (JDK-4511638); ours is shortest:
    expect(formatFloat(float32Min)).toBe("1.0E-45");
    expect(f32(Number.parseFloat("1.0E-45"))).toBe(float32Min);
    // JDK prints "1.17549435E-38"; ours is the shortest round-trip form:
    expect(formatFloat(1.1754943508222875e-38)).toBe("1.1754944E-38");
  });
});

import { describe, expect, it } from "vitest";
import { f32, formatFloat } from "./f32.js";

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
  it("round-trips through float32", () => {
    for (const value of [0.1, 0.5, 1, 250, 3.141592653589793, -12.34, 1e10]) {
      const formatted = formatFloat(value);
      expect(f32(Number.parseFloat(formatted))).toBe(f32(value));
    }
  });

  it("matches Java Float.toString style for common values", () => {
    // Java: Float.toString(0.1f) == "0.1"
    expect(formatFloat(0.1)).toBe("0.1");
    // Java: Float.toString(-12.34f) == "-12.34"
    expect(formatFloat(-12.34)).toBe("-12.34");
    expect(formatFloat(250)).toBe("250");
  });

  it("handles special values", () => {
    expect(formatFloat(Number.NaN)).toBe("NaN");
    expect(formatFloat(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(formatFloat(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
    expect(formatFloat(-0)).toBe("-0");
  });
});

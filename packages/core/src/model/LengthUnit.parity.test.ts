/**
 * LengthUnit formatting parity against the Java oracle (task 2.7).
 * Reference strings captured from the JDK via tools/java-harness
 * LengthUnitOracle for a fixed set of centimeter values.
 */
import { describe, expect, it } from "vitest";
import { LengthUnit } from "./LengthUnit.js";

const VALUES = [0, 0.5, 1, 2.54, 5, 12, 26.75, 39.375, 100, 250, 304.8, 1000, 10000, 0.1, 0.125];

// Captured from LengthUnitOracle (en locale)
const JAVA_FORMATTED: Record<string, string[]> = {
  MILLIMETER: ["0 mm", "5 mm", "10 mm", "25 mm", "50 mm", "120 mm", "268 mm", "394 mm", "1,000 mm", "2,500 mm", "3,048 mm", "10,000 mm", "100,000 mm", "1 mm", "1 mm"],
  CENTIMETER: ["0 cm", "0.5 cm", "1 cm", "2.5 cm", "5 cm", "12 cm", "26.8 cm", "39.4 cm", "100 cm", "250 cm", "304.8 cm", "1,000 cm", "10,000 cm", "0.1 cm", "0.1 cm"],
  METER: ["0.00 m", "0.005 m", "0.01 m", "0.025 m", "0.05 m", "0.12 m", "0.267 m", "0.394 m", "1.00 m", "2.50 m", "3.048 m", "10.00 m", "100.00 m", "0.001 m", "0.001 m"],
  INCH: ["0'", "0'0¼\"", "0'0⅜\"", "0'1\"", "0'2\"", "0'4¾\"", "0'10½\"", "1'3½\"", "3'3⅜\"", "8'2⅜\"", "10'", "32'9¾\"", "328'1\"", "0'0\"", "0'0\""],
  INCH_FRACTION: ["0\"", "0¼\"", "0⅜\"", "1\"", "2\"", "4¾\"", "10½\"", "15½\"", "39⅜\"", "98⅜\"", "120\"", "393¾\"", "3,937\"", "0\"", "0\""],
  INCH_DECIMALS: ["0\"", "0.197\"", "0.394\"", "1\"", "1.969\"", "4.724\"", "10.531\"", "15.502\"", "39.37\"", "98.425\"", "120\"", "393.701\"", "3,937.008\"", "0.039\"", "0.049\""],
  FOOT_DECIMALS: ["0", "0.016", "0.033", "0.083", "0.164", "0.394", "0.878", "1.292", "3.281", "8.202", "10", "32.808", "328.084", "0.003", "0.004"],
};

const JAVA_MAGNETIZED: Record<string, number[]> = {
  MILLIMETER: [0, 1, 1, 3, 5, 12, 27, 39, 100, 250, 305, 1000, 10000, 0.1, 0.125],
  CENTIMETER: [0, 1, 1, 3, 5, 12, 27, 39, 100, 250, 305, 1000, 10000, 0.1, 0.125],
  METER: [0, 1, 1, 3, 5, 12, 27, 39, 100, 250, 305, 1000, 10000, 0.1, 0.125],
  INCH: [0, 0.5, 1.27, 2.54, 5.08, 11.43, 26.67, 39.37, 100.33, 250.19, 304.8, 999.49, 9999.9795, 0.1, 0.125],
  INCH_FRACTION: [0, 0.5, 1.27, 2.54, 5.08, 11.43, 26.67, 39.37, 100.33, 250.19, 304.8, 999.49, 9999.9795, 0.1, 0.125],
  INCH_DECIMALS: [0, 0.5, 1.27, 2.54, 5.08, 11.43, 26.67, 39.37, 100.33, 250.19, 304.8, 999.49, 9999.9795, 0.1, 0.125],
  FOOT_DECIMALS: [0, 0.5, 1.27, 2.54, 5.08, 11.43, 26.67, 39.37, 100.33, 250.19, 304.8, 999.49, 9999.9795, 0.1, 0.125],
};

describe("LengthUnit parity (task 2.7)", () => {
  for (const [unit, expected] of Object.entries(JAVA_FORMATTED)) {
    it(`formats ${unit} like Java`, () => {
      const lengthUnit = new LengthUnit(unit);
      for (let i = 0; i < VALUES.length; i++) {
        const actual = lengthUnit.formatCentimeters(VALUES[i]!);
        expect(actual, `${unit} ${VALUES[i]}cm`).toBe(expected[i]);
      }
    });
  }

  for (const [unit, expected] of Object.entries(JAVA_MAGNETIZED)) {
    it(`magnetizes ${unit} like Java`, () => {
      const lengthUnit = new LengthUnit(unit);
      for (let i = 0; i < VALUES.length; i++) {
        const actual = lengthUnit.getMagnetizedLength(VALUES[i]!, 1);
        expect(actual, `${unit} ${VALUES[i]}cm`).toBeCloseTo(expected[i]!, 4);
      }
    });
  }

  it("converts units like Java", () => {
    expect(LengthUnit.inchToCentimeter(1)).toBeCloseTo(2.54, 5);
    expect(LengthUnit.footToCentimeter(1)).toBeCloseTo(30.48, 5);
    const meter = new LengthUnit(LengthUnit.METER);
    expect(meter.centimeterToUnit(250)).toBeCloseTo(2.5, 5);
    expect(meter.unitToCentimeter(2.5)).toBeCloseTo(250, 5);
  });
});

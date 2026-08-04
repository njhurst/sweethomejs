/*
 * units.test.ts
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
import { describe, expect, it } from "vitest";
import { LengthUnit } from "@sweethomejs/core";
import { formatLengthValue, parseLengthValue } from "./units.js";

describe("unit-aware edit fields", () => {
  const cm = new LengthUnit(LengthUnit.CENTIMETER);
  const meter = new LengthUnit(LengthUnit.METER);
  const inch = new LengthUnit(LengthUnit.INCH_DECIMALS);

  it("formats lengths in the current unit with its suffix", () => {
    expect(formatLengthValue(336, cm)).toBe("336 cm");
    expect(formatLengthValue(336, meter)).toContain("3.36 m");
    expect(formatLengthValue(336, inch)).toContain("132.28"); // 132.28"
  });

  it("parses bare numbers in the current unit", () => {
    expect(parseLengthValue("336", cm)).toBeCloseTo(336, 6);
    expect(parseLengthValue("3.36", meter)).toBeCloseTo(336, 4);
    expect(parseLengthValue("132.28", inch)).toBeCloseTo(336, 0);
  });

  it("parses explicit unit suffixes to centimeters", () => {
    expect(parseLengthValue("1.5 m", cm)).toBeCloseTo(150, 6);
    expect(parseLengthValue("50 cm", meter)).toBeCloseTo(50, 6);
    expect(parseLengthValue("132.28\"", meter)).toBeCloseTo(336, 0);
    expect(parseLengthValue("11 ft", meter)).toBeCloseTo(335.28, 0);
    expect(parseLengthValue("100 mm", cm)).toBeCloseTo(10, 6);
  });

  it("parses feet + inches and mixed formats (Sweet Home 3D grammar)", () => {
    expect(parseLengthValue("2' 8\"", cm)).toBeCloseTo(81.28, 0);
    expect(parseLengthValue("2'8\"", cm)).toBeCloseTo(81.28, 0);
    expect(parseLengthValue("2' 8", cm)).toBeCloseTo(81.28, 0);
    expect(parseLengthValue("96\"", cm)).toBeCloseTo(243.84, 0);
    expect(parseLengthValue("96in", cm)).toBeCloseTo(243.84, 0);
    expect(parseLengthValue("2.5'", cm)).toBeCloseTo(76.2, 0);
    expect(parseLengthValue("2.5' 4\"", cm)).toBeCloseTo(86.36, 0);
    expect(parseLengthValue("5 ft 4 in", cm)).toBeCloseTo(162.56, 0);
    expect(parseLengthValue("900mm", cm)).toBeCloseTo(90, 0);
  });

  it("rejects invalid input", () => {
    expect(parseLengthValue("abc", cm)).toBeNull();
    expect(parseLengthValue("", cm)).toBeNull();
  });
});

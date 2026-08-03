/*
 * PrintLayout.test.ts
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
import { Home, Wall, UserPreferences } from "@sweethomejs/core";
import { computePlanBounds, getPrintedPlanScale, paperSize, PX_PER_CM, PAPER_FORMATS } from "./PrintLayout.js";

describe("PrintLayout (task 8.6)", () => {
  it("computes the plan bounds from home content", () => {
    const home = new Home();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    home.addWall(new Wall("w", 1000, 0, 1000, 600, 20, 250));
    const bounds = computePlanBounds(home);
    expect(bounds.maxX).toBeGreaterThanOrEqual(1010);
    expect(bounds.maxY).toBeGreaterThanOrEqual(10);
  });

  it("returns the largest integer-inverse scale that fits the paper (Java math)", () => {
    const home = new Home();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    const bounds = computePlanBounds(home);
    // A4 landscape printable zone ≈ 18 × 26.7 cm; a 1000 cm wall needs 1:56
    const scale = getPrintedPlanScale(bounds, 18, 26.7, 1);
    expect(scale).toBeCloseTo(1 / 56, 6);
    // A larger zone allows a larger scale (1:19)
    const scaleBig = getPrintedPlanScale(bounds, 54, 40, 1);
    expect(scaleBig).toBeCloseTo(1 / 19, 6);
    expect(getPrintedPlanScale({ minX: 0, minY: 0, maxX: 0, maxY: 0 }, 10, 10)).toBe(0);
  });

  it("paperSize swaps axes for landscape orientations", () => {
    const a4 = PAPER_FORMATS.find((f) => f.name === "A4")!;
    const portrait = paperSize(a4, "PORTRAIT");
    const landscape = paperSize(a4, "LANDSCAPE");
    expect(portrait.widthCm).toBe(21);
    expect(landscape.widthCm).toBe(29.7);
    expect(PX_PER_CM).toBeCloseTo(96 / 2.54, 6);
  });
});

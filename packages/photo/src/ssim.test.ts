/*
 * ssim.test.ts
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
import { ssim } from "./ssim.js";

function buffer(width: number, height: number, fill: (x: number, y: number) => number): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = fill(x, y);
      const i = (y * width + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("SSIM (task 8.9)", () => {
  it("returns 1 for identical images", () => {
    const a = buffer(64, 64, (x, y) => (x * 31 + y * 17) % 256);
    expect(ssim(a, buffer(64, 64, (x, y) => (x * 31 + y * 17) % 256))).toBeGreaterThan(0.9999);
  });

  it("returns < 1 for different images", () => {
    const a = buffer(64, 64, (x, y) => (x * 31 + y * 17) % 256);
    const b = buffer(64, 64, (x, y) => (x * 31 + y * 17 + 40) % 256);
    const value = ssim(a, b);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(0.9);
  });

  it("throws on mismatched dimensions", () => {
    expect(() => ssim(buffer(4, 4, () => 0), buffer(8, 8, () => 0))).toThrow();
  });
});

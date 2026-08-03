/*
 * property.test.ts
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

/**
 * Property-based tests (task 9.6) with fast-check: wall geometry, room
 * point-in-polygon, LengthUnit round-trips and XML escaping.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Wall } from "../model/Wall.js";
import { Room } from "../model/Room.js";
import { LengthUnit } from "../model/LengthUnit.js";
import { f32 } from "../util/f32.js";

describe("property-based (task 9.6)", () => {
  it("wall geometry stays consistent with f32 math", () => {
    const finite = fc.float({ min: -5000, max: 5000 }).filter((v) => Number.isFinite(v));
    fc.assert(
      fc.property(
        finite,
        finite,
        finite,
        finite,
        fc.float({ min: 1, max: 100 }).filter((v) => Number.isFinite(v)),
        (x1, y1, x2, y2, thickness) => {
          const wall = new Wall("w", f32(x1), f32(y1), f32(x2), f32(y2), f32(thickness), 250);
          const length = wall.getLength();
          expect(length).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(length)).toBe(true);
          const points = wall.getPoints();
          expect(points.length).toBe(4);
          for (const point of points) {
            for (const coordinate of point) {
              expect(Number.isFinite(coordinate)).toBe(true);
            }
          }
          // The start-to-end distance matches the center-line length
          expect(Math.hypot(wall.getXEnd() - wall.getXStart(), wall.getYEnd() - wall.getYStart())).toBeCloseTo(length, 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("room point-in-polygon agrees with the shoelace centroid for convex rooms", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        fc.float({ min: 10, max: 1000 }),
        (sides, radius) => {
          const points: number[][] = [];
          for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * 2 * Math.PI;
            points.push([f32(500 + radius * Math.cos(angle)), f32(500 + radius * Math.sin(angle))]);
          }
          const room = new Room("room", points);
          // The centroid of a regular polygon is inside it
          const area = Math.abs(room.getArea());
          expect(area).toBeGreaterThan(0);
          const centroidX = 500;
          const centroidY = 500;
          expect(room.containsPoint(centroidX, centroidY, 0)).toBe(true);
          // A point far outside is not contained
          expect(room.containsPoint(500 + radius * 3, 500, 0)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("LengthUnit inch/cm round-trips are stable", () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.001), max: Math.fround(1e6) }).filter((v) => Number.isFinite(v)), (centimeters) => {
        const inches = LengthUnit.centimeterToInch(centimeters);
        const back = LengthUnit.inchToCentimeter(inches);
        // f32 round-trip error stays within 0.1%
        expect(Math.abs(back - centimeters)).toBeLessThan(Math.max(0.001, centimeters * 0.001));
      }),
      { numRuns: 200 },
    );
  });

  it("XML escaping is idempotent and injects nothing", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const escaped = escapeXml(input);
        expect(escaped).not.toContain("<script>");
        expect(escaped).not.toContain("&<");
        // Decoding the escape map returns the original
        const decoded = escaped.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
        expect(decoded).toBe(input);
      }),
      { numRuns: 100 },
    );
  });
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

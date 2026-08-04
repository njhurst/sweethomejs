/*
 * units.ts
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
 * Unit-aware value display/parsing for edit fields (SweetHomeJS UI). The
 * model's LengthUnit (ported from Java in task 2.7) converts and formats;
 * these helpers add the editable-field behaviors: display a length in the
 * current unit with its suffix (e.g. "3.36 m", "132.28\"", "336 cm") and
 * parse user input back to centimeters, accepting either a bare number
 * (interpreted in the current unit) or an explicit suffix.
 */
import { LengthUnit } from "@sweethomejs/core";

/** Formats a length in centimeters for the current unit (with unit suffix). */
export function formatLengthValue(centimeters: number, unit: LengthUnit): string {
  return unit.format(centimeters);
}

const NUMBER = "([+-]?[0-9]+(?:[.,][0-9]+)?)";

/**
 * Parses user input into centimeters, handling the full Sweet Home 3D grammar:
 *   - feet + inches: "2' 8\"", "2'8\"", "2.5' 4\"" (also "ft"/"in" words)
 *   - inches: "96\"", "96 in"
 *   - metric: "900mm", "90cm", "1.5m"
 *   - bare numbers: interpreted in the current unit
 * Returns null when the text isn't a valid length.
 */
export function parseLengthValue(text: string, unit: LengthUnit): number | null {
  const t = text.trim();
  if (t.length === 0) {
    return null;
  }
  // Metric with an explicit unit suffix
  const metric = new RegExp(`^${NUMBER}\\s*(mm|cm|m)$`, "i").exec(t);
  if (metric !== null) {
    const value = toNumber(metric[1]!);
    const suffix = metric[2]!.toLowerCase();
    if (suffix === "mm") return value / 10;
    if (suffix === "cm") return value;
    return value * 100; // m
  }
  // Feet and/or inches: "2' 8\"", "2.5' 4\"", "2'8\"", "96\"", "2.5'", "5 ft 4 in"
  const feetInches = /^([+-]?[0-9]+(?:[.,][0-9]+)?)\s*(?:'|ft)\s*(?:([0-9]+(?:[.,][0-9]+)?)\s*(?:\"|in)?)?$/i.exec(t);
  if (feetInches !== null) {
    const feet = toNumber(feetInches[1]!);
    const inches = feetInches[2] !== undefined ? toNumber(feetInches[2]!) : 0;
    return LengthUnit.footToCentimeter(feet) + LengthUnit.inchToCentimeter(inches);
  }
  // Bare inches: "96\"", "96in"
  const inchesOnly = new RegExp(`^${NUMBER}\\s*(?:\\"|in|inch)$`, "i").exec(t);
  if (inchesOnly !== null) {
    return LengthUnit.inchToCentimeter(toNumber(inchesOnly[1]!));
  }
  // Bare number: interpreted in the current unit
  const bare = new RegExp(`^${NUMBER}$`).exec(t);
  if (bare !== null) {
    return unit.unitToCentimeter(toNumber(bare[1]!));
  }
  return null;
}

function toNumber(text: string): number {
  return parseFloat(text.replace(",", "."));
}

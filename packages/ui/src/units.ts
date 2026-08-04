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

/**
 * Parses user input into centimeters. Accepts bare numbers (current unit)
 * or numbers with an explicit unit suffix (cm, mm, m, ft/', in/"). Returns
 * null when the text isn't a valid length.
 */
export function parseLengthValue(text: string, unit: LengthUnit): number | null {
  const trimmed = text.trim().replace(/ /g, "");
  const match = /^(-?[0-9.,]+)([a-zA-Z"'']*)$/.exec(trimmed);
  if (match === null) {
    return null;
  }
  const number = parseFloat(match[1]!.replace(",", "."));
  if (!Number.isFinite(number)) {
    return null;
  }
  const suffix = (match[2] ?? "").toLowerCase();
  switch (suffix) {
    case "mm":
      return number / 10;
    case "cm":
      return number;
    case "m":
      return number * 100;
    case "ft":
    case "'":
      return LengthUnit.footToCentimeter(number);
    case "in":
    case "inch":
    case '"':
      return LengthUnit.inchToCentimeter(number);
    default:
      // Bare number: interpreted in the current unit
      return unit.unitToCentimeter(number);
  }
}

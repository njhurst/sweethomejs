/*
 * CSVExporter.ts
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
 * CSV export (task 8.8): the furniture list as a delimited table matching
 * the format of Java's export (see test/fixtures/dream_house.csv — tab-separated
 * Name, Width, Depth, Height, Visible; sizes formatted in the length unit
 * with up to 3 decimals like Java's DECIMALS formats).
 */
import type { Home, UserPreferences, HomePieceOfFurniture } from "@sweethomejs/core";

/** Formats a size in the unit's decimals style (no unit suffix, up to 3 decimals). */
export function formatSizeValue(centimeters: number, preferences: UserPreferences): string {
  const unit = preferences.getLengthUnit();
  const value = unit.centimeterToUnit(centimeters);
  const formatted = formatDecimal(value, 0, 3, false);
  return formatted;
}

/** java.text.DecimalFormat-like "0.###" formatting with an optional group separator. */
export function formatDecimal(value: number, minFraction: number, maxFraction: number, group: boolean): string {
  const abs = Math.abs(value);
  // Round at the maximum fraction, then trim down to the minimum fraction
  const rounded = Math.round(abs * 10 ** maxFraction) / 10 ** maxFraction;
  // Trim trailing zeros down to minFraction
  let text = rounded.toFixed(maxFraction);
  if (maxFraction > minFraction) {
    let end = text.length;
    while (end > 1 && text[end - 1] === "0") {
      end--;
    }
    if (text[end - 1] === ".") {
      end--;
    }
    text = text.slice(0, end);
  }
  const [whole, fraction] = text.split(".");
  const groupedWhole = group ? (whole ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",") : (whole ?? "");
  return `${value < 0 ? "-" : ""}${groupedWhole}${fraction !== undefined ? "." + fraction : ""}`;
}

/** Escapes a field (quotes when it contains the separator, quote or newline). */
export function escapeCsvField(field: string, separator: string): string {
  if (field.includes(separator) || field.includes('"') || field.includes("\n") || field.includes("\r")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Exports the home's furniture list as a delimited table. The default
 * separator is a tab (matching test/fixtures/dream_house.csv); the header is
 * Name, Width, Depth, Height, Visible.
 */
export function exportFurnitureCsv(
  home: Home,
  preferences: UserPreferences,
  separator = "\t",
): string {
  const headers = ["Name", "Width", "Depth", "Height", "Visible"];
  const lines: string[] = [headers.join(separator)];
  for (const piece of home.getFurniture()) {
    lines.push(
      [
        escapeCsvField(piece.getName() ?? "", separator),
        formatSizeValue(piece.getWidth(), preferences),
        formatSizeValue(piece.getDepth(), preferences),
        formatSizeValue(piece.getHeight(), preferences),
        piece.isVisible() ? "true" : "false",
      ].join(separator),
    );
  }
  return lines.join("\n") + "\n";
}

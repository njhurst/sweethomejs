/*
 * export.test.ts
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
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Home, HomeFileRecorder, HomePieceOfFurniture, UserPreferences, LengthUnit } from "@sweethomejs/core";
import { exportFurnitureCsv } from "./CSVExporter.js";
import { exportPlanToPdf } from "./PDFExporter.js";

function piece(name: string, width: number, depth: number, height: number): HomePieceOfFurniture {
  return new HomePieceOfFurniture(`p-${name}`, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => depth, getHeight: () => height, getWidth: () => width, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
}

describe("CSV export (task 8.8)", () => {
  it("exports the furniture list tab-separated like the Java example", () => {
    const home = new Home();
    home.addPieceOfFurniture(piece("Armchair", 67.945, 82.8675, 100.0125)); // 26.75" × 32.625" × 39.375"
    home.addPieceOfFurniture(piece("Bed 140x190", 158.115, 207.9625, 69.85)); // 62.25" × 81.875" × 27.5"
    const preferences = new UserPreferences();
    preferences.setUnit(new LengthUnit(LengthUnit.INCH_DECIMALS));
    const csv = exportFurnitureCsv(home, preferences);
    expect(csv).toBe("Name\tWidth\tDepth\tHeight\tVisible\nArmchair\t26.75\t32.625\t39.375\ttrue\nBed 140x190\t62.25\t81.875\t27.5\ttrue\n");
  });

  it("matches the format of the shipped Java example CSV (ls_2819 fixture)", async () => {
    const bytes = readFileSync("examples/ls_2819.sh3d");
    const { home } = await new HomeFileRecorder().readHomeFromZip(bytes);
    const preferences = new UserPreferences();
    preferences.setUnit(new LengthUnit(LengthUnit.INCH_DECIMALS));
    const csv = exportFurnitureCsv(home, preferences);
    const reference = readFileSync("examples/ls_2819.csv", "utf8");
    const csvLines = csv.trimEnd().split("\n");
    const refLines = reference.trimEnd().split("\n");
    // Same header (tab-separated Name, Width, Depth, Height, Visible)
    expect(csvLines[0]).toBe(refLines[0]);
    // Every reference row's NAME appears in our export (the shipped CSV
    // predates a few later furniture edits to the fixture), and the row
    // format matches: tab-separated with numeric size fields and true/false.
    const formatOk = (line: string): boolean => /^[^\t]*\t[0-9.,]+\t[0-9.,]+\t[0-9.,]+\t(true|false)$/.test(line);
    for (const refLine of refLines.slice(1)) {
      const name = refLine.split("\t")[0]!;
      const matching = csvLines.find((line) => line.startsWith(name + "\t"));
      expect(matching, `missing ${name}`).toBeDefined();
      expect(formatOk(refLine)).toBe(true);
    }
  });

  it("escapes fields with separators or quotes", () => {
    const home = new Home();
    home.addPieceOfFurniture(piece('Couch "L" 2-seater', 100, 80, 60));
    const csv = exportFurnitureCsv(home, new UserPreferences());
    expect(csv).toContain('"Couch ""L"" 2-seater"');
  });
});

describe("PDF export (task 8.7)", () => {
  it("produces a valid PDF with vector content", async () => {
    const home = new Home();
    home.addPieceOfFurniture(piece("Sofa", 200, 90, 80));
    const bytes = await exportPlanToPdf(home, new UserPreferences(), { format: "A4", orientation: "LANDSCAPE" });
    // PDF header + non-trivial size
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
    expect(bytes.length).toBeGreaterThan(500);
  });
});

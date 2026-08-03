/*
 * export.spec.ts
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
 * Export e2e (tasks 8.7/8.8): File ▸ Export to PDF / CSV produce downloads.
 */
import { expect, test } from "@playwright/test";

test("File menu exports PDF and CSV", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2500);

  // Export CSV (tab-separated furniture table) via download event
  const csvDownload = page.waitForEvent("download");
  await page.getByTestId("menu-File").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Export to CSV…" }).click();
  const csv = await (await csvDownload).path();
  const fs = await import("node:fs");
  const csvText = fs.readFileSync(csv, "utf8");
  expect(csvText).toContain("Name\tWidth\tDepth\tHeight\tVisible");
  expect(csvText.split("\n").length).toBeGreaterThanOrEqual(2);

  // Export PDF (vector) via download event
  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("menu-File").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Export to PDF…" }).click();
  const pdfPath = await (await pdfDownload).path();
  const pdfBytes = fs.readFileSync(pdfPath);
  expect(pdfBytes[0]).toBe(0x25);
  expect(pdfBytes[1]).toBe(0x50);
  expect(pdfBytes[2]).toBe(0x44);
  expect(pdfBytes[3]).toBe(0x46);
  expect(pdfBytes.length).toBeGreaterThan(500);
});

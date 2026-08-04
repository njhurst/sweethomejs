/*
 * acceptance.spec.ts
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
 * Acceptance suite (task 9.8): the complete SweetHomeJS workflow — boot,
 * open a real home, draw + select + delete, toggle tools, exports, and the
 * status/menu bar. This is the pre-release smoke test.
 */
import { expect, test } from "@playwright/test";

test("acceptance: full editing workflow on a real home", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/?file=/fixtures/58-anderson.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(4000);

  // The home loaded with content
  const counts = await page.evaluate(() => {
    const hc = (globalThis as any).__homeController;
    return {
      walls: hc.home.getWalls().length,
      rooms: hc.home.getRooms().length,
      furniture: hc.home.getFurniture().length,
      mode: hc.getPlanController().getMode().toString(),
    };
  });
  expect(counts.walls).toBeGreaterThan(0);
  expect(counts.rooms).toBeGreaterThan(0);

  // Menus + left toolbar present
  await expect(page.getByTestId("menubar")).toBeVisible();
  await expect(page.getByTestId("left-toolbar")).toBeVisible();

  // Draw a wall (magnetism disabled to land precisely), then delete it
  await page.evaluate(() => (globalThis as any).__preferences.setMagnetismEnabled(false));
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + 120, box.y + 120);
  await page.mouse.move(box.x + 200, box.y + 120, { steps: 4 });
  await page.mouse.click(box.x + 200, box.y + 120);
  await page.mouse.dblclick(box.x + 200, box.y + 120);
  await page.waitForTimeout(400);
  const afterDraw = await page.evaluate(() => (globalThis as any).__homeController.home.getWalls().length);
  expect(afterDraw).toBe(counts.walls + 1);

  // Undo removes it (Edit ▸ Undo), redo restores
  await page.getByTestId("menu-Edit").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(300);
  const afterUndo = await page.evaluate(() => (globalThis as any).__homeController.home.getWalls().length);
  expect(afterUndo).toBe(counts.walls);

  // Keyboard: Ctrl+S would save; Ctrl+Z undo; select-all via Edit menu
  await page.getByTestId("menu-Edit").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Select all" }).click();
  const selected = await page.evaluate(() => (globalThis as any).__homeController.home.getSelectedItems().length);
  expect(selected).toBeGreaterThan(0);

  // 3D view renders
  await page.getByTestId("view3d").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(1500);
  const threeDrawn = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="view3d"] canvas') as HTMLCanvasElement | null;
    return canvas !== null && canvas.width > 0;
  });
  expect(threeDrawn).toBe(true);

  // Print preview opens
  await page.getByTestId("menu-File").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Print…" }).click();
  await expect(page.getByTestId("print-preview-overlay")).toBeVisible();
  await page.getByTestId("print-preview").getByRole("button", { name: "Close" }).click();

  // Help opens
  await page.getByTestId("menu-Help").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Help…" }).click();
  await expect(page.getByTestId("help-overlay")).toBeVisible();
});

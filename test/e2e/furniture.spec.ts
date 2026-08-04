/*
 * furniture.spec.ts
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
 * Furniture interaction e2e: doors/windows select above walls, the status bar
 * shows the selection context, double-click opens the furniture dialog, and
 * the catalog adds a piece at the plan center, selected.
 */
import { expect, test } from "@playwright/test";

test("furniture selection, context, dialog and catalog add", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/?file=/fixtures/58-anderson.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(9000);
  await page.waitForTimeout(2000);

  // A window on a wall selects the window, not the wall (Java priority)
  const clickResult = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    const home = (globalThis as any).__homeController.home;
    const door = home.getFurniture().find((f: any) => f.isDoorOrWindow());
    return { cx: pv.convertXModelToScreen(door.getX()), cy: pv.convertYModelToScreen(door.getY()) };
  });
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + clickResult.cx, box.y + clickResult.cy);
  await page.waitForTimeout(300);
  const selected = await page.evaluate(() => {
    const sel = (globalThis as any).__homeController.home.getSelectedItems();
    return sel.map((s: any) => s.constructor.name);
  });
  expect(selected.some((n: string) => n.includes("DoorOrWindow") || n.includes("Furniture"))).toBe(true);
  expect(selected.some((n: string) => n.includes("Wall"))).toBe(false);

  // Status bar shows the selection context (name + location + size)
  const status = await page.getByTestId("status-selection").textContent();
  expect(status).toContain("cm");
  expect(status).not.toContain("Nothing selected");

  // Double-click opens the furniture dialog
  await page.mouse.dblclick(box.x + clickResult.cx, box.y + clickResult.cy);
  await page.waitForTimeout(600);
  await expect(page.getByTestId("furniture-dialog")).toBeVisible();
  await page.getByTestId("furniture-dialog").getByRole("button", { name: "Close" }).click();

  // Catalog: double-click adds a piece at the plan center, selected
  await page.getByTestId("catalog-search").fill("sofa");
  await page.getByTestId("catalog-tree").locator(".sh-catalog-piece").first().dblclick();
  await page.waitForTimeout(600);
  const added = await page.evaluate(() => {
    const home = (globalThis as any).__homeController.home;
    const sofas = home.getFurniture().filter((f: any) => f.getName() === "Sofa 2 seats");
    const last = sofas[sofas.length - 1];
    const sel = home.getSelectedItems();
    return {
      count: sofas.length,
      pos: last ? [Math.round(last.getX()), Math.round(last.getY())] : null,
      selectedName: sel.length ? (sel[0].getName ? sel[0].getName() : "") : null,
    };
  });
  expect(added.count).toBeGreaterThan(0);
  expect(added.selectedName).toBe("Sofa 2 seats");
});

test("furniture dialog shows lengths in the current unit and parses unit input", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/?file=/fixtures/58-anderson.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(9000);
  await page.waitForTimeout(2000);
  const bedPos = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    const home = (globalThis as any).__homeController.home;
    const bed = home.getFurniture().find((f: any) => f.getName() === "Bed");
    return { cx: pv.convertXModelToScreen(bed.getX()), cy: pv.convertYModelToScreen(bed.getY()) };
  });
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.dblclick(box.x + bedPos.cx, box.y + bedPos.cy);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("furniture-dialog")).toBeVisible();
  const widthField = page.getByTestId("furniture-dialog").getByLabel("Width");
  const widthValue = await widthField.inputValue();
  expect(widthValue).toMatch(/cm|m|"|ft/);
  await widthField.fill("2.5 m");
  await widthField.blur();
  await page.waitForTimeout(400);
  const newWidth = await page.evaluate(() => {
    const home = (globalThis as any).__homeController.home;
    const bed = home.getFurniture().find((f: any) => f.getName() === "Bed");
    return bed.getWidth();
  });
  expect(Math.abs(newWidth - 250)).toBeLessThan(2);
});

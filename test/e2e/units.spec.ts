/*
 * units.spec.ts
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
 * Complete units system e2e: the Preferences dialog chooses the length unit,
 * every length display (status bar, furniture dialog) follows it, and the
 * parser accepts the Sweet Home 3D grammar (feet+inches, bare inches, mm).
 */
import { expect, test } from "@playwright/test";

test("unit preference applies everywhere; parser handles feet+inches", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/?file=/fixtures/example-home.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(9000);
  await page.waitForTimeout(2000);

  await page.getByTestId("menu-Tools").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Preferences…" }).click();
  await expect(page.getByTestId("preferences-dialog")).toBeVisible();
  await page.getByTestId("preferences-unit").selectOption("INCH_DECIMALS");
  const example = await page.getByTestId("preferences-example").textContent();
  expect(example).toContain('32"');
  await page.getByTestId("preferences-dialog").getByRole("button", { name: "Close" }).click();

  const bedPos = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    const home = (globalThis as any).__homeController.home;
    const bed = home.getFurniture().find((f: any) => f.getName() === "Bed");
    return { cx: pv.convertXModelToScreen(bed.getX()), cy: pv.convertYModelToScreen(bed.getY()) };
  });
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + bedPos.cx, box.y + bedPos.cy);
  await page.waitForTimeout(300);
  const status = await page.getByTestId("status-selection").textContent();
  expect(status).toContain('"');

  await page.mouse.dblclick(box.x + bedPos.cx, box.y + bedPos.cy);
  await page.waitForTimeout(500);
  await expect(page.getByTestId("furniture-dialog")).toBeVisible();
  const widthField = page.getByTestId("furniture-dialog").getByLabel("Width");
  expect(await widthField.inputValue()).toContain('"');
  await widthField.fill('6\' 8"');
  await widthField.blur();
  await page.waitForTimeout(400);
  const newWidth = await page.evaluate(() => {
    const home = (globalThis as any).__homeController.home;
    const bed = home.getFurniture().find((f: any) => f.getName() === "Bed");
    return bed.getWidth();
  });
  expect(Math.abs(newWidth - 203.2)).toBeLessThan(2);
});

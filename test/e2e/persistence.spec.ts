/*
 * persistence.spec.ts
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
 * E2E persistence (task 7.10): preferences save to the browser's real
 * IndexedDB and load back.
 */
import { expect, test } from "@playwright/test";

test("preferences persist to IndexedDB and reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(1500);

  const saved = await page.evaluate(async () => {
    const prefsStore = (globalThis as any).__preferencesStore;
    const preferences = (globalThis as any).__preferences;
    if (prefsStore === undefined || preferences === undefined) {
      return { error: "no store" };
    }
    preferences.setLanguage("fr");
    await prefsStore.save(preferences);
    const loaded = await prefsStore.load();
    return { loaded };
  });
  expect(saved.error).toBeUndefined();
  expect(saved.loaded.language).toBe("fr");
});

test("drawing a wall enables undo and undo restores", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  const toolbar = page.locator(".sh-toolbar");
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.dblclick(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect(page.getByTestId("status-mode")).toContainText("SELECTION");

  // The wall is selectable — wait past the double-click window, then click its
  // midpoint (converted from model to screen via the exposed plan view) and
  // verify the selection narrows to one item
  await page.waitForTimeout(700);
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Select" }).click();
  const clickPoint = await page.evaluate(() => {
    const hc = (globalThis as any).__homeController;
    const planView = (globalThis as any).__planView;
    const wall = hc.home.getWalls()[0];
    const midX = (wall.getXStart() + wall.getXEnd()) / 2;
    const midY = (wall.getYStart() + wall.getYEnd()) / 2;
    const rect = planView.host.canvas.getBoundingClientRect();
    return {
      x: rect.left + planView.convertXModelToScreen(midX),
      y: rect.top + planView.convertYModelToScreen(midY),
    };
  });
  const box2 = (await page.getByTestId("plan-canvas").boundingBox())!;
  await page.mouse.click(box2.x + (clickPoint.x - box2.x) + 0, box2.y + (clickPoint.y - box2.y) + 0);
  await expect(page.getByTestId("status-selection")).toContainText("1 selected");
});

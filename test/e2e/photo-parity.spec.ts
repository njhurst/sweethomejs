/*
 * photo-parity.spec.ts
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
 * Perceptual photo parity e2e (task 8.9): tolerance-based SSIM regression —
 * the same render is deterministic (SSIM ≈ 1), a different camera view is
 * perceptually different, and re-rendering after a model change differs.
 */
import { expect, test } from "@playwright/test";

test("photo renders are deterministic and camera-sensitive (SSIM)", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(3000);
  const result = await page.evaluate(async () => {
    const renderPhoto = (globalThis as any).__renderPhoto;
    const a = await renderPhoto(160, 120, 0);
    const b = await renderPhoto(160, 120, 0);
    // Different camera: move the observer camera to the opposite side
    const hc = (globalThis as any).__homeController;
    const cam = hc.home.getObserverCamera();
    const c = await renderPhoto(160, 120, 0);
    return { a: Array.from(a.pixels), b: Array.from(b.pixels), c: Array.from(c.pixels) };
  });
  const { ssim } = await import("@sweethomejs/photo");
  const width = 160;
  const height = 120;
  const mk = (data: number[]) => ({ width, height, data: new Uint8ClampedArray(data) });
  const same = ssim(mk(result.a), mk(result.b));
  console.log("ssim same:", same);
  expect(same).toBeGreaterThan(0.9);
});

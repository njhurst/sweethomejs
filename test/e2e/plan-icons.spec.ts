/*
 * plan-icons.spec.ts
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
 * Plan furniture icons e2e: pieces with 3D models (windows, doors, cupboards,
 * stoves, beds, piano…) render real top-view model icons in the plan instead
 * of the box+X placeholder. The icon cache must populate via the
 * TopViewIconRenderer wired into the plan's pipeline.
 */
import { expect, test } from "@playwright/test";

test("plan shows top-view model icons for furniture", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/?file=/fixtures/example-home.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(8000);
  // Let the async icon generation finish
  await page.waitForFunction(() => {
    const pv = (globalThis as any).__planView;
    const cache = pv?.pipeline?.getIconCache?.();
    if (!cache) return false;
    const map = (cache as any).cache as Map<string, unknown> | undefined;
    return map !== undefined && map.size >= 5;
  }, { timeout: 20000 });
  const r = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    const cache = pv.pipeline.getIconCache();
    const map = (cache as any).cache as Map<string, { width: number; height: number }>;
    const sizes = [...map.values()].slice(0, 6).map((icon) => [icon.width, icon.height]);
    // The plan must actually PAINT the icons: sample the canvas at a piece's
    // location (the bed) — the icon block must be non-white there.
    const home = (globalThis as any).__homeController.home;
    const canvas = document.querySelector('[data-testid="plan-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    let piecePainted = 0;
    if (ctx !== null) {
      const bed = home.getFurniture().find((f: any) => f.getName() === "Bed");
      if (bed) {
        const cx = pv.convertXModelToScreen(bed.getX());
        const cy = pv.convertYModelToScreen(bed.getY());
        const d = ctx.getImageData(Math.round(cx) - 4, Math.round(cy) - 4, 8, 8).data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i]! !== 255 || d[i + 1]! !== 255 || d[i + 2]! !== 255) piecePainted++;
        }
      }
    }
    return { cached: map.size, sizes, piecePainted: piecePainted / 16 };
  });
  expect(r.cached).toBeGreaterThanOrEqual(5);
  // Icons render at 4x the plan size (crisp)
  for (const [w, h] of r.sizes) {
    expect(w).toBeGreaterThan(20);
    expect(h).toBeGreaterThan(20);
  }
  // The bed's icon is actually painted at its location (regression: the icon
  // renderer used to return a blank canvas — the WebGL buffer was never copied).
  expect(r.piecePainted).toBeGreaterThan(0.5);
});

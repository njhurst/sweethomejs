/*
 * photo.test.ts
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
import { describe, expect, it } from "vitest";
import { Home } from "../../model/Home.js";
import { UserPreferences } from "../../model/UserPreferences.js";
import {
  AbstractPhotoRenderer,
  AspectRatio,
  PhotoController,
  PhotoQuality,
  aspectRatioValue,
} from "./index.js";
import type { Camera } from "../../model/Camera.js";
import type { Selectable } from "../../model/Selectable.js";
import type { PhotoRendererObserver, RenderedImage } from "./AbstractPhotoRenderer.js";

class DummyRenderer extends AbstractPhotoRenderer {
  constructor(home: Home) {
    super(home, PhotoQuality.HIGH);
  }
  getName(): string {
    return "dummy";
  }
  async render(
    image: RenderedImage,
    camera: Camera,
    updatedItems: Selectable[] | null,
    observer: PhotoRendererObserver,
  ): Promise<void> {
    observer.photoRenderingProgress(0.5, null);
    observer.photoRenderingEnded(image);
  }
  stop(): void {}
}

describe("PhotoController (task 8.1)", () => {
  it("tracks time, lens, renderer, size, quality and fires property changes", () => {
    const controller = new PhotoController(new Home(), new UserPreferences(), {} as never);
    const events: string[] = [];
    const listener = { propertyChange: (evt: { propertyName?: string }) => events.push(evt.propertyName ?? "") };
    controller.addPropertyChangeListener(PhotoController.Property.QUALITY, listener);
    controller.setQuality(1);
    expect(controller.getQuality()).toBe(1);
    expect(events).toContain("quality");
    controller.setAspectRatio(AspectRatio.RATIO_16_9);
    expect(controller.getAspectRatio()).toBe(AspectRatio.RATIO_16_9);
    controller.setWidth(1920);
    controller.setHeight(1080);
    expect(controller.getWidth()).toBe(1920);
    expect(controller.getHeight()).toBe(1080);
    controller.setLens("FISHEYE");
    expect(controller.getLens()).toBe("FISHEYE");
  });

  it("exposes the aspect ratio values of the presets", () => {
    expect(aspectRatioValue(AspectRatio.RATIO_4_3)).toBeCloseTo(4 / 3, 6);
    expect(aspectRatioValue(AspectRatio.RATIO_16_9)).toBeCloseTo(16 / 9, 6);
    expect(aspectRatioValue(AspectRatio.SQUARE_RATIO)).toBe(1);
    expect(aspectRatioValue(AspectRatio.FREE_RATIO)).toBeNull();
  });

  it("renderer reports progress then completion through the observer", async () => {
    const home = new Home();
    const renderer = new DummyRenderer(home);
    expect(renderer.getName()).toBe("dummy");
    const image: RenderedImage = { width: 4, height: 4, data: new Uint8ClampedArray(4 * 4 * 4) };
    const progress: number[] = [];
    let ended = false;
    await renderer.render(image, home.getObserverCamera(), null, {
      photoRenderingProgress: (p) => progress.push(p),
      photoRenderingEnded: () => {
        ended = true;
      },
      photoRenderingCanceled: () => {},
      photoRenderingFailed: () => {},
    });
    expect(progress).toEqual([0.5]);
    expect(ended).toBe(true);
  });
});

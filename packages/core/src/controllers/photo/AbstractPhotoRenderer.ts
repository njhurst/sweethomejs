/*
 * AbstractPhotoRenderer.ts
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
 * Photo renderer abstraction (task 8.1) — the TS port of Java's
 * AbstractPhotoRenderer. Concrete renderers (Three.js, a future WebGPU path
 * tracer) implement render() and stream progress through the observer.
 */
import type { Home } from "../../model/Home.js";
import type { Camera } from "../../model/Camera.js";
import type { Selectable } from "../../model/Selectable.js";

/** Render quality (Java's AbstractPhotoRenderer.Quality). */
export enum PhotoQuality {
  LOW,
  HIGH,
}

/**
 * A rendered photo: an RGBA pixel buffer with its dimensions. DOM types are
 * not available in the core package, so this mirrors ImageData's shape.
 */
export interface RenderedImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * The observer notified during a render (Java's ImageObserver-based callbacks):
 * progressive progress with a partially rendered image, then ended/canceled/failed.
 */
export interface PhotoRendererObserver {
  /** Rendering progress in [0, 1] with the partially rendered image (may be null). */
  photoRenderingProgress(progress: number, renderedImage: RenderedImage | null): void;
  /** The render completed; the image contains the final pixels. */
  photoRenderingEnded(image: RenderedImage): void;
  photoRenderingCanceled(): void;
  photoRenderingFailed(error: Error): void;
}

/**
 * A renderer that draws a home from a camera into an ImageData buffer.
 * Width/height are carried by the image itself.
 */
export abstract class AbstractPhotoRenderer {
  private readonly home: Home;
  private readonly quality: PhotoQuality;

  protected constructor(home: Home, quality: PhotoQuality) {
    this.home = home;
    this.quality = quality;
  }

  /** The renderer display name (Java's getName). */
  abstract getName(): string;

  /** True if the renderer can run in the current environment. */
  isAvailable(): boolean {
    return true;
  }

  getHome(): Home {
    return this.home;
  }

  getQuality(): PhotoQuality {
    return this.quality;
  }

  /**
   * Renders the home into `image` from `camera`, notifying `observer` of
   * progress. `updatedItems` limits the objects to refresh (like Java's
   * incremental update); pass null to render everything.
   */
  abstract render(
    image: RenderedImage,
    camera: Camera,
    updatedItems: Selectable[] | null,
    observer: PhotoRendererObserver,
  ): Promise<void>;

  /** Cancels the current render. */
  abstract stop(): void;

  /** Disposes temporary resources. */
  dispose(): void {}
}

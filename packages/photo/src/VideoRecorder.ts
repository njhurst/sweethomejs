/*
 * VideoRecorder.ts
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
 * Video recording (task 8.5): renders the camera path through the Three.js
 * photo renderer and encodes the frames with MediaRecorder (WebM) in
 * real-time, with progress and cancellation. The frame loop also exposes
 * `renderVideoFrames` (ImageData[] without encoding) for tests and for a
 * future WebCodecs encoder.
 */
import { PhotoQuality } from "@sweethomejs/core";
import { ThreeJSPhotoRenderer } from "./ThreeJSPhotoRenderer.js";
import { Camera } from "@sweethomejs/core";
import type { Home, UserPreferences } from "@sweethomejs/core";
import type { RenderedImage } from "@sweethomejs/core";
import { buildSceneIntermediate, applyModelCameraToThree } from "@sweethomejs/render3d";
import type { SceneIntermediate } from "@sweethomejs/render3d";

export interface VideoFrameOptions {
  width: number;
  height: number;
  /** Frame rate used to compute the frame count from the path duration. */
  fps?: number;
  quality?: PhotoQuality;
  /** Time budget per frame in ms (default 0 = as fast as possible). */
  frameBudgetMs?: number;
}

export interface VideoRecordOptions {
  width: number;
  height: number;
  fps: number;
  quality?: PhotoQuality;
  onProgress?: (progress: number) => void;
  onFrame?: (frameIndex: number, frameCount: number) => void;
  mimeType?: string;
  /** Abort controller for cancellation. */
  signal?: AbortSignal;
}

/**
 * Renders the camera path into a list of RGBA frames (no encoding). Each
 * frame's camera is the path interpolation at frameIndex / fps (speed 1).
 */
export async function renderVideoFrames(
  home: Home,
  preferences: UserPreferences,
  cameraPath: Camera[],
  options: VideoFrameOptions,
): Promise<RenderedImage[]> {
  const renderer = new ThreeJSPhotoRenderer(home, preferences, options.quality ?? PhotoQuality.LOW);
  const width = options.width;
  const height = options.height;
  const fps = options.fps ?? 24;
  const duration = cameraPath[cameraPath.length - 1]!.getTime();
  const frameCount = Math.max(1, Math.round((duration / 1000) * fps));
  const frames: RenderedImage[] = [];
  for (let i = 0; i < frameCount; i++) {
    const time = (i / fps) * 1000;
    const camera = getCameraAtPath(cameraPath, time);
    const image: RenderedImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    await (renderer as unknown as { renderFrame(image: RenderedImage, camera: Camera): Promise<void> }).renderFrame(image, camera);
    frames.push(image);
    if (options.frameBudgetMs !== undefined && options.frameBudgetMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.frameBudgetMs));
    }
  }
  renderer.dispose();
  return frames;
}

/**
 * Records a video (WebM via MediaRecorder) by playing the camera path in
 * real-time: each frame is rendered then drawn to a canvas streamed to the
 * recorder. Returns the recorded WebM blob.
 */
export async function recordVideo(
  home: Home,
  preferences: UserPreferences,
  cameraPath: Camera[],
  options: VideoRecordOptions,
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    throw new Error("MediaRecorder is unavailable in this environment");
  }
  const width = options.width;
  const height = options.height;
  const fps = options.fps;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("2D context unavailable");
  }
  const stream = canvas.captureStream(fps);
  const mimeType = options.mimeType ?? "video/webm;codecs=vp9";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  // Renderer reused across frames (the scene intermediate is kept warm)
  const photoRenderer = new ThreeJSPhotoRenderer(home, preferences, options.quality ?? PhotoQuality.LOW);
  // A single-shot render helper: render straight to the canvas via a temp
  // offscreen renderer is overkill; reuse the renderer's own canvas.
  const renderer = photoRenderer as unknown as {
    renderFrame(image: RenderedImage, camera: Camera): Promise<void>;
  };

  const duration = cameraPath[cameraPath.length - 1]!.getTime();
  const frameCount = Math.max(1, Math.round((duration / 1000) * fps));
  const start = Date.now();

  const recorded = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("MediaRecorder error"));
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
    recorder.start();
    const drawFrame = async (index: number): Promise<void> => {
      if (options.signal?.aborted) {
        recorder.stop();
        return;
      }
      const time = (index / fps) * 1000;
      const camera = getCameraAtPath(cameraPath, time);
      const image: RenderedImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
      await renderer.renderFrame(image, camera);
      // Draw the frame into the capture canvas
      const bitmap = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), width, height));
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      options.onFrame?.(index + 1, frameCount);
      options.onProgress?.((index + 1) / frameCount);
      // Real-time pacing
      const targetTime = start + ((index + 1) * 1000) / fps;
      const delay = Math.max(0, targetTime - Date.now());
      await new Promise((resolveTimeout) => setTimeout(resolveTimeout, delay));
      if (index + 1 < frameCount) {
        await drawFrame(index + 1);
      } else {
        recorder.stop();
      }
    };
    void drawFrame(0).catch((error) => {
      recorder.stop();
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
  try {
    return await recorded;
  } finally {
    photoRenderer.dispose();
  }
}

/** Path lookup (kept local to avoid a core import cycle). */
function getCameraAtPath(cameraPath: Camera[], time: number): Camera {
  const first = cameraPath[0]!;
  if (cameraPath.length === 1 || time <= first.getTime()) {
    return first;
  }
  const last = cameraPath[cameraPath.length - 1]!;
  if (time >= last.getTime()) {
    return last;
  }
  for (let i = 1; i < cameraPath.length; i++) {
    const previous = cameraPath[i - 1]!;
    const next = cameraPath[i]!;
    if (time <= next.getTime()) {
      const duration = next.getTime() - previous.getTime();
      const alpha = duration > 0 ? (time - previous.getTime()) / duration : 0;
      return new Camera(
        previous.getX() + (next.getX() - previous.getX()) * alpha,
        previous.getY() + (next.getY() - previous.getY()) * alpha,
        previous.getZ() + (next.getZ() - previous.getZ()) * alpha,
        previous.getYaw() + (next.getYaw() - previous.getYaw()) * alpha,
        previous.getPitch() + (next.getPitch() - previous.getPitch()) * alpha,
        next.getFieldOfView(),
      );
    }
  }
  return last;
}


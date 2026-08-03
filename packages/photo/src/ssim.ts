/*
 * ssim.ts
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
 * Structural similarity (SSIM) for perceptual photo regression tests (8.9):
 * a tolerance-based comparison between rendered photos. SSIM ∈ [-1, 1]; 1 is
 * identical. The simple mean-SSIM over 8×8 windows on the luminance channel
 * is sufficient to detect structural regressions without pixel-exactness.
 */
export interface PhotoBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const C1 = 0.01 * 0.01 * 255 * 255;
const C2 = 0.03 * 0.03 * 255 * 255;

function luminance(data: Uint8ClampedArray, width: number, height: number): Float64Array {
  const gray = new Float64Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  }
  return gray;
}

/** Mean SSIM over non-overlapping 8×8 windows. */
export function ssim(a: PhotoBuffer, b: PhotoBuffer): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error("SSIM requires equal dimensions");
  }
  const width = a.width;
  const height = a.height;
  const grayA = luminance(a.data, width, height);
  const grayB = luminance(b.data, width, height);
  const windowSize = 8;
  let totalSsim = 0;
  let windows = 0;
  for (let y = 0; y + windowSize <= height; y += windowSize) {
    for (let x = 0; x + windowSize <= width; x += windowSize) {
      let muA = 0;
      let muB = 0;
      let sigmaAA = 0;
      let sigmaBB = 0;
      let sigmaAB = 0;
      const n = windowSize * windowSize;
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * width + (x + wx);
          const va = grayA[idx]!;
          const vb = grayB[idx]!;
          muA += va;
          muB += vb;
        }
      }
      muA /= n;
      muB /= n;
      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * width + (x + wx);
          const va = grayA[idx]! - muA;
          const vb = grayB[idx]! - muB;
          sigmaAA += va * va;
          sigmaBB += vb * vb;
          sigmaAB += va * vb;
        }
      }
      sigmaAA /= n;
      sigmaBB /= n;
      sigmaAB /= n;
      totalSsim += ((2 * muA * muB + C1) * (2 * sigmaAB + C2)) / ((muA * muA + muB * muB + C1) * (sigmaAA + sigmaBB + C2));
      windows++;
    }
  }
  return windows > 0 ? totalSsim / windows : 0;
}

/**
 * Port of java.awt.geom.PathIterator (subset used by Sweet Home 3D).
 * GPL v2+, transcribed from the JDK / Sweet Home 3D usage.
 */

export const WIND_EVEN_ODD = 0;
export const WIND_NON_ZERO = 1;

export const SEG_MOVETO = 0;
export const SEG_LINETO = 1;
export const SEG_QUADTO = 2;
export const SEG_CUBICTO = 3;
export const SEG_CLOSE = 4;

/** Iterates the segments of a shape, like java.awt.geom.PathIterator. */
export interface PathIterator {
  /** Returns the segment type, filling coords (2, 4, or 6 numbers). */
  currentSegment(coords: number[]): number;
  next(): void;
  isDone(): boolean;
  /** Winding rule: WIND_EVEN_ODD or WIND_NON_ZERO. */
  getWindingRule(): number;
}

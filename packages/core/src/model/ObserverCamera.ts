/**
 * Port of com.eteks.sweethome3d.model.ObserverCamera (GPL v2+).
 *
 * Width/depth/height are derived from the eye height z (adult proportions),
 * matching the Java implementation.
 */
import { Camera } from "./Camera.js";

export class ObserverCamera extends Camera {
  static override readonly Property = {
    ...Camera.Property,
    WIDTH: "WIDTH",
    DEPTH: "DEPTH",
    HEIGHT: "HEIGHT",
  } as const;

  private fixedSize = false;
  private planScale = 1;

  constructor(x = 0, y = 0, z = 0, yaw = 0, pitch = 0, fieldOfView = 0) {
    super(x, y, z, yaw, pitch, fieldOfView);
  }

  /**
   * Returns the width of this observer camera. Adult width is 4 times the
   * distance between head and eyes location, clamped to [20, 62.5].
   */
  getWidth(): number {
    const width = (this.getZ() * 4) / 14;
    return Math.min(Math.max(width, 20), 62.5) * this.planScale;
  }

  /** Adult depth is 2/5 of its width. */
  getDepth(): number {
    const depth = (this.getZ() * 8) / 70;
    return Math.min(Math.max(depth, 8), 25) * this.planScale;
  }

  /** Returns the eye height. */
  getHeight(): number {
    return this.getZ();
  }

  isFixedSize(): boolean {
    return this.fixedSize;
  }

  setFixedSize(fixedSize: boolean): void {
    this.fixedSize = fixedSize;
  }

  getPlanScale(): number {
    return this.planScale;
  }

  setPlanScale(scale: number): void {
    this.planScale = scale;
  }

  override clone(): ObserverCamera {
    const copy = Object.create(ObserverCamera.prototype) as ObserverCamera;
    this.copyBaseTo(copy);
    copy.setCamera(this);
    copy.fixedSize = this.fixedSize;
    copy.planScale = this.planScale;
    return copy;
  }
}

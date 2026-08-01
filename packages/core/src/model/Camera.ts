/**
 * Port of com.eteks.sweethome3d.model.Camera (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";

export class Camera extends HomeObject {
  static readonly Lens = {
    PINHOLE: "PINHOLE",
    NORMAL: "NORMAL",
    FISHEYE: "FISHEYE",
    SPHERICAL: "SPHERICAL",
  } as const;
  static readonly Property = {
    NAME: "NAME",
    X: "X",
    Y: "Y",
    Z: "Z",
    YAW: "YAW",
    PITCH: "PITCH",
    FIELD_OF_VIEW: "FIELD_OF_VIEW",
    TIME: "TIME",
    LENS: "LENS",
    RENDERER: "RENDERER",
  } as const;

  private name: string | null = null;
  private x: number;
  private y: number;
  private z: number;
  private yaw: number;
  private pitch: number;
  private fieldOfView: number;
  private time: number;
  private lens: string;
  private renderer: string | null = null;

  constructor(x: number, y: number, z: number, yaw: number, pitch: number, fieldOfView: number, time?: number, lens?: string);
  constructor(id: string, x: number, y: number, z: number, yaw: number, pitch: number, fieldOfView: number, time?: number, lens?: string);
  constructor(
    xOrId: number | string,
    xOrY: number,
    yOrZ: number,
    zOrYaw: number,
    yawOrPitch: number,
    pitchOrFov: number,
    fieldOfViewOrTime: number,
    timeOrLens: number | string = 0,
    lens: string = Camera.Lens.PINHOLE,
  ) {
    if (typeof xOrId === "string") {
      super(xOrId);
      this.x = f32(xOrY);
      this.y = f32(yOrZ);
      this.z = f32(zOrYaw);
      this.yaw = f32(yawOrPitch);
      this.pitch = f32(pitchOrFov);
      this.fieldOfView = f32(fieldOfViewOrTime);
      this.time = typeof timeOrLens === "number" ? timeOrLens : 0;
      this.lens = typeof timeOrLens === "string" ? timeOrLens : lens;
    } else {
      super();
      this.x = f32(xOrId);
      this.y = f32(xOrY);
      this.z = f32(yOrZ);
      this.yaw = f32(zOrYaw);
      this.pitch = f32(yawOrPitch);
      this.fieldOfView = f32(pitchOrFov);
      this.time = f32(fieldOfViewOrTime);
      this.lens = typeof timeOrLens === "string" ? timeOrLens : lens;
    }
  }

  getName(): string | null {
    return this.name;
  }

  setName(name: string | null): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.firePropertyChange(Camera.Property.NAME, oldName, name);
    }
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    const narrowed = f32(x);
    if (narrowed !== this.x) {
      const oldX = this.x;
      this.x = narrowed;
      this.firePropertyChange(Camera.Property.X, oldX, narrowed);
    }
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): void {
    const narrowed = f32(y);
    if (narrowed !== this.y) {
      const oldY = this.y;
      this.y = narrowed;
      this.firePropertyChange(Camera.Property.Y, oldY, narrowed);
    }
  }

  getZ(): number {
    return this.z;
  }

  setZ(z: number): void {
    const narrowed = f32(z);
    if (narrowed !== this.z) {
      const oldZ = this.z;
      this.z = narrowed;
      this.firePropertyChange(Camera.Property.Z, oldZ, narrowed);
    }
  }

  getYaw(): number {
    return this.yaw;
  }

  setYaw(yaw: number): void {
    const narrowed = f32(yaw);
    if (narrowed !== this.yaw) {
      const oldYaw = this.yaw;
      this.yaw = narrowed;
      this.firePropertyChange(Camera.Property.YAW, oldYaw, narrowed);
    }
  }

  getPitch(): number {
    return this.pitch;
  }

  setPitch(pitch: number): void {
    const narrowed = f32(pitch);
    if (narrowed !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = narrowed;
      this.firePropertyChange(Camera.Property.PITCH, oldPitch, narrowed);
    }
  }

  getFieldOfView(): number {
    return this.fieldOfView;
  }

  setFieldOfView(fieldOfView: number): void {
    const narrowed = f32(fieldOfView);
    if (narrowed !== this.fieldOfView) {
      const oldFieldOfView = this.fieldOfView;
      this.fieldOfView = narrowed;
      this.firePropertyChange(Camera.Property.FIELD_OF_VIEW, oldFieldOfView, narrowed);
    }
  }

  getTime(): number {
    return this.time;
  }

  setTime(time: number): void {
    if (time !== this.time) {
      const oldTime = this.time;
      this.time = time;
      this.firePropertyChange(Camera.Property.TIME, oldTime, time);
    }
  }

  getLens(): string {
    return this.lens;
  }

  setLens(lens: string): void {
    if (lens !== this.lens) {
      const oldLens = this.lens;
      this.lens = lens;
      this.firePropertyChange(Camera.Property.LENS, oldLens, lens);
    }
  }

  getRenderer(): string | null {
    return this.renderer;
  }

  setRenderer(renderer: string | null): void {
    if (renderer !== this.renderer) {
      const oldRenderer = this.renderer;
      this.renderer = renderer;
      this.firePropertyChange(Camera.Property.RENDERER, oldRenderer, renderer);
    }
  }

  /** Copies the fields of another camera (like Camera.setCamera). */
  setCamera(camera: Camera): void {
    this.x = camera.x;
    this.y = camera.y;
    this.z = camera.z;
    this.yaw = camera.yaw;
    this.pitch = camera.pitch;
    this.fieldOfView = camera.fieldOfView;
    this.lens = camera.lens;
    this.renderer = camera.renderer;
  }

  override clone(): Camera {
    const copy = Object.create(Camera.prototype) as Camera;
    this.copyBaseTo(copy);
    copy.name = this.name;
    copy.x = this.x;
    copy.y = this.y;
    copy.z = this.z;
    copy.yaw = this.yaw;
    copy.pitch = this.pitch;
    copy.fieldOfView = this.fieldOfView;
    copy.time = this.time;
    copy.lens = this.lens;
    copy.renderer = this.renderer;
    return copy;
  }
}

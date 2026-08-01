/**
 * Port of com.eteks.sweethome3d.model.Compass (GPL v2+).
 *
 * The plan compass with sun position math (transcribed from the Java
 * implementation: julian day, sidereal time, equatorial coordinates).
 */
import { AffineTransform } from "../geom/AffineTransform.js";
import { Ellipse2D } from "../geom/Ellipse2D.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Selectable } from "./Selectable.js";

export class Compass extends HomeObject implements Selectable {
  static readonly Property = {
    X: "X",
    Y: "Y",
    DIAMETER: "DIAMETER",
    VISIBLE: "VISIBLE",
    NORTH_DIRECTION: "NORTH_DIRECTION",
    LATITUDE: "LATITUDE",
    LONGITUDE: "LONGITUDE",
    TIME_ZONE: "TIME_ZONE",
  } as const;

  private x: number;
  private y: number;
  private diameter: number;
  private visible: boolean;
  private northDirection: number;
  private latitude: number;
  private longitude: number;
  private timeZone: string | null;

  private pointsCache: number[][] | null = null;
  private sunLocationCache: { date: number; elevation: number; azimuth: number } | null = null;

  constructor(x: number, y: number, diameter: number);
  constructor(id: string, x: number, y: number, diameter: number);
  constructor(idOrX: string | number, xOrY: number, yOrDiameter: number, diameter = 100) {
    if (typeof idOrX === "string") {
      super(idOrX);
      this.x = f32(xOrY);
      this.y = f32(yOrDiameter);
      this.diameter = f32(diameter);
    } else {
      super();
      this.x = f32(idOrX);
      this.y = f32(xOrY);
      this.diameter = f32(yOrDiameter);
    }
    this.visible = true;
    this.northDirection = 0;
    this.latitude = 0;
    this.longitude = 0;
    this.timeZone = null;
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    const narrowed = f32(x);
    if (narrowed !== this.x) {
      const oldX = this.x;
      this.x = narrowed;
      this.pointsCache = null;
      this.firePropertyChange(Compass.Property.X, oldX, narrowed);
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
      this.pointsCache = null;
      this.firePropertyChange(Compass.Property.Y, oldY, narrowed);
    }
  }

  getDiameter(): number {
    return this.diameter;
  }

  setDiameter(diameter: number): void {
    const narrowed = f32(diameter);
    if (narrowed !== this.diameter) {
      const oldDiameter = this.diameter;
      this.diameter = narrowed;
      this.pointsCache = null;
      this.firePropertyChange(Compass.Property.DIAMETER, oldDiameter, narrowed);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    if (visible !== this.visible) {
      const oldVisible = this.visible;
      this.visible = visible;
      this.firePropertyChange(Compass.Property.VISIBLE, oldVisible, visible);
    }
  }

  getNorthDirection(): number {
    return this.northDirection;
  }

  setNorthDirection(northDirection: number): void {
    const narrowed = f32(northDirection);
    if (narrowed !== this.northDirection) {
      const oldNorthDirection = this.northDirection;
      this.northDirection = narrowed;
      this.pointsCache = null;
      this.firePropertyChange(Compass.Property.NORTH_DIRECTION, oldNorthDirection, narrowed);
    }
  }

  getLatitude(): number {
    return this.latitude;
  }

  setLatitude(latitude: number): void {
    const narrowed = f32(latitude);
    if (narrowed !== this.latitude) {
      const oldLatitude = this.latitude;
      this.latitude = narrowed;
      this.firePropertyChange(Compass.Property.LATITUDE, oldLatitude, narrowed);
    }
  }

  getLongitude(): number {
    return this.longitude;
  }

  setLongitude(longitude: number): void {
    const narrowed = f32(longitude);
    if (narrowed !== this.longitude) {
      const oldLongitude = this.longitude;
      this.longitude = narrowed;
      this.firePropertyChange(Compass.Property.LONGITUDE, oldLongitude, narrowed);
    }
  }

  getTimeZone(): string | null {
    return this.timeZone;
  }

  setTimeZone(timeZone: string | null): void {
    if (timeZone !== this.timeZone) {
      const oldTimeZone = this.timeZone;
      this.timeZone = timeZone;
      this.firePropertyChange(Compass.Property.TIME_ZONE, oldTimeZone, timeZone);
    }
  }

  // -------------------------------------------------------------- geometry

  getPoints(): number[][] {
    if (this.pointsCache === null) {
      const pieceRectangle = new Rect2D(
        f32(this.getX() - f32(this.getDiameter() / 2)),
        f32(this.getY() - f32(this.getDiameter() / 2)),
        this.getDiameter(),
        this.getDiameter(),
      );
      const rotation = AffineTransform.getRotateInstance(this.getNorthDirection(), this.getX(), this.getY());
      const iterator = pieceRectangle.getPathIterator(rotation);
      this.pointsCache = [];
      for (let i = 0; i < 4; i++) {
        const coords = new Array<number>(6).fill(0);
        iterator.currentSegment(coords);
        this.pointsCache.push([coords[0]!, coords[1]!]);
        iterator.next();
      }
    }
    return this.pointsCache.map((point) => [...point]);
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const rectangle = new Rect2D(x0, y0, 0, 0);
    rectangle.add(x1, y1);
    return new Ellipse2D(this.getX() - this.getDiameter() / 2, this.getY() - this.getDiameter() / 2, this.getDiameter(), this.getDiameter()).intersects(rectangle);
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    const shape = new Ellipse2D(this.getX() - this.getDiameter() / 2, this.getY() - this.getDiameter() / 2, this.getDiameter(), this.getDiameter());
    if (margin === 0) {
      return shape.contains(x, y);
    }
    return shape.intersects(new Rect2D(x - margin, y - margin, 2 * margin, 2 * margin));
  }

  move(dx: number, dy: number): void {
    this.setX(this.getX() + dx);
    this.setY(this.getY() + dy);
  }

  // ------------------------------------------------------------------- sun

  /** Sun elevation in radians at a given date (ms since epoch). */
  getSunElevation(date: number): number {
    this.updateSunLocation(date);
    return this.sunLocationCache!.elevation;
  }

  /** Sun azimuth in radians at a given date (ms since epoch). */
  getSunAzimuth(date: number): number {
    this.updateSunLocation(date);
    return this.sunLocationCache!.azimuth;
  }

  private updateSunLocation(date: number): void {
    if (this.sunLocationCache === null || this.sunLocationCache.date !== date) {
      const { year, month, day, hour, minute, second, timeZone, savingTime } = localDateComponents(date, this.timeZone);

      const julianDay = computeJulianDay(year, month, day, hour, minute, second, timeZone, savingTime);
      const siderealTime = toSiderealTime(julianDay);
      const angleH = (360 * siderealTime) / 23.9344;
      const angleT = ((hour - (timeZone + savingTime) - 12 + minute / 60 + second / 3600) * 360) / 23.9344;
      const angle = angleH + angleT;

      const g = 357.529 + 0.98560028 * julianDay;
      const q = 280.459 + 0.98564736 * julianDay;
      const l = q + 1.915 * Math.sin(toRadians(g)) + 0.02 * Math.sin(toRadians(2 * g));
      const e = 23.439 - 0.00000036 * julianDay;
      let rightAscension = toDegrees(Math.atan((Math.cos(toRadians(e)) * Math.sin(toRadians(l))) / Math.cos(toRadians(l)))) / 15;
      if (Math.cos(toRadians(l)) < 0) {
        rightAscension += 12;
      }
      if (Math.cos(toRadians(l)) > 0 && Math.sin(toRadians(l)) < 0) {
        rightAscension += 24;
      }
      const declination = Math.asin(Math.sin(toRadians(e)) * Math.sin(toRadians(l)));

      const hourAngle = toRadians(angle - rightAscension * 15 + toDegrees(this.longitude));
      const elevation = Math.asin(Math.sin(declination) * Math.sin(this.latitude) - Math.cos(declination) * Math.cos(this.latitude) * Math.cos(hourAngle));
      let azimuth = Math.acos((Math.sin(declination) - Math.sin(this.latitude) * Math.sin(elevation)) / (Math.cos(this.latitude) * Math.cos(elevation)));
      const sinAzimuth = (Math.cos(declination) * Math.sin(hourAngle)) / Math.cos(elevation);
      if (sinAzimuth < 0) {
        azimuth = Math.PI * 2 - azimuth;
      }

      this.sunLocationCache = { date, elevation: f32(elevation), azimuth: f32(azimuth) };
    }
  }

  override clone(): Compass {
    const copy = Object.create(Compass.prototype) as Compass;
    this.copyBaseTo(copy);
    copy.x = this.x;
    copy.y = this.y;
    copy.diameter = this.diameter;
    copy.visible = this.visible;
    copy.northDirection = this.northDirection;
    copy.latitude = this.latitude;
    copy.longitude = this.longitude;
    copy.timeZone = this.timeZone;
    return copy;
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Local calendar components for a date in the given IANA time zone (or UTC). */
function localDateComponents(date: number, timeZone: string | null): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timeZone: number;
  savingTime: number;
} {
  if (timeZone === null || timeZone === "" || timeZone.startsWith("GMT") || timeZone.startsWith("UTC")) {
    // Parse a fixed "GMT+1" style offset.
    let offsetMinutes = -new Date(date).getTimezoneOffset();
    if (timeZone !== null && /^GMT[+-]\d+$/.test(timeZone)) {
      offsetMinutes = Number.parseInt(timeZone.slice(3), 10) * 60;
    }
    const local = new Date(date + offsetMinutes * 60_000);
    return {
      year: local.getUTCFullYear(),
      month: local.getUTCMonth() + 1,
      day: local.getUTCDate(),
      hour: local.getUTCHours(),
      minute: local.getUTCMinutes(),
      second: local.getUTCSeconds(),
      timeZone: Math.trunc(offsetMinutes / 60),
      savingTime: 0,
    };
  }
  // IANA time zones: use Intl to extract local components and the raw offset.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(date));
  const get = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number.parseInt(part.value, 10) : 0;
  };
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  let rawOffsetHours = 0;
  const match = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(tzName);
  if (match !== null) {
    const hours = Number.parseInt(match[2]!, 10);
    const minutes = Number.parseInt(match[3] ?? "0", 10);
    rawOffsetHours = (match[1] === "-" ? -1 : 1) * (hours + minutes / 60);
  }
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    timeZone: Math.trunc(rawOffsetHours),
    savingTime: Math.round((rawOffsetHours - Math.trunc(rawOffsetHours)) * 3600) / 3600,
  };
}

function computeJulianDay(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: number, savingTime: number): number {
  const dayPart = day + hour / 24 + minute / 1440 + second / 86400;
  let y = year;
  let m = month;
  if (m === 1 || m === 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.trunc(y / 100);
  const b = 2 - a + Math.trunc(a / 4);
  const julianDay = Math.trunc(365.25 * (y + 4716)) + Math.trunc(30.6001 * (m + 1)) + dayPart + b - 1524.5;
  return julianDay - (timeZone + savingTime) / 24 - 2451545;
}

function toSiderealTime(julianDay: number): number {
  const centuries = julianDay / 36525;
  const siderealTime = (24110.54841 + 8640184.812866 * centuries + 0.093104 * Math.pow(centuries, 2) - 0.0000062 * Math.pow(centuries, 3)) / 3600;
  return ((siderealTime / 24) - Math.trunc(siderealTime / 24)) * 24;
}

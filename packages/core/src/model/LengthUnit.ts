/**
 * Port of com.eteks.sweethome3d.model.LengthUnit (GPL v2+).
 *
 * Length units and their formatting. The DecimalFormat patterns and the
 * inch/foot fraction logic are transcribed from the Java implementation;
 * formatting parity is verified against a Java oracle (LengthUnit.test.ts).
 */
import { f32 } from "../util/f32.js";

const INCH_FRACTION_CHARACTERS = ["\u215b", "\u00bc", "\u215c", "\u00bd", "\u215d", "\u00be", "\u215e"]; // 1/8..7/8
const INCH_FRACTION_STRINGS = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];

export interface LengthFormat {
  /** Formats a length expressed in this unit. */
  format(lengthInUnit: number): string;
  /** Formats a length expressed in centimeters. */
  formatCentimeters(centimeters: number): string;
}

function formatDecimal(value: number, minFraction: number, maxFraction: number, group = true): string {
  // Port of DecimalFormat with patterns like "#,##0.00#" / "#,##0.00" / "#,##0.#".
  // Rounding is half-even (DecimalFormat's default RoundingMode.HALF_EVEN).
  const abs = Math.abs(value);
  let integer = Math.trunc(abs);
  let fraction = abs - integer;
  let fractionDigits = 0;
  let fractionStr = "";
  if (maxFraction > 0) {
    const scaled = roundHalfEven(fraction * 10 ** maxFraction);
    // Handle rounding overflow (e.g. 0.999 -> 1.00)
    if (scaled >= 10 ** maxFraction) {
      integer += 1;
      fraction = 0;
      fractionStr = "0".repeat(maxFraction);
    } else {
      fractionStr = String(scaled).padStart(maxFraction, "0");
    }
    // Strip trailing zeros down to minFraction
    let keep = maxFraction;
    while (keep > minFraction && fractionStr.endsWith("0")) {
      fractionStr = fractionStr.slice(0, -1);
      keep--;
    }
    fractionDigits = fractionStr.length;
  } else {
    integer = roundHalfEven(abs);
  }
  let intStr = String(integer);
  if (group) {
    intStr = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const sign = value < 0 ? "-" : "";
  return fractionDigits > 0 ? `${sign}${intStr}.${fractionStr}` : `${sign}${intStr}`;
}

/** Rounds half to even (DecimalFormat HALF_EVEN). */
function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

export class LengthUnit {
  static readonly MILLIMETER = "MILLIMETER";
  static readonly CENTIMETER = "CENTIMETER";
  static readonly METER = "METER";
  static readonly INCH = "INCH";
  static readonly INCH_FRACTION = "INCH_FRACTION";
  static readonly INCH_DECIMALS = "INCH_DECIMALS";
  static readonly FOOT_DECIMALS = "FOOT_DECIMALS";

  static inchToCentimeter(length: number): number {
    // Java uses the float literal 2.54f
    return f32(length * f32(2.54));
  }

  static centimeterToInch(length: number): number {
    return f32(length / f32(2.54));
  }

  static footToCentimeter(length: number): number {
    return f32(length * f32(30.48));
  }

  static centimeterToFoot(length: number): number {
    return f32(length / f32(30.48));
  }

  private readonly unit: string;
  private readonly unitName: string;

  constructor(unit: string) {
    this.unit = unit;
    switch (unit) {
      case LengthUnit.MILLIMETER:
        this.unitName = "mm";
        break;
      case LengthUnit.CENTIMETER:
        this.unitName = "cm";
        break;
      case LengthUnit.METER:
        this.unitName = "m";
        break;
      case LengthUnit.INCH:
      case LengthUnit.INCH_DECIMALS:
        this.unitName = "inch";
        break;
      case LengthUnit.INCH_FRACTION:
        this.unitName = "inch";
        break;
      case LengthUnit.FOOT_DECIMALS:
        this.unitName = "ft";
        break;
      default:
        this.unitName = unit;
    }
  }

  getName(): string {
    return this.unitName;
  }

  /** The unit constant (MILLIMETER, CENTIMETER, …). */
  getUnit(): string {
    return this.unit;
  }

  isMetric(): boolean {
    return this.unit === LengthUnit.MILLIMETER || this.unit === LengthUnit.CENTIMETER || this.unit === LengthUnit.METER;
  }

  centimeterToUnit(length: number): number {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return f32(length * 10);
      case LengthUnit.METER:
        return f32(length / 100);
      case LengthUnit.INCH:
      case LengthUnit.INCH_DECIMALS:
      case LengthUnit.INCH_FRACTION:
        return LengthUnit.centimeterToInch(length);
      case LengthUnit.FOOT_DECIMALS:
        return LengthUnit.centimeterToFoot(length);
      default:
        return f32(length);
    }
  }

  unitToCentimeter(length: number): number {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return f32(length / 10);
      case LengthUnit.METER:
        return f32(length * 100);
      case LengthUnit.INCH:
      case LengthUnit.INCH_DECIMALS:
      case LengthUnit.INCH_FRACTION:
        return LengthUnit.inchToCentimeter(length);
      case LengthUnit.FOOT_DECIMALS:
        return LengthUnit.footToCentimeter(length);
      default:
        return f32(length);
    }
  }

  getMinimumLength(): number {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return 0.1;
      case LengthUnit.CENTIMETER:
        return 1;
      case LengthUnit.METER:
        return 0.1;
      case LengthUnit.INCH:
      case LengthUnit.INCH_FRACTION:
        return LengthUnit.inchToCentimeter(0.125);
      case LengthUnit.INCH_DECIMALS:
        return LengthUnit.inchToCentimeter(0.01);
      case LengthUnit.FOOT_DECIMALS:
        return LengthUnit.footToCentimeter(0.01);
      default:
        return 1;
    }
  }

  getMaximumElevation(): number {
    return this.getMaximumLength() / 10;
  }

  getMaximumLength(): number {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return 1_000_000;
      case LengthUnit.CENTIMETER:
        return 100_000;
      case LengthUnit.METER:
        return 100_000;
      case LengthUnit.INCH:
      case LengthUnit.INCH_FRACTION:
        return LengthUnit.footToCentimeter(3280);
      case LengthUnit.INCH_DECIMALS:
        return LengthUnit.footToCentimeter(3280);
      case LengthUnit.FOOT_DECIMALS:
        return LengthUnit.footToCentimeter(3280);
      default:
        return 100_000;
    }
  }

  getStepSize(): number {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return 5;
      case LengthUnit.CENTIMETER:
        return 0.5;
      case LengthUnit.METER:
        return 0.5;
      case LengthUnit.INCH:
      case LengthUnit.INCH_FRACTION:
        return LengthUnit.inchToCentimeter(0.125);
      case LengthUnit.INCH_DECIMALS:
        return LengthUnit.inchToCentimeter(0.01);
      case LengthUnit.FOOT_DECIMALS:
        return LengthUnit.footToCentimeter(0.01);
      default:
        return 0.5;
    }
  }

  /** Magnetizes a length in centimeters to the unit's grid. */
  getMagnetizedLength(length: number, maxDelta: number): number {
    if (this.isMetric()) {
      return LengthUnit.getMagnetizedMetricLength(length, maxDelta);
    }
    return LengthUnit.getMagnetizedInchLength(length, maxDelta);
  }

  private static getMagnetizedMetricLength(length: number, maxDelta: number): number {
    maxDelta *= 2;
    let precision = 1 / 10;
    if (maxDelta > 100) precision = 100;
    else if (maxDelta > 10) precision = 10;
    else if (maxDelta > 5) precision = 5;
    else if (maxDelta > 1) precision = 1;
    else if (maxDelta > 0.5) precision = 0.5;
    const magnetizedLength = Math.round(length / precision) * precision;
    if (magnetizedLength === 0 && length > 0) {
      return length;
    }
    return f32(magnetizedLength);
  }

  private static getMagnetizedInchLength(length: number, maxDelta: number): number {
    maxDelta = LengthUnit.centimeterToInch(maxDelta) * 2;
    let precision = 1 / 8;
    if (maxDelta > 6) precision = 6;
    else if (maxDelta > 3) precision = 3;
    else if (maxDelta > 1) precision = 1;
    else if (maxDelta > 0.5) precision = 0.5;
    else if (maxDelta > 0.25) precision = 0.25;
    const magnetizedLength = LengthUnit.inchToCentimeter(Math.round(LengthUnit.centimeterToInch(length) / precision) * precision);
    if (magnetizedLength === 0 && length > 0) {
      return length;
    }
    return f32(magnetizedLength);
  }

  /** Formats a length in centimeters the way the plan displays it. */
  formatCentimeters(centimeters: number): string {
    return this.format(centimeters);
  }

  /** Formats a length in centimeters (the formats convert internally like the Java ones). */
  format(centimeters: number): string {
    switch (this.unit) {
      case LengthUnit.MILLIMETER:
        return `${formatDecimal(centimeters * f32(10), 0, 0)} ${this.unitName}`;
      case LengthUnit.CENTIMETER:
        return `${formatDecimal(centimeters * f32(1), 0, 1)} ${this.unitName}`;
      case LengthUnit.METER:
        return `${formatDecimal(centimeters * f32(0.01), 2, 3)} ${this.unitName}`;
      case LengthUnit.INCH:
        return this.formatInchFraction(f32(centimeters), true);
      case LengthUnit.INCH_FRACTION:
        return this.formatInchFraction(f32(centimeters), false);
      case LengthUnit.INCH_DECIMALS:
        return `${formatDecimal(LengthUnit.centimeterToInch(centimeters), 0, 3)}\u0022`;
      case LengthUnit.FOOT_DECIMALS:
        return `${formatDecimal(LengthUnit.centimeterToFoot(centimeters), 0, 3)}`;
      default:
        return String(centimeters);
    }
  }

  /** Formats feet + inch fractions like `8'2¾"`; footInch=true for the INCH unit. */
  private formatInchFraction(centimeters: number, footInch: boolean): string {
    const absoluteValue = LengthUnit.centimeterToInch(Math.abs(centimeters));
    // Direct transcription of the Java InchFractionFormat logic.
    let feetOut = Math.floor(absoluteValue / 12);
    let remaining = absoluteValue - feetOut * 12;
    if (remaining >= 11.9375) {
      feetOut++;
      remaining -= 12;
    }
    let result = "";
    if (remaining >= 0.0005) {
      const integerPart = Math.floor(remaining);
      const fractionPart = remaining - integerPart;
      const eighth = Math.round(fractionPart * 8);
      if (eighth === 0 || eighth === 8) {
        const wholeInches = Math.round(remaining * 8) / 8;
        if (footInch) {
          result = `${formatDecimal(feetOut, 0, 0, false)}\u0027${wholeInches}\u0022`;
        } else {
          result = `${formatDecimal(feetOut * 12 + wholeInches, 0, 0)}\u0022`;
        }
      } else {
        if (footInch) {
          result = `${formatDecimal(feetOut, 0, 0, false)}\u0027${integerPart}${INCH_FRACTION_CHARACTERS[eighth - 1]}\u0022`;
        } else {
          result = `${formatDecimal(feetOut * 12 + integerPart, 0, 0)}${INCH_FRACTION_CHARACTERS[eighth - 1]}\u0022`;
        }
      }
    } else {
      if (footInch) {
        result = `${formatDecimal(feetOut, 0, 0, false)}\u0027`;
      } else {
        result = `${formatDecimal(feetOut * 12, 0, 0)}\u0022`;
      }
    }
    if (centimeters < 0 && result.length > 0) {
      result = `-${result}`;
    }
    return result;
  }
}

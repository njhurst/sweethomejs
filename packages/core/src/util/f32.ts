/*
 * f32.ts
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
 * Float32 narrowing helpers.
 *
 * Java model fields are `float` (24-bit mantissa); TypeScript `number` is a
 * double. Anywhere Java would narrow a value to float, we apply `f32()` so
 * geometry, serialization and rendering stay bit-compatible with the Java
 * implementation. See docs/05-file-format.md §2 (floating point policy).
 *
 * Transcribed from Sweet Home 3D (GPL v2+), which relies on Java's implicit
 * float narrowing in model setters and geometry helpers.
 */
export function f32(value: number): number {
  return Math.fround(value);
}

const FLOAT_RE = /^(-?)(\d+)(?:\.(\d+))?([eE][+-]?\d+)?$/;

/**
 * Java `Float.toString`-style formatting: the shortest decimal string that
 * round-trips to the same float32 value. `String(number)` is not sufficient
 * because JS prints doubles; e.g. `Math.fround(0.1)` prints as
 * `0.10000000149011612` in JS but Java prints `0.1`.
 *
 * This implementation finds the shortest decimal (fraction-digit-wise) that
 * `parseFloat` + `f32` maps back to the same float32. It produces the same
 * result as Java for the common cases (values with a fractional part in the
 * same magnitude). Exact parity for the full range — including scientific
 * notation thresholds and exponent formatting (`1.0E21` vs `1e+21`) — is the
 * job of task 1.8 (float-formatting spike), which verifies against a large
 * corpus of Java `Float.toString` output.
 */
export function formatFloat(value: number): string {
  const f = f32(value);
  const plain = String(f);
  if (Number.isNaN(f) || f === Number.POSITIVE_INFINITY || f === Number.NEGATIVE_INFINITY) {
    return plain;
  }
  if (Object.is(f, -0)) {
    return "-0"; // Java prints "-0.0"
  }
  const match = FLOAT_RE.exec(plain);
  if (!match) {
    return plain;
  }
  const [, sign, intPart, fracPartRaw, exp] = match;
  const fracPart = fracPartRaw ?? "";
  if (fracPart.length === 0) {
    return plain; // already an integer
  }
  // Try shortest fractional lengths first; return the first that round-trips.
  for (let keep = 0; keep <= fracPart.length; keep++) {
    const candidate =
      keep === 0
        ? `${sign}${intPart}${exp ?? ""}`
        : `${sign}${intPart}.${fracPart.slice(0, keep)}${exp ?? ""}`;
    if (f32(Number.parseFloat(candidate)) === f) {
      return candidate;
    }
  }
  return plain;
}

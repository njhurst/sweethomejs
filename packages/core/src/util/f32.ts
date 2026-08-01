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

const F32_VIEW = new DataView(new ArrayBuffer(4));

function float32Bits(value: number): number {
  F32_VIEW.setFloat32(0, value, false);
  return F32_VIEW.getUint32(0, false);
}

/**
 * Java `Float.toString` equivalent:
 *   - shortest decimal that round-trips to the same float32
 *   - scientific notation (`1.0E10`, `1.23456E-4`) when the decimal exponent
 *     is < -3 or >= 7, else decimal form
 *   - integers always carry `.0` (`250.0`); `-0.0` for negative zero;
 *     `NaN` / `Infinity` / `-Infinity`
 *
 * Note: the JDK's own implementation has a known quirk (JDK-4511638) that
 * occasionally emits a one-digit-longer representation (e.g. `1.4E-45` for
 * MIN_VALUE instead of `1.0E-45`). This implementation produces the
 * mathematically shortest form, which guarantees the same *value* after
 * parsing; byte-level parity with the JDK holds for the common cases
 * (documented in KNOWN_DIFFS.md).
 */
export function formatFloat(value: number): string {
  const f = f32(value);
  if (Number.isNaN(f)) return "NaN";
  if (f === Number.POSITIVE_INFINITY) return "Infinity";
  if (f === Number.NEGATIVE_INFINITY) return "-Infinity";
  if (Object.is(f, -0)) return "-0.0";
  if (f === 0) return "0.0";

  const negative = f < 0;
  const abs = Math.abs(f);
  const { digits, exp10 } = shortestDigits(abs);
  return formatDigits(digits, exp10, negative);
}

/**
 * Finds the shortest decimal (as significant digits + decimal exponent) that
 * round-trips to the given positive float32 `f`.
 *
 * The rounding interval [lo, hi) is exact in doubles (float32 mantissas are
 * 24 bits; half-ULPs add at most one bit). We then search the decimal grids
 * for each digit count k = 1..9, verifying every candidate by an actual
 * parseFloat + fround round-trip so grid arithmetic errors cannot slip in.
 */
function shortestDigits(f: number): { digits: string; exp10: number } {
  const bits = float32Bits(f);
  const expField = (bits >>> 23) & 0xff;
  const ulp = expField === 0 ? 2 ** -149 : 2 ** (expField - 150);
  const lo = f - ulp / 2;
  const hi = f + ulp / 2;

  const loExp = Math.floor(Math.log10(lo));
  const hiExp = Math.floor(Math.log10(hi));
  for (let k = 1; k <= 9; k++) {
    const kMin = 10 ** (k - 1);
    const kMax = 10 ** k - 1;
    let best: { n: number; p: number; dist: number } | null = null;
    for (let p = loExp - k + 1; p <= hiExp - k + 1; p++) {
      const pow = 10 ** p;
      const nLo = Math.max(Math.ceil(lo / pow), kMin);
      const nHi = Math.min(Math.floor(hi / pow), kMax);
      if (nLo > nHi) {
        continue;
      }
      // Candidates: interval endpoints + nearest to f, each with ±1 neighbors
      // (guards against double-precision grid error).
      const candidates = new Set<number>();
      for (const c of [nLo, nHi, Math.round(f / pow)]) {
        for (let d = -1; d <= 1; d++) {
          candidates.add(c + d);
        }
      }
      for (const n of candidates) {
        if (n < nLo || n > nHi) {
          continue;
        }
        const digits = String(n);
        const exp10 = p + digits.length - 1;
        const formatted = formatDigits(digits, exp10, false);
        if (f32(Number.parseFloat(formatted)) === f) {
          const dist = Math.abs(n * pow - f);
          if (best === null || dist < best.dist) {
            best = { n, p, dist };
          }
        }
      }
    }
    if (best !== null) {
      const digits = String(best.n);
      return { digits, exp10: best.p + digits.length - 1 };
    }
  }
  throw new Error(`no shortest float32 representation for ${f}`);
}

function formatDigits(digits: string, exp10: number, negative: boolean): string {
  if (exp10 < -3 || exp10 >= 7) {
    const mantissa =
      digits.length === 1 ? `${digits}.0` : `${digits[0]}.${digits.slice(1)}`;
    return `${negative ? "-" : ""}${mantissa}E${exp10}`;
  }
  let out: string;
  if (exp10 >= 0) {
    const intLen = exp10 + 1;
    const intPart = digits.length >= intLen ? digits.slice(0, intLen) : digits.padEnd(intLen, "0");
    const fracPart = digits.slice(intLen) || "0";
    out = `${intPart}.${fracPart}`;
  } else {
    out = `0.${"0".repeat(-exp10 - 1)}${digits}`;
  }
  return negative ? `-${out}` : out;
}

import java.io.PrintWriter;
import java.util.Random;

/**
 * FloatCorpus — generates a golden corpus of Java Float.toString output
 * (task 1.8). Each line: "<floatBitsHex> <Float.toString(f)>" where
 * floatBitsHex is the IEEE-754 bit pattern as unsigned hex.
 *
 * The corpus drives the TypeScript formatFloat() implementation, which must
 * reproduce Java's output exactly (shortest decimal that round-trips to the
 * same float32, with Java's scientific/decimal formatting rules).
 *
 * Usage: java FloatCorpus <outputFile> [--full]
 *   --full enumerates every 2^16-th bit pattern (~65k lines); default samples
 *   1M random bit patterns + a hand-picked set of edge cases.
 */
public class FloatCorpus {
  public static void main(String[] args) throws Exception {
    boolean full = args.length > 1 && "--full".equals(args[1]);
    PrintWriter out = new PrintWriter(args[0], "UTF-8");

    // Hand-picked edge cases
    float[] edgeCases = {
        0f, -0f, 1f, -1f, 0.5f, -0.5f, 0.1f, 0.2f, 1e-3f, 1e-4f, 1e-5f, 1e-6f,
        1e-7f, 1e8f, 1e9f, 1e10f, 1e20f, 1e21f, 1e38f, 3.4028235E38f, 1.4E-45f,
        Float.MIN_VALUE, Float.MAX_VALUE, Float.MIN_NORMAL, Float.NaN,
        Float.POSITIVE_INFINITY, Float.NEGATIVE_INFINITY,
        250f, 3.1415927f, -12.34f, 1000.1f, 123456.78f, 0.000123456f,
        Float.intBitsToFloat(0x00000001), Float.intBitsToFloat(0x007FFFFF),
        Float.intBitsToFloat(0x00800000), Float.intBitsToFloat(0xFF800000),
        Float.intBitsToFloat(0x7F800001) /* NaN */,
    };
    for (float f : edgeCases) {
      write(out, f);
    }

    if (full) {
      // Every 2^16-th bit pattern (~65k lines) — covers all exponent ranges
      for (int i = 0; i < (1 << 16); i++) {
        write(out, Float.intBitsToFloat(i << 16));
      }
    } else {
      // 1M random bit patterns
      Random random = new Random(20260802);
      for (int i = 0; i < 1_000_000; i++) {
        write(out, Float.intBitsToFloat(random.nextInt()));
      }
    }
    out.close();
    System.out.println("Wrote " + args[0]);
  }

  private static void write(PrintWriter out, float f) {
    int bits = Float.floatToIntBits(f);
    out.printf("%08x %s%n", bits, Float.toString(f));
  }
}

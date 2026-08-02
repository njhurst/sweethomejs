# KNOWN_DIFFS — intentional divergences from the Java app

Every divergence here is deliberate and documented. Anything not listed here
is expected to match the Java behavior exactly.

## 1. Float formatting: shortest round-trip vs JDK `Float.toString`

**Status: accepted, semantic parity guaranteed.**

`packages/core/src/util/f32.ts` `formatFloat()` emits the *mathematically
shortest* decimal that round-trips to the same float32. The JDK's
`Float.toString` has a documented quirk (JDK-4511638) that sometimes emits a
one-digit-longer representation, e.g.:

| value | JDK `Float.toString` | SweetHomeJS |
|---|---|---|
| `Float.MIN_VALUE` (bit `0x00000001`) | `1.4E-45` | `1.0E-45` |
| `Float.MIN_NORMAL` (bit `0x00800000`) | `1.17549435E-38` | `1.1754944E-38` |

Both strings parse back to the **same float32** via `Float.parseFloat`
(verified across a 1M+ value corpus: 100% round-trip parity). Since the Java
app parses XML float attributes with `Float.parseFloat`, our `.sh3d` files are
fully compatible — the value after a Java round-trip is bit-identical. Byte
parity of the XML is a diff-tool nicety, not a compatibility requirement.

**Why we keep ours:** it is the mathematically correct shortest form, it is
deterministic, and it avoids reimplementing the JDK's ~500-line quirk-laden
`FloatingDecimal` algorithm.

## 2. 3D rendering look

**Status: pending (phase P5).** The 3D view maps Java3D fixed-function shading
to Three.js physically-based materials. Colors, textures and layout match;
lighting/shading are deliberately modernized (see docs/07-3d-view.md §3).
Golden tests use tolerance-based comparison.

## 3. Photo rendering output

**Status: pending (phase P7).** Photo output is rebuilt (Sunflow → Three.js
renderer, later a WebGPU path tracer). It is a creative output; perceptual
parity (SSIM/LPIPS) is the target, not pixel equality (docs/09-photo-video-print.md).

## 4. Font/text rasterization

**Status: pending (phase P4).** Plan text uses Canvas text metrics vs Java2D
font metrics; golden plan tests mask text regions (docs/12-testing-and-parity.md §3.4).

## Golden plan image (task 5.7)

- Our pipeline renders the ls_2819 plan with a **~19% pixel-diff ratio** vs the
  Java golden PNG (tolerance 35%). The delta is expected:
  - furniture top-view icons render as placeholders (3D icon rendering lands
    with render3d, P5);
  - text metrics differ (system fonts vs canvas/sans-serif);
  - the FreeHEP SVG export uses a different origin/margin mapping than our
    viewport (our preferred size is 752×666 vs the golden 1052×1253).
- Wall/room geometry is **vector-exact** (both sides derive from the same
  model points); the vector-geometry check asserts every wall produces a
  fill + outline path.

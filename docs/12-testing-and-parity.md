# 12 — Testing and Parity Strategy

Parity with the Java app is the project's quality bar. This doc defines the
test architecture: **unit tests** (ported upstream tests), **parity tests**
(golden fixtures compared against Java-produced outputs), **round-trip tests**
(file format), **property-based tests**, and **e2e/visual tests**.

## 1. Test pyramid

```
                ┌──────────────────────────┐
                │  e2e (Playwright)        │  few: user flows
                ├──────────────────────────┤
                │  visual/golden           │  plan + 3D screenshots vs Java
                ├──────────────────────────┤
                │  parity (fixture-driven) │  file format, model dump, camera math
                ├──────────────────────────┤
                │  unit (Vitest)           │  many: ported upstream tests
                └──────────────────────────┘
```

- Unit + parity run in Node (`core` has no DOM deps).
- Visual tests run in Chromium (Playwright) with a reference-image store.
- All gated in CI.

## 2. The golden corpus

**Capture from the Java app** (a scripted harness we write, run on a machine
with Java): generate `.sh3d` fixtures covering every feature:

| Fixture family                  | Content                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `empty.sh3d`                    | blank home                                                                                        |
| `walls.sh3d`                    | straight, curved (arc), connected, different heights, baseboards, wall-start/end attachments      |
| `rooms.sh3d`                    | simple, concave, multi-level, textured floors, custom colors                                      |
| `furniture.sh3d`                | every catalog item, rotated/mirrored/resized, groups, doors/windows in walls, lights, shelf units |
| `levels.sh3d`                   | multi-level homes, per-level backgrounds                                                          |
| `dimensions-labels.sh3d`        | dimension lines (all styles), labels, polylines (all dash/cap/arrow styles)                       |
| `cameras.sh3d`                  | observer/top/stored cameras, camera paths                                                         |
| `environment.sh3d`              | sky/ground textures, drawing modes, day/night, compass at various coords                          |
| `legacy-serialized.sh3d`        | homes saved _without_ XML entry (serialized `Home` only), produced by older versions too          |
| `big.sh3d`                      | 1,000+ furniture items (perf + instancing)                                                        |
| `damaged.sh3d`                  | missing content entry, truncated, wrong digest (repair flow)                                      |
| `imported-libraries.sh3f/.sh3t` | sample library bundles                                                                            |

For each fixture, the Java harness also emits:

1. **Field dump JSON** — a full reflection-based dump of the `Home` object
   graph (every getter, every list, ordered) — the parity oracle for our
   model layer.
2. **Plan render PNG** at fixed scale/viewport (deterministic rendering:
   fixed icon state, no live previews).
3. **3D render PNG** at fixed cameras (plus camera positions JSON).
4. **Photo render PNG** (Sunflow, LOW quality, fixed seed) — reference for
   perceptual comparison only.
5. **Home.xml bytes** — byte-level reference for our writer.
6. **Printed PDF/SVG** — reference outputs.

All stored in `test/fixtures/` (git-lfs if large).

## 3. Parity test definitions

### 3.1 Model parity (field dumps)

```
fixture.sh3d → [Java harness] → home-dump.json
fixture.sh3d → [our reader]   → home-dump.json (same dump format, TS)
→ deep-diff (numeric tolerance: 0 for floats after fround; exact for ids)
```

This catches every field/parse discrepancy. Run for all fixtures. Also the
reverse: our writer → Java reader → dump; must equal.

### 3.2 XML byte parity

- `our writer(home)` vs `Java writer(home)`: compare parsed XML trees
  (attribute order is deterministic in Java's `XMLWriter`; we match it), then
  byte-compare where feasible. Float formatting parity per
  [05-file-format.md](05-file-format.md#2-floating-point-policy) is the risk —
  covered by unit tests over a float corpus (see below).

### 3.3 Round-trip identity

For every fixture: `home' = read(write(read(fixture)))`; assert `home' ==
read(fixture)` (modulo fround). And `write(home') == write(home)` byte-equal.

### 3.4 Plan golden images

- Our plan renderer, same fixture + same viewport/scale → PNG; pixel-diff
  against Java's PNG with **exact match on vector elements** (lines, fills)
  and tolerance on text antialiasing/font rendering (different rasterizers).
  Use a diff mask for known-tolerated regions.
- Fonts: pin the same font stack (e.g., load the same family the Java app
  uses for plan text; Java uses default `Dialog` — use a metric-compatible
  font, document divergence in a `KNOWN_DIFFS.md`).

### 3.5 3D golden images (tolerance)

- Same camera → screenshot; compare with perceptual metric (e.g., SSIM/deltaE
  histograms) since lighting/shading differs by design
  ([07-3d-view.md](07-3d-view.md#3-material--texture-parity)). Thresholds
  per fixture; regressions flagged by _relative_ change vs. the stored
  baseline more than by absolute Java match.

### 3.6 Photo perceptual parity

- Compare our photo output vs Sunflow reference with a perceptual metric
  (e.g., LPIPS or simple SSIM); goal is "same scene reads the same", not
  pixel equality. Quality of improvement tracked as a chart (this is a
  creative output, see [09-photo-video-print.md](09-photo-video-print.md)).

## 4. Ported upstream unit tests

Upstream `test/com/eteks/sweethome3d/junit/` includes:

- `RoomTest`, `HomeCameraTest`, `ModelManagerTest`, `OBJWriterTest`
- `PlanControllerTest`, `PlanComponentTest`, `PlanComponentWithFurnitureTest`
  (simulated mouse events — port with a synthetic event dispatcher + mock view)
- `WallPanelTest`, `FurnitureTableTest`, `HomeFurniturePanelTest`,
  `UserPreferencesPanelTest`, wizards tests, `BackgroundImageWizardTest`,
  `ImportedTextureWizardTest`, `TransferHandlerTest`, `HomeControllerTest`
- `PackageDependenciesTest` — asserts package dependency rules; port to
  enforce our module boundaries (e.g., `core` must not import `ui`).

Port all of them; they are the fastest path to confidence in the
controller layer. `TestUtilities` provides home-building helpers — port too.

## 5. Property-based tests (fast-check)

Where Java tests are spot-checks, property tests widen coverage:

- **Wall geometry**: random wall segments (positions, arcs, thicknesses,
  wall-at-start/end) → `getPoints()` polygons are valid (closed, no
  self-intersection within tolerance), area ≈ expected.
- **Room point-in-polygon**: random polygons/points vs a reference winding
  implementation.
- **LengthUnit formatting**: random values ↔ parse-back consistency.
- **Float formatting**: random float32 values → `formatFloat` → parse →
  identical float32 (matches Java `Float.toString` property).
- **XML writer escaping**: random strings → well-formed XML round-trip.
- **Level ordering**: random elevations → sorted with stable index.

## 6. E2E (Playwright)

Flows (post-P7):

1. Open app → create wall → draw room → drop furniture → save → reopen → assert.
2. Open a golden fixture → plan renders (screenshot compare) → 3D renders.
3. Import library `.sh3f` → catalog updates → drop model → renders.
4. Photo render a camera → progress → image produced.
5. Video export a short path → file produced, duration ≈ expected.
6. Preferences persist across reload.
7. Autosave/recovery: force reload mid-edit → recovery prompt → recover.
8. i18n: switch language → UI strings change.

## 7. Performance budgets (CI-tracked)

| Operation                                     | Budget (M1 MacBook-class, Chrome) |
| --------------------------------------------- | --------------------------------- |
| Open 50 MB `.sh3d` (parse XML + lazy content) | < 3 s to editable plan            |
| Plan repaint (1,000 items, no model change)   | < 16 ms                           |
| 3D first frame for 500 furniture              | < 2 s incl. model load            |
| Furniture icon generation (top view)          | < 5 s for 100 items (worker)      |
| Photo render (640×480, LOW)                   | < 60 s (v1 target)                |
| Video 5 s @ 720p                              | < 2× realtime                     |

Track in CI with `lighthouse`-style checks + perf traces on the `big.sh3d`
fixture.

## 8. CI layout

- **Job 1** — lint/typecheck/unit (core, fast).
- **Job 2** — parity: fixtures round-trip + dumps + float corpus.
- **Job 3** — golden images (Chromium, `--update-goldens` mode for PRs).
- **Job 4** — e2e flows + perf budgets.
- **Job 5** — coverage gate (model/io ≥ 90%; controllers ≥ 70%).
- **Job 6** — dependency-boundary test (package deps like upstream's
  `PackageDependenciesTest`).

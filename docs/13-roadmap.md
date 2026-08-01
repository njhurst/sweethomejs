# 13 — Roadmap, Milestones, and Risks

## 1. Phase plan

Phases map to the gates defined in [03-porting-strategy.md](03-porting-strategy.md#3-translation-order-and-gates).
Estimates assume a small team (2–3 devs) with one person deeply familiar with
the Java codebase.

### P0 — Foundations (weeks 1–3)

- Repo scaffold (monorepo, Vite, tsup, Vitest, Playwright, CI).
- Golden corpus capture tooling (Java harness) + fixture library.
- Spikes:
  - **CheerpJ spike** (2–3 days): run the actual Java app in-browser to (a)
    prove the product concept early, (b) generate golden images from the real
    app inside CI, (c) sanity-check tricky interactions. *Not the product
    path*, just a test oracle + demo.
  - **float formatting** spike: confirm `formatFloat` approach matches Java
    across a large corpus (drive [05-file-format.md](05-file-format.md) policy).
  - **Java serialization reader** spike: deserialize a legacy `Home` entry,
    prove feasibility on 3 old files.
- `geom` shim (awt.geom ports) with tests.

### P1 — Model (weeks 4–9)

- Port all 64 model classes (scaffold script + hand port).
- Event system (`PropertyChangeSupport`/`CollectionChangeSupport`).
- `LengthUnit` + formatting parity tests.
- Model replay + field-dump parity harness; port upstream model tests.
- **Gate**: model parity green on the corpus.

### P2 — File format (weeks 8–12, overlaps P1 tail)

- fflate zip layer + `Home.xml` reader (`HomeXMLHandler` port) + writer
  (`HomeXMLExporter` + `XMLWriter` port).
- Legacy serialized-`Home` deserializer.
- Catalog codec (`.sh3f`/`.sh3t`), `ContentDigestManager`.
- Round-trip + XML byte parity tests.
- **Gate**: Java-written files open; our files reopen in Java 7.5 identically.

### P3 — Controllers (weeks 12–20)

- Port `FurnitureController`, `HomeController`, `HomeController3D`,
  `UserPreferencesController`, dialog controllers, wizards.
- Port `PlanController` last (largest): states, tools, undo/redo, plan view
  interface.
- Port upstream controller tests (`PlanControllerTest` etc.).
- **Gate**: headless controller suite green against a mock view.

### P4 — 2D plan view (weeks 16–24, overlaps P3)

- `PlanPainter` abstraction + Canvas implementation + SVG implementation.
- Viewport/transform, paint-order pipeline, input translation, tool feedback,
  magnetic cursor, editable-property fields, rulers, grid, background image,
  levels.
- Furniture icon pipeline (placeholder → offscreen 3D icon).
- **Gate**: golden plan images match Java within tolerance.

### P5 — 3D view (weeks 20–28)

- Three.js scene builders (`Object3D` family), camera math, lighting, day/
  night, selection styles, drawing modes.
- ModelManager async loading (workers) + texture manager.
- Navigation panel, offscreen icons, instancing.
- **Gate**: tolerance-based 3D screenshots; 500-furniture perf budget.

### P6 — UI shell & dialogs (weeks 22–30)

- React `HomePane`: menus, toolbars, furniture table, furniture properties,
  catalog panel, status bar, dialogs (wall/room/compass/preferences/photo/
  video…), wizards.
- i18n pipeline (all locales), help static export.
- File open/save (FS Access + fallback), autosave/recovery, IndexedDB.
- **Gate**: e2e create→save→reopen flow; locale switch works.

### P7 — Photo / video / print (weeks 28–38)

- Photo: scene intermediate, Three.js photo renderer (v1), progressive
  display, quality presets, cancel. WebGPU path tracer as v2 (stretch).
- Video: camera path interpolation, WebCodecs/MediaRecorder pipeline.
- Print preview + PDF (vector via pdf-lib) + SVG export + CSV.
- **Gate**: photo perceptual tests; PDF/SVG open in Java-adjacent tools.

### P8 — Polish & ship (weeks 38–44)

- PWA/offline, cloud sync (v1: document store), touch support audit,
  performance tuning, a11y pass, app icon/branding, docs for users.
- **Gate**: acceptance suite on target browsers (Chrome, Firefox, Safari,
  Edge) + mobile.

## 2. Milestone summary

| # | Milestone | Deliverable | ~When |
|---|---|---|---|
| M1 | Codec | Open/save `.sh3d` (both entries) with round-trip parity | end of P2 |
| M2 | Model | Model parity green | end of P1 |
| M3 | Plan editor | Golden plan parity + headless controller tests | end of P4 |
| M4 | 3D | 3D view parity + perf | end of P5 |
| M5 | App shell | Full UI, e2e flows | end of P6 |
| M6 | Creative output | Photo/video/PDF/SVG | end of P7 |
| M7 | Release | PWA v1 live | end of P8 |

## 3. Effort estimate (rough, person-weeks)

| Area | Effort |
|---|---|
| Tooling + corpus + shims | 6–8 pw |
| Model port | 8–10 pw |
| File format (incl. legacy deserializer) | 6–8 pw |
| Controllers (PlanController dominant) | 12–16 pw |
| 2D plan view | 10–14 pw |
| 3D view | 8–12 pw |
| UI shell + dialogs + i18n | 10–14 pw |
| Photo/video/print | 10–16 pw |
| Polish, PWA, cloud, mobile, a11y | 6–10 pw |
| **Total** | **≈ 76–108 pw** (≈ 9–14 months, 2–3 devs) |

PlanController alone is ~15% of total. The photo renderer is the widest
estimate band — de-risk it early with the v1 Three.js renderer and only invest
in the path tracer once user feedback confirms it matters.

## 4. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **PlanController complexity** (interaction edge cases, invisible behaviors) | high | high | Port upstream tests first; keep Java app + CheerpJ as oracle; feature-flag rollouts; golden image tests on interaction states |
| **Float/format parity breaks files** | medium | high | float32 policy + formatFloat corpus tests; round-trip gate in CI |
| **Legacy serialized `Home` format surprises** (old applet files, exotic classes) | medium | high | Spike early; corpus of old files; degrade gracefully (damaged-home flow) instead of failing |
| **Photo renderer quality gap vs Sunflow** | high (if chasing exact parity) | medium | Explicit non-goal: creative output; perceptual tests; WebGPU path tracer as differentiator |
| **`Area`/geometry boolean-op differences** | medium | medium | Port winding tests; keep `polygon-clipping` behind `geom` interface; fall back to exact port if mismatches |
| **Font/text rasterization differences** | medium | low | Pin fonts, mask text regions in goldens, document in KNOWN_DIFFS.md |
| **Browser API fragmentation** (FS Access, WebCodecs, worker WebGL) | medium | medium | Feature detection + fallbacks everywhere; support matrix in CI (Chromium/Firefox/Safari/WebKit) |
| **3D line-width / text rendering limits** | low–medium | low | Screen-space line shaders; SDF text |
| **GPL compliance slip** | low | high | Header attribution on every translated file; legal review at M1; keep project GPL |
| **Scale/perf for huge homes** | medium | medium | Lazy content, instancing, culling, worker isolation; perf budgets in CI |
| **Scope creep (cloud/collab/plugins)** | medium | medium | Cut features ruthlessly; cloud sync is seam-only in v1 |

## 5. What to cut if behind

In priority order (cut from the *end* of the roadmap):

1. Cloud sync v1, plugin system v1
2. WebGPU path tracer (keep Three.js photo renderer)
3. Video export at >1080p / AV1
4. Legacy serialized-`Home` *writing* (reading stays)
5. Extra locales beyond top 8
6. Touch/tablet polish
7. Print vector PDF (raster fallback acceptable)

Never cut: file-format round-trip parity, model parity, plan golden parity —
they are the product's trust surface.

## 6. Immediate next steps

1. Extract & freeze the corpus capture harness spec (P0).
2. Run the CheerpJ spike and the float-format spike (P0) — both de-risk
   the whole plan in a week.
3. Scaffold the monorepo + `geom` shim.
4. Start the model port with `Home`, `Wall`, `HomePieceOfFurniture`,
   `LengthUnit` (the four highest-leverage classes).

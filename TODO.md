# SweetHomeJS TODO

> **→ START HERE: tell agents "read TODO.md header and follow the workflow."**
>
> **Workflow (do these in order):**
>
> 1. **Re-read this file** — another agent may have changed it.
> 2. **Pick an unclaimed task:** `[ ]` = available. `[.]` or `[@...]` = owned.
> 3. **Register your agent ID:** run `python todo.py register`. This generates a
>    unique `pi-XXXXXX` ID and adds you to AGENTS.md. Run it once per agent.
> 4. **Claim it:** `python todo.py claim <number> <your-id>`.
>    Tip: `[@]` (anonymous) works too if you edit manually, but discouraged.
> 5. **Start working:** `python todo.py start <number>`.
> 6. **When done:** `python todo.py done <number>`. Update AGENTS.md. Commit.
> 7. **Commit your work:** `git add -A && git commit -m "[N.N] description"`.
>    Reference the task number in the commit message. Pull before committing.
>    Commit after completing a task, adding tests, or reaching a stable point.
> 8. **Append new tasks** (never insert or reorder). Discovery → append.
> 9. **Make minimal single-task edits** — one status change per edit, one
>    task per commit (or batch small related changes).
>
> **Status legend:** `[ ]` todo &nbsp; `[.]` wip &nbsp; `[@ id]` claimed &nbsp; `[x]` done &nbsp; `[-]` dropped
>
> **Querying:** `python todo.py` (all), `todo.py next`, `todo.py claimed`,
> `todo.py claimed-by <id>`, `todo.py agents`, `todo.py <number>`.
>
> **Mutating:** `todo.py claim <n> <id>`, `todo.py start <n>`,
> `todo.py done <n>`, `todo.py drop <n>`. The tool validates state:
> you can't claim a claimed task, start unclaimed work, etc.
>
> **Numbering:** `major.minor.sub...` — subtask of `N` is `N.1`, `N.2`, etc.
> To find all items under `1.3`: grep for lines starting with `1.3.`
>
> **Format:** `[status] N[.N...]  Description` — exactly one space after `]`, two spaces before description.

---

## P0 — Foundations

[ ] 1  P0 Foundations: tooling, corpus, spikes, geometry shim
[x] 1.1  Scaffold monorepo: Vite, tsup, Vitest, Playwright, ESLint/Prettier, strict TS, CI jobs
[x] 1.2  Set up package layout (core/render2d/render3d/ui/photo/codecs/apps per 03-porting-strategy.md)
[x] 1.3  Add license/attribution header template for every translated file (GPL v2+, translator note)
[x] 1.4  Golden corpus: write Java harness to dump Home field-JSON, plan/3D/photo PNGs, Home.xml bytes, PDF/SVG from fixtures
[x] 1.5  Golden corpus: add examples/ls_2819.sh3d (+ its SVG/CSV/OBJ) as first fixture; capture its dumps and reference renders
[x] 1.6  Golden corpus: build feature-covering fixture homes (walls, rooms, furniture, levels, dims/labels, cameras, environment, damaged, big)
[-] 1.7  Spike: run real Java app in-browser (CheerpJ) as test oracle + demo; decide if viable for golden-image capture in CI
[x] 1.8  Spike: float32 formatFloat() helper matching Java Float.toString across a large float corpus (drives 05-file-format.md policy)
[x] 1.9  Spike: read a legacy serialized-Home entry with a TS Java-serialization reader on 3 old .sh3d files
[x] 1.10  Port awt.geom shim: Point2D, GeneralPath/PathIterator, Area (boolean ops), Line2D/Ellipse2D/CubicCurve2D/Rectangle2D, AffineTransform
[x] 1.11  geom shim tests: PathIterator segment outputs, Area ops on known polygons, transform math vs Java
[x] 1.12  Install f32() lint rule / codegen marker for float32 narrowing (model + io)

## P1 — Model layer

[ ] 2  P1 Model layer: port all 64 model classes to TS (04-model-layer.md)
[x] 2.1  Event system: PropertyChangeSupport, CollectionChangeSupport/Event/Listener (synchronous, JavaBeans semantics)
[x] 2.2  Port Home.java (document root, CURRENT_VERSION=7400, collections, selection, clone, ids, level ordering)
[x] 2.3  Port Wall.java (points/arcs, wall-at-start/end topology, baseboards) and Room.java (area, point-in-polygon)
[x] 2.4  Port HomePieceOfFurniture.java + HomeDoorOrWindow/HomeLight/HomeShelfUnit/HomeFurnitureGroup
[x] 2.5  Port HomeEnvironment, Camera/ObserverCamera/TopCamera, Compass (sun position math), HomePrint, HomeTexture/HomeMaterial
[x] 2.6  Port Polyline, DimensionLine, Label, Level, BackgroundImage, TextStyle, ObjectProperty, Sash, LightSource, Baseboard
[x] 2.7  Port LengthUnit.java + formatting parity tests vs Java (all units, edge values)
[x] 2.8  Port catalogs (FurnitureCatalog/Category, TexturesCatalog/Category, PatternsCatalog) + UserPreferences.java
[x] 2.9  Port model interfaces (Selectable, Content, PieceOfFurniture, Elevatable, Transformation) + exception hierarchy
[x] 2.10  Model replay harness: deserialize fixture homes, dump all fields as JSON, compare to Java field-dumps (fround tolerance)
[x] 2.11  Verify clone deep-copy semantics and id-generation parity vs Java
[x] 2.12  Port upstream model tests: RoomTest, HomeCameraTest, TestUtilities, event-semantics tests

## P2 — File format codecs

[x] 3  P2 File format: .sh3d read/write with round-trip parity (05-file-format.md)
[x] 3.1  Zip layer with fflate: read/write Home.xml + content entries; lazy content resolution by entry name
[x] 3.2  HomeXMLHandler port (reader): all elements/attributes per 05-file-format.md §1.1, tolerant of unknown attrs
[x] 3.3  XMLWriter + HomeXMLExporter port (writer): canonical ordering, escaping, float formatting, content-name traversal order
[x] 3.4  Legacy Java-serialized Home deserializer (TC_* tags, class descriptors, back-references; typed per serialized class)
[x] 3.5  ContentDigestManager + ContentDigests manifest read/write + damaged-content repair flow
[x] 3.6  Catalog codec: read/write .sh3f furniture and .sh3t textures library bundles
[x] 3.7  HomeFileRecorder TS API: readHomeFromZip/Xml/Serialized, writeHome (XML-only v1), detect damaged files
[x] 3.8  Round-trip identity tests + Java↔JS cross-read field-dump parity + XML byte parity (incl. entry-name order)

## P3 — Controllers

[x] 4  P3 Controllers: port viewcontroller package (03/04 porting strategy)
[x] 4.1  Port View/ViewFactory/Controller/ContentManager interfaces + UndoSupport + LocalizedUndoableEdit
[x] 4.2  Port FurnitureController + HomeController (master controller, actions, menus)
[x] 4.3  Port HomeController3D + Object3DFactory seam + UserPreferencesController
[x] 4.4  Port dialog controllers: Wall, Room, Polyline, DimensionLine, Label, Compass, Level, Home3DAttributes, ObserverCamera
[x] 4.5  Port wizards: ImportedFurniture, ImportedTexture, BackgroundImage + ModelMaterials + BaseboardChoice + PageSetup + PrintPreview
[x] 4.6  Port PlanController: Mode/EditableProperty enums, SelectionState + selection/transform tools
[x] 4.7  Port PlanController: WallCreation, RoomCreation, PolylineCreation, DimensionLineCreation, LabelCreation states + tool feedback
[x] 4.8  Port PlanController: pan/zoom, magnetism, editable-property numeric entry, keyboard nudge, actions
[x] 4.9  Port upstream controller tests (PlanControllerTest, PlanComponentTest, PlanComponentWithFurnitureTest, HomeControllerTest) with mock view

## P4 — 2D plan view

[ ] 5  P4 2D plan view: PlanComponent → Canvas2D/SVG (06-2d-plan-view.md)
[x] 5.1  PlanPainter interface + Canvas2D implementation + SVG implementation
[x] 5.2  Viewport/transform module: scale, pan, zoom-at-point, HiDPI (devicePixelRatio), plan bounds + margin
[x] 5.3  Paint-order pipeline: background, grid, rulers, levels, rooms, walls, dims/labels/polylines, furniture, compass, scale bar
[x] 5.4  Furniture top-view icons: offscreen 3D render cache by model digest + placeholder fallback (mirror PieceOfFurnitureTopViewIcon)
[@ pi-ltkr51] 5.5  Input translation: Pointer/Keyboard events → PlanController; custom painted cursor; magnetism feedback
[ ] 5.6  Tool feedback: length/angle tooltips, editable-property fields (hidden input overlay), selection grips/alignment/duplication
[ ] 5.7  Golden plan image tests vs Java PNGs (vector-exact, text-tolerance; KNOWN_DIFFS.md registry)
[ ] 5.8  SVG export of the plan via PlanPainter (compare to examples/ls_2819.svg)

## P5 — 3D view

[ ] 6  P5 3D view: Java3D scene graph → Three.js (07-3d-view.md)
[ ] 6.1  Object3DBase + shared attribute caches (materials/textures/outlines keyed by value)
[ ] 6.2  Object3D builders: Wall, Room, Furniture, DimensionLine, Label, Polyline, Ground (+ baseboards, drawing modes)
[ ] 6.3  Camera math port + navigation (orbit/observer/top, stored cameras, go-to-point-of-view, elevation) + navigation panel
[ ] 6.4  Lighting: sun position from Compass, light color/power, day/night, shadows; selection outlines + blue selection boxes
[ ] 6.5  ModelManager port: async OBJ/DAE/3DS loading in worker, model cache + waiters, placeholder→loaded swap, unit normalization
[ ] 6.6  Offscreen top-view icon rendering pipeline (WebGL2 in worker where supported)
[ ] 6.7  Instancing optimization for large homes + culling
[ ] 6.8  Tolerance-based golden 3D screenshots vs Java at fixed cameras + perf budget (500 furniture)

## P6 — UI shell & dialogs

[ ] 7  P6 UI shell: React HomePane + dialogs (02/10 docs)
[ ] 7.1  React shell: menus, toolbars, split panes, status bar, dockable 3D view, theme
[ ] 7.2  Furniture catalog panel (tree, search, drag&drop to plan) + FurnitureTable (virtualized, sortable)
[ ] 7.3  Furniture properties panel + furniture/room/wall dialogs as React components bound to controllers
[ ] 7.4  Wizards UI: import furniture/texture, background image, model materials, baseboard choice
[ ] 7.5  i18n pipeline: .properties → JSON build step + Messages runtime with locale fallback chain; top-8 locales first
[ ] 7.6  Help: ship existing HTML help as static assets + in-app display; wire HELP actions
[ ] 7.7  File I/O: ContentManager web impl (File System Access + download fallback + drag&drop + URL param)
[ ] 7.8  Persistence: IndexedDB schema (preferences/documents/content/recovery), PreferencesStore, autosave + recovery dialog
[ ] 7.9  HomeStore interface + IndexedDB implementation (local documents; cloud later)
[ ] 7.10  e2e flows (Playwright): create→save→reopen, open fixture→plan/3D render, import library, preference persistence, recovery

## P7 — Photo / video / print

[ ] 8  P7 Photo/video/print (09-photo-video-print.md)
[ ] 8.1  PhotoRenderer interface + PhotoController port (cameras, quality presets, progressive display, cancel)
[ ] 8.2  Scene intermediate shared by 3D view and photo (meshes/materials/lights/camera)
[ ] 8.3  Photo renderer v1: Three.js-based (physical materials, env lighting, postprocessing) in a worker
[ ] 8.4  Photo renderer v2 (stretch): WebGPU path tracer fed by scene intermediate; WASM perf spike first
[ ] 8.5  Video: camera-path interpolation, WebCodecs/MediaRecorder encoding, format presets, progress/cancel
[ ] 8.6  Print preview + browser print at paper size/orientation/margins (HomePrint) + scale fitting
[ ] 8.7  PDF export via pdf-lib (vector plan) + font subsetting; compare with Java HomePDFPrinter output
[ ] 8.8  CSV export of furniture list (locale-aware delimiters; compare to examples/ls_2819.csv)
[ ] 8.9  Perceptual photo parity tests vs Sunflow references (SSIM/LPIPS, tolerance-based)

## P8 — Polish & ship

[ ] 9  P8 Polish & ship (11/12/13 docs)
[ ] 9.1  PWA: manifest, offline cache (app shell + default catalog + help), update flow, installability
[ ] 9.2  Worker topology finalization: codec/model/texture/icon/photo/video workers via Comlink + fallbacks
[ ] 9.3  Cloud sync (post-v1 seam): CloudHomeStore behind HomeStore; document-level share/sync
[ ] 9.4  Touch/tablet support audit + accessibility pass (ARIA, focus, keyboard nav)
[ ] 9.5  Performance tuning vs CI budgets (open 50MB <3s, plan repaint <16ms, 3D first frame <2s)
[ ] 9.6  Property-based tests (fast-check): wall geometry, room point-in-polygon, LengthUnit round-trip, XML escaping
[ ] 9.7  Package dependency boundary test (like upstream PackageDependenciesTest)
[ ] 9.8  Release: branding, user docs, support matrix (Chrome/Firefox/Safari/Edge + mobile), acceptance suite

## Cross-cutting

[ ] 10  Cross-cutting: dependency-boundary and codec parity maintained across all phases
[ ] 10.1  Keep TRANSLATION.md mapping Java class → TS file → status (audit trail for GPL attribution)
[ ] 10.2  Maintain fixture corpus + regenerate goldens after any rendering/format change
[ ] 10.3  Track KNOWN_DIFFS.md for intentional divergences (fonts, 3D shading, photo output)

## Decisions

- **1.7 dropped (CheerpJ spike)**: the native JVM golden-corpus harness
  (tools/java-harness, tasks 1.4–1.6) already provides the test oracle —
  field dumps, XML bytes, content and (to be added) Java2D plan renders —
  without a ~100MB in-browser Java toolchain. The TS app itself is the demo;
  CheerpJ adds complexity for no oracle or demo value. Revisit only if native
  Java2D plan rendering proves impossible in CI.

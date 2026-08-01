# 02 — Architecture: from Java Swing/Java3D to TypeScript

## 1. The upstream architecture

Sweet Home 3D is a textbook **MVC** application with a very deliberate seam:

```
              ┌────────────────────────────────────────────────────┐
              │  SweetHome3D.java / HomeFrameController / HomePane │  bootstrap + shell
              └───────────────┬────────────────────────────────────┘
                              │ creates
                              ▼
              ┌─────────────────────────────────────────────┐
              │ HomeController (master controller)           │
              │  owns: PlanController, HomeController3D,     │
              │        FurnitureController, dialogs, tools   │
              └──────┬───────────────────────────┬───────────┘
                     │                           │
          ┌──────────▼───────────┐   ┌───────────▼───────────┐
          │ View / ViewFactory   │   │ controllers talk to    │
          │ interfaces (seam)    │   │ model via listeners     │
          └──────────┬───────────┘   └───────────┬───────────┘
                     │                           │
      ┌──────────────▼──────────────┐   ┌────────▼──────────────┐
      │ swing package (concrete)    │   │ model package (POJOs) │
      │  PlanComponent (2D canvas)  │◄──┤  Home, Wall, Room,    │
      │  HomeComponent3D (Java3D)   │   │  HomePieceOfFurniture │
      │  HomePane, dialogs, tables  │   │  UserPreferences, ... │
      └──────────────┬──────────────┘   └────────┬──────────────┘
                     │                           │
              ┌──────▼──────┐            ┌───────▼───────┐
              │ j3d package │            │ io package    │
              │ (scene graph│            │ (.sh3d format)│
              │  renderers) │            └───────────────┘
              └─────────────┘
```

Key design properties that make the port tractable:

1. **Model is UI-free.** `model/` uses only `java.beans` (PropertyChange
   listeners), `java.io`, `java.text`, and — in a handful of classes
   (`HomeObject`, `Wall`, `Compass`, `Polyline`, `Label`) — `java.awt.geom`
   types for geometry (`Point2D`, `GeneralPath`, `Area`, `PathIterator`,
   `AffineTransform`, `Ellipse2D`, `CubicCurve2D`, `Line2D`, `Rectangle2D`).
   These have 1:1 JavaScript equivalents (see §4).
2. **Views are behind interfaces.** `viewcontroller/View.java`, `PlanView`,
   `View3D`, `HomeView`, `DialogView`, `FurnitureView`, and `ViewFactory`
   abstract every concrete widget. The `swing` package is *an implementation
   of ViewFactory*. Our web UI is another implementation. **The controllers
   should be ported nearly unchanged.**
3. **Events everywhere.** Controllers mutate the model; the model fires
   `PropertyChangeEvent`s / `CollectionEvent`s; views listen and repaint.
   This is a natural fit for an observer/state-store pattern in TS.
4. **State machines live in controllers.** `PlanController` is 15.9K lines of
   interaction state (`SelectionState`, `WallCreationState`,
   `RoomCreationState`, `PolylineCreationState`, `DimensionLineCreationState`,
   `LabelCreationState`, plus panning/zoom/furniture-placement) driven by
   mouse/keyboard events. This is the true "brain" of the plan editor.

### 1.1 Model package overview

- `Home` — the document root: furniture list, walls, rooms, polylines,
  dimension lines, labels, levels, cameras (observer/top/stored), environment,
  compass, print settings, background image, selection, undo metadata,
  `CURRENT_VERSION = 7400`.
- Items implement `Selectable` and derive from `HomeObject` (id, name,
  visibility, level binding, `clone()`).
- `HomePieceOfFurniture` / `HomeDoorOrWindow` / `HomeLight` / `HomeShelfUnit` /
  `HomeFurnitureGroup` — furniture with transform (x,y,z, yaw/pitch/roll),
  model `Content` (OBJ/DAE/3DS), materials, light sources.
- `Wall` — start/end points, arc extent, thickness, height, baseboards, wall
  start/end (wall connection points); `Wall.getPoints()` produces polygon
  outline via `GeneralPath`.
- `Room` — points, floor texture, area/surface color, floor/ceiling/trim colors,
  name label, level.
- `Polyline`, `DimensionLine`, `Label`, `Level`, `Compass`, `BackgroundImage`,
  `HomeEnvironment` (sky/ground colors, textures, lighting, drawing modes),
  `Camera`/`ObserverCamera`/`TopCamera`, `HomePrint`.
- `UserPreferences` — units (cm/m/feet/inch + formats), language, furniture
  catalogs, textures catalog, patterns, 3D attributes, recent files, keyboard
  shortcuts, i18n message bundles.
- `LengthUnit` — conversion + `Format` for every unit the app displays.
- `FurnitureCatalog`/`TexturesCatalog` (+ categories) — the library trees.
- `Content` interface — abstracts a model/texture blob: `SimpleURLContent`,
  `ResourceURLContent`, `TemporaryURLContent` (the io package implements them).
- Collections are Java `List`s; change events use `CollectionChangeSupport`
  (ADD/DELETE) and `PropertyChangeSupport` for field changes.

### 1.2 The viewcontroller package

- `Controller` / `View` / `ViewFactory` (the seam) / `ContentManager`
  (open/save dialogs) / `HomeController` (master) / `HomeController3D` /
  `PlanController` (the giant) / `FurnitureController` / `HomeFurnitureController`
  (properties panel) / dialogs: `WallController`, `RoomController`,
  `PolylineController`, `DimensionLineController`, `LabelController`,
  `CompassController`, `LevelController`, `Home3DAttributesController`,
  `ObserverCameraController`, `PhotosController`, `PhotoController`,
  `VideoController`, `ImportedFurnitureWizardController`,
  `ImportedTextureWizardController`, `BackgroundImageWizardController`,
  `ModelMaterialsController`, `BaseboardChoiceController`,
  `UserPreferencesController`, `PageSetupController`, `PrintPreviewController`,
  `HelpController`, `ThreadedTaskController`, wizards.
- `Object3DFactory` abstraction — lets a 3D view build scene objects from
  model items without depending on Java3D.
- Undo/redo via `LocalizedUndoableEdit` (Swing `UndoManager` equivalent).

### 1.3 The swing package (concrete views)

- `PlanComponent` — 7.1K lines of 2D canvas rendering + interaction.
  Renders walls, rooms, furniture (with imported-model footprint/3D-icon
  preview), labels, dim lines, polylines, levels, grid, rulers, compass,
  background image, selection feedback; implements `PlanView`.
- `HomeComponent3D` — 3.9K lines; Java3D `Canvas3D` + `BranchGroup` scene
  graph, cameras, navigation panel, offscreen image capture for icons.
- `HomePane` — the app shell: menu bar, toolbars, split panes, status bar.
- `FurnitureTable` — sortable table with all furniture columns.
- `HomeFurniturePanel` — furniture properties form (transform, name, materials).
- Wizards panels: import furniture/texture, background image.
- ~40 dialog panels (wall, room, compass, photo, video, preferences…).

### 1.4 The j3d package (Java3D scene graph)

- `Component3DManager` — canvas + `SimpleUniverse` management.
- `Object3DBranch` — abstract branch root per model item, with static
  attributes (outline/selection colors, materials cache, texture attributes).
- Concrete branches: `Wall3D`, `Room3D`, `HomePieceOfFurniture3D`,
  `DimensionLine3D`, `Label3D`, `Polyline3D`, `Ground3D` — each builds
  `Shape3D` children with `Geometry` (TriangleArray/QuadArray/LineArray),
  `Appearance` (`Material`, `Texture`, `PolygonAttributes`, ...).
- `ModelManager` — loads OBJ/DAE/3DS/LWS into branch graphs on a worker
  thread; caching; scaling to unit bounds; `ModelObserver` async callback.
- `OBJLoader` (2.0K), `DAELoader` (1.2K), `Max3DSLoader` (1.8K), `OBJWriter`,
  `OBJMaterial`, `ShapeTools` (extrude/transform helpers).
- `TextureManager` — texture image caching, sync loading.
- `AbstractPhotoRenderer`/`PhotoRenderer` — builds a Sunflow scene from the
  home and renders with the Sunflow raytracer (bucket rendering, light source
  plugins).
- `YafarayRenderer` — native renderer (out of scope).

### 1.5 The io package (file formats)

See [05-file-format.md](05-file-format.md) for the full format spec. Key
classes: `HomeFileRecorder` (.sh3d = ZIP), `DefaultHomeInputStream` /
`DefaultHomeOutputStream` (Java serialization of the `Home` entry),
`HomeXMLHandler` (SAX parser for `Home.xml`), `HomeXMLExporter` +
`XMLWriter` (writer), `ObjectXMLExporter` (catalog/furniture XML),
`XMLDecoder`-ish `ContentDigestManager`, `Base64`, `AutoRecoveryManager`
(crash recovery via temp files), `FileUserPreferences`, `DefaultFurnitureCatalog`,
`DefaultTexturesCatalog`.

## 2. The target architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (SPA, static hosting)                                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ React shell (HomePane equivalent)                          │  │
│  │  menus, toolbars, docks, dialogs, status bar               │  │
│  └───────┬────────────────────────────────────────────────────┘  │
│          │ binds to                                            │
│  ┌───────▼────────────────────────────────────────────────────┐  │
│  │ Controllers (ported from viewcontroller, TS)               │  │
│  │  PlanController, HomeController, wizards, tools, undo/redo │  │
│  └───────┬────────────────────────────────┬───────────────────┘  │
│          │ mutates                        │ listens             │
│  ┌───────▼──────────────────┐   ┌─────────▼───────────────────┐  │
│  │ Model (ported, TS)       │   │ Events (typed emitter)      │  │
│  │  Home, Wall, Room, ...   │◄──┤  propertyChange / collection│  │
│  └───────┬──────────────────┘   └─────────────────────────────┘  │
│          │                                                        │
│  ┌───────▼──────────┐  ┌───────────┐  ┌────────────────────────┐  │
│  │ 2D PlanView      │  │ 3D View   │  │ Photo / Video / Print  │  │
│  │ Canvas 2D or SVG │  │ Three.js  │  │ raytracer / MediaRecor-│  │
│  │ (ported Plan     │  │ (Java3D→  │  │ der / pdf-lib         │  │
│  │  component)      │  │  Three map)│  └────────────────────────┘  │
│  └───────┬──────────┘  └─────┬─────┘                               │
│          │                    │                                     │
│  ┌───────▼────────────────────▼──────────────────────────────────┐  │
│  │ Core services                                                │  │
│  │  .sh3d codec (fflate + XML)   model loaders (OBJ/DAE/3DS)    │  │
│  │  catalogs & content registry  preferences (IndexedDB)        │  │
│  │  File System Access API       undo/redo store                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Package mapping (Java → TS)

| Java package | TS module | Notes |
|---|---|---|
| `com.eteks.sweethome3d.model` | `src/model/` | 1:1 class port, events, geometry shims |
| `com.eteks.sweethome3d.viewcontroller` | `src/controllers/` | ported mostly verbatim; views are interfaces returning React/DOM components |
| `com.eteks.sweethome3d.swing` | split: `src/views/plan/`, `src/views/ui/` (React), `src/views/3d/` | `PlanComponent` → Canvas engine; `HomeComponent3D` → Three.js scene; dialogs → React components; `FurnitureTable` → virtualized table |
| `com.eteks.sweethome3d.j3d` | `src/render3d/` | `Object3DBranch` subclasses → `Object3D` builders producing Three.js objects |
| `com.eteks.sweethome3d.io` | `src/io/` | format codecs, catalog loaders, preferences |
| `com.eteks.sweethome3d.tools` | `src/util/` | URL/content helpers, OS checks dropped |
| `com.eteks.sweethome3d.plugin` | `src/plugins/` | web plugin API (separate design) |
| root bootstrap | `src/app/` | React root, DI container, workers |

### 2.2 Threading model

Java version: UI thread + model-loader executor + Sunflow render threads.
Web version:

- **Main thread**: UI + controllers + model (document is small: hundreds to a
  few thousand objects — no need for web workers on the model itself).
- **Worker(s)**: model loading (OBJ/DAE/3DS parsing), texture decode,
  photo rendering (path tracer), video encoding, zip read/write for large
  files. Use `Comlink` for ergonomics.
- The `ModelManager` async-observer pattern (`ModelObserver` + loading
  cache) translates directly to `await` + a load-cache map.

### 2.3 State management choice

Sweet Home 3D's model is *already* a mutable observable store with property
paths (`"wallHeight"`, `"furniture"`, `"selectedItems"`). Options:

1. **Port the JavaBeans pattern directly**: every model class has typed
   `Property` enums and an `EventDispatcher`; controllers mutate and views
   subscribe. Pros: 1:1 port, no impedance mismatch, undo/redo maps 1:1.
   Cons: not "React idiomatic".
2. **Redux/Zustand wrapper around the ported model**: keep (1) as the source
   of truth; sync a React-compatible snapshot. Cons: double bookkeeping.

**Decision: (1) as the core, with a thin `useSyncExternalStore`-style bridge
for React components.** The plan/3D canvases are imperative anyway (like the
Java views), so React is used for chrome (menus, panels, dialogs) while the
two big canvases are class-based renderers that subscribe to model events —
exactly mirroring `PlanComponent`/`HomeComponent3D`.

### 2.4 Rendering backends

| View | Java | Web |
|---|---|---|
| 2D plan | `java.awt.Graphics2D` on `JComponent` | `CanvasRenderingContext2D` (same immediate-mode model, same transform math) — **SVG only for export** |
| 3D | Java3D scene graph + JOGL | Three.js (see [07-3d-view.md](07-3d-view.md)) |
| Icons/previews | Java2D offscreen images | OffscreenCanvas |
| Photo | Sunflow (CPU raytracer) | Ported raytracer in WASM/worker or Three.js pathtracer |
| Video | JMF AVI frames | `canvas.captureStream()` + `MediaRecorder` (webm) or WebCodecs |
| Print/PDF | iText + Java2D | `pdf-lib` + Canvas/SVG vector draw; browser print dialog |
| SVG export | FreeHEP/Batik | `Path2D` → `<path>` + `XMLSerializer` |

### 2.5 Dependency graph (target)

- **No framework for the core**: core = pure TS, zero DOM deps, so it is
  testable in Node and reusable (e.g., headless CLI converter, future plugins).
- **UI layer**: React 18+ for chrome; no other heavyweight deps.
- **Rendering**: three (or raw WebGL wrapper); Canvas2D native.
- **Data**: fflate (zip), saxes or DOMParser (XML), idb (IndexedDB wrapper).
- **Math**: three's math for 3D; a small custom `geom` module for 2D
  (port of the few awt.geom classes used).
- **Workers**: comlink.
- **Build**: Vite + tsup (lib builds); Vitest for tests; Playwright for
  golden-image parity.
- **Formatting/lint**: Prettier + ESLint + strict TS.

## 3. What must be invented vs. ported

| Artifact | Approach |
|---|---|
| Model classes | Port 1:1 (they are mostly plain data + events) |
| Geometry code (wall polygons, room areas, intersections) | Port 1:1; replace awt.geom calls with shim module |
| PlanController state machines | Port 1:1; replace Swing `MouseEvent`/`KeyEvent` with DOM equivalents |
| PlanComponent drawing | Port: identical immediate-mode Canvas2D port; keep clipping/transform structure |
| Java3D branches | Port to Three.js object builders with a documented attribute map |
| OBJ/DAE/3DS parsers | Port; output Three.js-ready geometry instead of Java3D geometry |
| Sunflow | **Rebuild** — Sunflow is a full raytracer; transpiling Java→JS is impractical at that scale. Design a new path tracer in TS/WASM informed by Sunflow's architecture (buckets, GI, light plugins). See [09-photo-video-print.md](09-photo-video-print.md). |
| `.sh3d` codec | Reimplement from the XML schema + serialized-format docs; verify by round-trip against Java-produced files (golden corpus) |
| UI chrome | Rebuild as React (menus, dialogs) — the Java dialogs inform behavior, not markup |
| i18n | Port the `.properties` bundles (they are GPL data we already redistribute) into TS/JSON |

## 4. The awt.geom shim (critical enabler)

The model and plan code use these AWT geometry classes. JavaScript
equivalents:

| java.awt.geom | TS shim |
|---|---|
| `Point2D.Float`/`Double` | `{x: number, y: number}` or `Vector2` |
| `GeneralPath` | `Path2D` (custom impl wrapping `Path2D` DOM class; supports `moveTo/lineTo/quadTo/cubicTo/closePath`, `getPathIterator`) |
| `PathIterator` | custom iterator object (`currentSegment` returning segment type + coords) |
| `Area` (boolean ops) | `path2d-polygon-clipping` or `polygon-clipping` (Martinez algorithm); verify identical semantics for wall/room unions |
| `Line2D`, `Ellipse2D`, `CubicCurve2D`, `Rectangle2D` | small geometry classes (port math from AWT: `ptSegDist`, `intersectsLine`, flattening) |
| `AffineTransform` | `DOMMatrix` or a small matrix class (port `createInverse`, `transform`, `concatenate` used by plan) |
| `Shape` interface | `IShape` TS interface (getBounds2D, contains, intersects, getPathIterator) |

**Caution points:**
- `Area` boolean ops semantics must match Java2D's winding rules. `polygon-clipping`
  uses the Martinez algorithm with nonzero/evenodd support; test against Java
  `Area` on the same inputs in parity tests ([12-testing-and-parity.md](12-testing-and-parity.md)).
- Floating point: Java `float` vs JS `number` (double). The model uses `float`
  fields. To keep byte-identical serialized files and identical rendering, we
  should use **float32 semantics** (write values as float32 via
  `Math.fround` at serialization boundary and in key geometry) — see
  [05-file-format.md](05-file-format.md#floating-point-policy).
- `Collator` (text sorting, `java.text`) → `Intl.Collator`.
- `DecimalFormat` → `Intl.NumberFormat` (or port the formats used by
  `LengthUnit` precisely — plan display of dimensions must match).

## 5. Key architectural decisions summary

1. Core (model + controllers + io) is **framework-free pure TS**, unit-testable
   in Node.
2. UI chrome in **React**; plan and 3D views are **imperative canvas engines**
   (like the Java components) driven by model events.
3. Model events port the **JavaBeans property/collection event pattern** 1:1;
   React bridges via a `useSyncExternalStore` adapter.
4. `.sh3d` files: read both `Home.xml` (preferred) and legacy serialized
   `Home`; write `Home.xml` + content only.
5. **Float32 discipline** at the serialization boundary to keep file/rendering
   parity.
6. Workers for parsing, photo rendering, video encoding.
7. WASM only where native speed is required (photo renderer, big-file zip);
   prefer pure TS for maintainability.

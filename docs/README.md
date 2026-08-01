# SweetHomeJS — Porting Sweet Home 3D to the Web

Design documentation for porting [Sweet Home 3D](https://www.sweethome3d.com/) 7.5
(a Java desktop application) to TypeScript/JavaScript running in a modern browser.

The upstream source is extracted at `src/SweetHome3D-7.5-src/` (GPL v2+).
This directory contains the full port plan.

## Document index

| Doc | Scope |
|-----|-------|
| [01-overview.md](01-overview.md) | Goals, scope, what we are porting, license, source inventory |
| [02-architecture.md](02-architecture.md) | The Java codebase architecture (MVC, packages, dependencies) and the target web architecture |
| [03-porting-strategy.md](03-porting-strategy.md) | Incremental package-by-package strategy, build tooling, translation approach, coding conventions |
| [04-model-layer.md](04-model-layer.md) | Deep dive: porting the `model` package (entities, events, geometry, units) |
| [05-file-format.md](05-file-format.md) | The `.sh3d` file format (zip + serialized `Home` + `Home.xml`) and its TS reader/writer |
| [06-2d-plan-view.md](06-2d-plan-view.md) | Porting the 2D plan editor (`PlanComponent`/`PlanController`) to canvas/SVG |
| [07-3d-view.md](07-3d-view.md) | Porting the Java3D scene graph to Three.js (`HomeComponent3D`, `Object3DBranch` family) |
| [08-model-loaders.md](08-model-loaders.md) | Porting OBJ / DAE / 3DS / LWS model loaders and exporters |
| [09-photo-video-print.md](09-photo-video-print.md) | Photo rendering (Sunflow → raytracer), video export (JMF → MediaRecorder/WebCodecs), PDF/SVG export |
| [10-catalogs-and-content.md](10-catalogs-and-content.md) | Default furniture/texture catalogs, imported libraries, help, i18n |
| [11-web-platform-services.md](11-web-platform-services.md) | Browser APIs: File System Access, IndexedDB, Web Workers, WASM, PWA, cloud persistence |
| [12-testing-and-parity.md](12-testing-and-parity.md) | Unit tests, golden-image parity, file-format round-trips, property-based tests |
| [13-roadmap.md](13-roadmap.md) | Phased roadmap, milestones, effort estimates, risks and mitigations |

## TL;DR

- Sweet Home 3D is **cleanly separated MVC**: the `model` package (22.6K LOC,
  pure Java with `PropertyChange` events) is nearly UI-free; the `viewcontroller`
  package (41.5K LOC) holds controllers behind `View`/`ViewFactory` interfaces;
  the `swing` package (55.8K LOC) is the only AWT/Swing-dependent layer, and the
  `j3d` package (Java3D scene graph, ~15K LOC) is the only 3D-dependent layer.
- The port strategy is: **port the model 1:1 to TypeScript first**, then the
  file format (`.sh3d` reader/writer), then rebuild the 2D plan view on HTML5
  Canvas, then map the Java3D scene graph to Three.js, then the dialogs/tooling
  as a React/DOM UI. This matches the existing seams in the upstream code.
- The single hardest piece is not 3D — it is the **`PlanController` (15.9K LOC
  of interaction state machines)** plus the **photo renderer** (Sunflow, a
  Java raytracer that must be replaced or transpiled).
- The file format is the moat: `.sh3d` is a ZIP containing a Java-serialized
  `Home` object (legacy) plus a canonical `Home.xml` entry (preferred since 7.x)
  plus referenced binary content (models, textures). We can read/write it fully
  in the browser with `fflate` + a DOM/XML parser.
- The JavaBeans event model maps directly to TypeScript events; the
  `ViewFactory` seam maps directly to a React/`WebComponent` view factory.

## Working notes

- Source archive: `SweetHome3D-7.5-src.zip` (extracted under `src/`).
- Upstream is authored by Emmanuel Puybaret / Space Mushrooms, GPL v2+.
  Any derived code must remain GPL-compatible (or be a clean rewrite of the
  protected expression; the algorithms/schema are not copyrightable, but we
  should keep the project GPL to be safe — see [01-overview.md](01-overview.md#license)).

# 01 — Overview: Goals, Scope, and Source Inventory

## 1. Why port to the web

Sweet Home 3D is arguably the best open-source interior design tool. But:

1. **Java distribution is a tax.** Users must install a JRE; macOS and Windows
   gatekeeping around bundled runtimes keeps pushing this burden onto users.
2. **Installation friction.** The desktop app is a 100+ MB download per OS.
   A web app is a URL.
3. **Modern expectations.** Sharing a design should be a link, not a `.sh3d`
   file email. Collaboration, cloud sync, and mobile/tablet touch support are
   table stakes now.
4. **Java3D is aging.** The 3D layer depends on Java3D 1.6/JOGL — a legacy
   scene-graph API with native libraries. WebGL/WebGPU + Three.js is strictly
   more capable today (PBR, shadows, HDR, instancing).
5. **The HTML/JS ecosystem** has mature equivalents for every dependency
   (geometry, XML, zip, rendering, file I/O) which removes the "abandonware"
   risk of the Java stack.

**The goal:** a feature-compatible, browser-native reimplementation of Sweet
Home 3D 7.5 — same `.sh3d` files, same plan editor, same 3D view, same
photo/video/print outputs — delivered as a static web app that runs fully
client-side (no server required), with optional cloud sync.

## 2. What we are porting (source inventory)

Extracted source: `src/SweetHome3D-7.5-src/`.

### 2.1 Package census (242 Java files)

| Package                                                                                  | Files | LOC (approx) | Dependencies                                                          | Role                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ----- | ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `com.eteks.sweethome3d.model`                                                            | 64    | 22,650       | java.beans, java.awt.geom (only in a few classes), java.io, java.text | Pure data model: `Home`, furniture, walls, rooms, cameras, environments, catalogs, units                                                                                                                      |
| `com.eteks.sweethome3d.viewcontroller`                                                   | 49    | 41,530       | model, swing (via interfaces only)                                    | Controllers: `PlanController` (15.9K LOC!), `HomeController`, all tool/wizard/panel controllers; `View`, `ViewFactory` seams                                                                                  |
| `com.eteks.sweethome3d.swing`                                                            | 64    | 55,770       | AWT/Swing, model, viewcontroller, j3d                                 | Concrete views: `PlanComponent` (7.1K), `HomePane` (5.9K), `HomeComponent3D` (3.9K), `FurnitureTable` (3.1K), all dialogs                                                                                     |
| `com.eteks.sweethome3d.j3d`                                                              | 21    | ~15,000      | Java3D, vecmath, Sunflow                                              | 3D scene graph: `Object3DBranch` + subclasses (Wall3D, Room3D, furniture, labels, dim lines, polyline, ground), `ModelManager`, OBJ/DAE/3DS loaders, `PhotoRenderer` (Sunflow)                                |
| `com.eteks.sweethome3d.io`                                                               | 21    | ~11,000      | java.io, XML (SAX), model, tools                                      | File format: `HomeFileRecorder` (.sh3d zip), `DefaultHomeInputStream/OutputStream` (Java serialization), `HomeXMLHandler/Exporter` (Home.xml), `XMLWriter`, `Base64`, default catalogs, `AutoRecoveryManager` |
| `com.eteks.sweethome3d.tools`                                                            | 6     | ~800         | java.net, java.io                                                     | `OperatingSystem`, `URLContent` family, `ExtensionsClassLoader`                                                                                                                                               |
| `com.eteks.sweethome3d.plugin`                                                           | 4     | ~700         | model, viewcontroller                                                 | Plugin API (`Plugin`, `PluginAction`, `PluginManager`)                                                                                                                                                        |
| `com.eteks.sweethome3d.applet`                                                           | 8     | ~2,000       | javax.jnlp, model                                                     | Legacy applet/Web Start entry points — **out of scope**, but `SweetHome3DViewer` documents the read-only-viewer use case                                                                                      |
| root (`SweetHome3D.java`, `HomeFrameController`, `HomeFramePane`, `MacOSXConfiguration`) | 4     | ~3,500       | everything                                                            | Application bootstrap, main frame, single-instance socket, auto-recovery                                                                                                                                      |

Total ≈ **153K LOC** of Java.

### 2.2 External library dependencies

| Library                                                             | Purpose                                        | Web replacement                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Java3D 1.6 + JOGL (`j3dcore`, `j3dutils`, `jogl-all`, `gluegen-rt`) | 3D scene graph + hardware rendering            | **Three.js** (or raw WebGL/WebGPU)                                                                                                                               |
| `vecmath`                                                           | Vector/matrix math                             | `three` math classes or a tiny vec-math lib                                                                                                                      |
| Sunflow 0.07.3i                                                     | Photorealistic (GI/ray-traced) photo rendering | Replace: Three.js raytracer port or Three.js pathtracer (e.g. port of the Sunflow algorithm), or WebGPU path tracer; **WASM transpile of Sunflow is a fallback** |
| Yafaray (native C++)                                                | Alternative photorealistic renderer            | Out of scope (native); keep as extension seam                                                                                                                    |
| iText 2.1.7                                                         | PDF export (print)                             | `pdf-lib` / `jspdf` or print-to-PDF via browser                                                                                                                  |
| FreeHEP SVG + Batik SVG path parser                                 | SVG export                                     | Native `svg`/`Path2D` + `XMLSerializer`                                                                                                                          |
| JMF                                                                 | Video export (camera path → AVI)               | `MediaRecorder` + `Canvas.captureStream` or WebCodecs                                                                                                            |
| jeksparser-calculator                                               | Furniture/room "plan + description" formulas   | Port (~200 LOC) or replace with a small expression parser                                                                                                        |
| JUnit (test only)                                                   | Tests                                          | Vitest/Jest                                                                                                                                                      |
| JDOM/abbot (test only)                                              | XML/UI tests                                   | n/a (replaced by DOM testing)                                                                                                                                    |

### 2.3 Resource inventory (content that must ship or be served)

- `io/resources/` — **93 OBJ furniture models + 118 PNG textures/icons** (5.9 MB):
  the default furniture catalog (bed, sofa, kitchen units, etc.), default
  textures catalog (wood, tile, etc.), and 8 plan hatch patterns.
- `viewcontroller/resources/help/` — 12 MB of localized HTML help.
- `model`/`swing`/`viewcontroller` `*.properties` — ~25 languages of UI strings.
- `swing/resources/` — icons, cursors, quality preview images, animated GIFs.
- `j3d/PhotoRenderer.properties`, `tools/OperatingSystem.properties` — misc strings.

All of this can be served statically from the same origin or embedded as
bundled assets.

## 3. License

Sweet Home 3D is **GPL v2-or-later** (see headers: _"GNU General Public License
as published by the Free Software Foundation; either version 2 of the License,
or (at your option) any later version"_). Consequences:

- If we translate/adapt the Java source, the derived work must be distributed
  under GPL v2+.
- We plan to **port the source** (faithful TypeScript translation of the model
  and file-format layers for correctness, which is the legally safest path) and
  keep the whole project under GPL v2+.
- The algorithms (wall geometry, room detection, file schema) are not
  copyrightable, but copying the structure and comments of files is protected
  expression — so the plan is: **translated, attributed port** rather than a
  "clean room" rewrite, and we remain GPL.
- Third-party content: the bundled models/textures are part of the GPL project
  (they are in the GPL source distribution), so they can be redistributed with
  the same license. Sunflow is BSD-style (compatible); JMF/iText are LGPL (do
  not include the Java jars — we do not need them).
- Plugin API compatibility with the Java plugin ecosystem is **not a goal**;
  we define our own web plugin seam (see [03-porting-strategy.md](03-porting-strategy.md#plugin-system)).

## 4. Out of scope (explicit non-goals)

1. **Java applet / JNLP / Web Start** entry points and the `applet` package.
2. **Yafaray native renderer** (C++). Kept as a documented extension point.
3. **Desktop installer plumbing** (`install/`, `deploy/`, MacOSX
   configuration classes) — irrelevant on the web.
4. **Bit-perfect Java-serialized `Home` entry** _writing_. We can **read** the
   legacy serialized `Home` (to open old files) but we will **write** only
   `Home.xml` + content, like the Java app does since 7.x (the Java version
   writes both; we write the XML entry and can optionally omit the serialized
   one — see [05-file-format.md](05-file-format.md)).
5. **Java plugin ecosystem** (`.sh3p` plugin JARs).
6. **Single-instance desktop semantics, auto-update, OS integration.**

## 5. Definition of done (parity criteria)

"Feature-parity v1" is defined as:

1. **Open** any `.sh3d` produced by SweetHome3D 7.x (XML entry; legacy
   serialized entry for older files) and render it identically on the plan and
   in 3D (see parity testing, [12-testing-and-parity.md](12-testing-and-parity.md)).
2. **Save** files that Sweet Home 3D 7.5 can reopen losslessly.
3. Full **plan editing** toolset: selection, pan/zoom, wall/room/polyline/
   dimension-line/label creation and editing, levels, background image,
   furniture placement/mirroring/rotation, undo/redo.
4. Full **3D view**: navigation (orbit/observer/top cameras), elevation,
   day/night, textures, furniture import preview, navigation panel.
5. **Photo rendering** at comparable quality (replaced raytracer).
6. **Video export** of the camera path.
7. **Print to PDF / SVG** export of the plan.
8. Furniture & texture **library import** (`.sh3f`/`.sh3t` bundles are ZIPs of
   the same XML format — free), including OBJ/DAE/3DS model files.
9. **i18n** for at least the top-N languages; full set as stretch.

Milestones and effort estimates: [13-roadmap.md](13-roadmap.md).

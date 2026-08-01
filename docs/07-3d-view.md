# 07 — The 3D View: Java3D → Three.js

> Java: `swing/HomeComponent3D.java` (3.9K LOC), `j3d/*` (Object3DBranch family,
> ModelManager, TextureManager, ShapeTools, Component3DManager)
> Target: `packages/render3d/` — Three.js scene builders + view controller glue

## 1. What Java3D does that we must map

Java3D is a **retained-mode scene graph**: `BranchGroup` roots, `TransformGroup`
nodes, `Shape3D` leaves with `GeometryArray` + `Appearance` (Material, Texture,
PolygonAttributes, TransparencyAttributes, LineAttributes, ColoringAttributes),
plus a `View`/`Canvas3D` with `SimpleUniverse` camera management. Three.js is
also a retained scene graph: `Group`, `Mesh` with `BufferGeometry` +
`MeshStandardMaterial`/`MeshBasicMaterial`/`LineBasicMaterial`, `Camera`,
`Renderer`. The mapping is direct and well-trodden.

### 1.1 Node mapping

| Java3D                                                                                                     | Three.js                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `BranchGroup`                                                                                              | `Group`                                                                               |
| `TransformGroup`                                                                                           | `Group` with `matrix` (from `Transform3D`)                                            |
| `Shape3D`                                                                                                  | `Mesh` / `LineSegments` / `Points`                                                    |
| `GeometryArray` / `IndexedGeometryArray` (TriangleArray, QuadArray, LineArray, LineStripArray, PointArray) | `BufferGeometry` (positions, normals, uv, index) — convert quads → tris at build time |
| `Appearance`                                                                                               | `Material` (see §3)                                                                   |
| `Material`                                                                                                 | `MeshStandardMaterial` (diffuse/ambient/specular/shininess)                           |
| `Texture`                                                                                                  | `Texture` (canvas/bitmap) + `texture.transform` → `texture.offset/rotation/repeat`    |
| `TextureAttributes`                                                                                        | `texture.wrapS/wrapT`, `blending`                                                     |
| `TransparencyAttributes`                                                                                   | `transparent`, `opacity`, `depthWrite`                                                |
| `PolygonAttributes`                                                                                        | `side` (DoubleSide/BackSide), `polygonOffset`                                         |
| `LineAttributes`                                                                                           | `LineBasicMaterial` (linewidth is 1 on most WebGL platforms — see §4.3)               |
| `ColoringAttributes`                                                                                       | vertex colors / `color` on material                                                   |
| `RenderingAttributes.visible`                                                                              | `material.visible` / `mesh.visible`                                                   |
| `View` / `Canvas3D`                                                                                        | `PerspectiveCamera` + `WebGLRenderer`                                                 |
| `SimpleUniverse`                                                                                           | scene + camera management code                                                        |
| `Background`                                                                                               | `scene.background` / `scene.fog`                                                      |

### 1.2 The `Object3DBranch` family → TS builders

Each branch class becomes a TS class `XxxObject3D` that builds/updates Three.js
objects from model items, subscribing to model events:

| Java class               | TS                         | Builds                                                                                         |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `Wall3D`                 | `WallObject3D.ts`          | wall body (extruded polygon along height, from `Wall.getPoints()`), baseboards, outline shapes |
| `Room3D`                 | `RoomObject3D.ts`          | floor polygon with texture/color, optional outline                                             |
| `HomePieceOfFurniture3D` | `FurnitureObject3D.ts`     | transform group; child = loaded model mesh or default box/cube; selection box                  |
| `DimensionLine3D`        | `DimensionLineObject3D.ts` | lines + end marks in 3D                                                                        |
| `Label3D`                | `LabelObject3D.ts`         | 3D text (Java uses `Text3D` — use canvas-texture billboards or troika-three-text)              |
| `Polyline3D`             | `PolylineObject3D.ts`      | extruded polyline (thickness, cap/join)                                                        |
| `Ground3D`               | `GroundObject3D.ts`        | ground plane with color/texture + horizon fade                                                 |
| `Object3DBranch` base    | `Object3DBase.ts`          | shared attribute caches (materials/textures), outline/selection styles                         |

Behavior notes to port:

- **Static attribute caches**: `Object3DBranch` caches `Material`s and
  `TextureAttributes` keyed by values. Port as LRU caches keyed by
  (color, shininess, texture) so identical furniture shares materials.
- **updateX / updateAppearance / updateGeometry** split: Java updates only
  the affected parts on model events (`updateWallGeometry` vs
  `updateWallAppearance`). Port the same split to avoid rebuilding meshes
  when only a color changes.
- **Drawing modes**: `HomeEnvironment.DrawingMode` (FILL, OUTLINE,
  FILL_AND_OUTLINE) — walls/rooms render solid, wireframe, or both. Java
  uses a second "outline shape" with polygon-line material + offset. Port via
  `wireframe` material clones with polygonOffset.
- **Selections**: selection outlines (3.5px lines, 60% transparent blue fill
  on selection boxes) and the `SELECTION_COLORING_ATTRIBUTES`
  (0, 0, 0.71 blue). Port constants and rendering exactly.
- **Levels**: only visible levels' objects are attached; `Level` visibility
  events re-attach.
- **Camera**: `HomeComponent3D.updateView` computes camera position/aim from
  `Camera` (x,y,z, yaw, pitch, fov) + `ObserverCamera` (width/depth/height).
  Port `getCameraPosition` math and the "adjust elevation" logic
  (`observerCameraElevationAdjusted`).

### 1.3 Scene assembly (`HomeComponent3D` port)

`HomeComponent3D` builds the whole scene:

- `Ground3D`, sky background, light sources (sun, light color), navigation
  panel overlay (Java renders a 3D view into a button — on web, a small
  second Three.js renderer canvas or a static snapshot updated on camera
  change), stored cameras, and one branch per home object.
- It manages **offscreen image creation** for plan icons: render each
  furniture model top-down to an image. Web: same via `WebGLRenderer` +
  `renderToTexture`/readPixels or `OffscreenCanvas`.
- Navigation: "go to point of view", "align", "top view" buttons; orbit
  controls; elevator; day/night. Port using Three.js `OrbitControls` for the
  interaction and keep `HomeController3D` logic (which is view-agnostic).

## 2. Camera math port

`Camera.getPosition()` in the model computes position from yaw/pitch/fov/eye:

```
x = eye.x - r * cos(yaw) * cos(pitch)   (etc.)
```

Port from `Camera.java`/`ObserverCamera.java`; reuse for both the 3D view and
the photo renderer. Test with `HomeCameraTest`.

## 3. Material & texture parity

Java3D lighting is the old fixed-function model: ambient/diffuse/specular +
shininess. Three.js `MeshStandardMaterial` with `roughness ≈ 1 - shininess`
closeness; but **exact parity with Java3D fixed-function shading is not
achievable nor desirable** — the 3D view is a _preview_; photo rendering
(raytraced) is the "real" output. Policy:

- Match **colors, textures, and overall look** (day/night, sun position,
  light color) closely.
- Choose Three.js rendering quality (shadows on by default if perf allows)
  as a _documented improvement_, excluded from golden-image _exactness_
  requirements — parity tests for 3D use tolerance-based metrics (see
  [12-testing-and-parity.md](12-testing-and-parity.md#3d-view-parity)).
- Port texture management semantics: `TextureManager` loads textures async
  with a shared cache; `HomeTexture.getFilteredImage()` applies image filters
  (colorize) — port with `CanvasRenderingContext2D` filter or a small
  pixel-shader pass.
- Material fields from `HomeMaterial`: diffuse color, specular color, ambient
  color, shininess, opacity, texture — direct mapping.
- **Backface culling**: Java sets cull face per shape (walls cull backfaces
  when filled). Map to `material.side`.

## 4. Known rough edges and mitigations

1. **Line width**: WebGL lines are 1px (platform-dependent). Java3D draws
   selection outlines at 3.5px. Mitigation: screen-space line rendering via
   `LineSegments2` (three/examples) for selections/outlines, or draw outlines
   as thin extruded quads for important geometry (selection, dimension lines).
2. **Text in 3D**: Java `Text3D` (vector text). Use troika-three-text (SDF
   text, crisp) — visual parity is not critical for labels in 3D.
3. **Model instancing**: hundreds of furniture items → group by model digest
   and use `InstancedMesh` when item count exceeds a threshold (e.g., 50
   identical models); Java3D had no instancing, so this is a pure win.
4. **Texture memory**: cap texture size (e.g., 2048) and use
   `texture.generateMipmaps` + `compressedTexture` where available.
5. **Fog/sky**: Java renders sky color gradient + ground color; replicate
   with scene background color + a gradient dome or fog for horizon.
6. **Sun & shadows**: `HomeEnvironment` has `sunLightSource` — map to
   `DirectionalLight` + shadow maps; day/night animates light color/intensity
   per `Camera.getTime()`.

## 5. ModelManager port (async model loading)

`ModelManager` (2.6K LOC):

- Loads OBJ/DAE/3DS/LWS into branch graphs on a background executor.
- Cache: `loadedModelNodes` (WeakHashMap) + `loadingModelObservers`
  (waiters per content).
- Scales models to unit size (`getModelScale`/bounds normalization):
  Java computes model bounds, then applies scale + center so a model of
  arbitrary units fits its width/depth/height attributes.
- `ModelObserver` callback on success/error → branch `modelUpdated`.

TS port: `ModelLoaderManager` in a worker (Comlink):

- Parsers (from [08-model-loaders.md](08-model-loaders.md)) return
  `BufferGeometry`-ready data (positions/normals/uvs/indices + materials +
  transforms per sub-object).
- Cache keyed by content digest; observers → `Promise`-based waiters.
- The `waitForLoading`/`modelUpdated` semantics: furniture may initially show
  placeholder box; when loaded, swap mesh (and update plan icon).

## 6. Offscreen rendering for plan icons & thumbnails

- `HomeComponent3D.startOffscreenImagesCreation` renders each model to an
  image used by `PieceOfFurnitureModelIcon`. Port: `WebGLRenderer` sized to
  icon, camera top-down with the model's bounding box framed, `preserveDrawingBuffer`
  or `readPixels` → `ImageBitmap`. Run in a worker where possible (WebGL2 in
  workers is supported in modern browsers) to avoid jank on import.
- Also used by catalog previews and the "3D view snapshot" in navigation.

## 7. Deliverables checklist

- [ ] `Object3DBase` + attribute caches (materials, textures, outlines)
- [ ] `WallObject3D`, `RoomObject3D`, `FurnitureObject3D`, `DimensionLineObject3D`,
      `LabelObject3D`, `PolylineObject3D`, `GroundObject3D`
- [ ] Drawing-mode (fill/outline) support with polygonOffset
- [ ] Selection outlines + blue selection boxes
- [ ] Camera math port + `OrbitControls`-style navigation + stored cameras
- [ ] Day/night + sun/lighting from `HomeEnvironment`
- [ ] ModelManager async loading with placeholders + cache
- [ ] Offscreen icon rendering pipeline
- [ ] Tolerance-based golden screenshots vs Java 3D
- [ ] Instancing optimization for large homes

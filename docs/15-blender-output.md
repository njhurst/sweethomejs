# 15 — Blender Output: 3D Export for Blender

> Status: **design** (task 11.1) · Owner: `pi-5j02be` · Scope: `packages/export`,
> `packages/render3d` (read-only), `packages/ui` (menu/dialog), CI
> Oracle: Java `OBJWriter.java` + `HomePane.OBJExporter` (upstream 7.5),
> `examples/dream_house.obj` / `dream_house.obj.blend`

## 1. Goal and interpretation

**Goal**: let users take a home out of SweetHomeJS and continue working in
[Blender](https://www.blender.org/) — for rendering (Cycles/Eevee), editing
geometry, or producing architectural deliverables — without losing the
structure they built (objects, names, materials, textures, cameras).

"Blender output" is interpreted as **an export format Blender can open
natively** (File ▸ Import or drag & drop). The bar we want to clear:

1. **Open in current Blender** (≥ 2.80 for glTF; see §3) with zero conversion
   steps beyond the import itself.
2. **Right units and axis** — the home must appear at the same physical size,
   standing on the floor (Y-up, meters in glTF; Sweet Home 3D is internally
   **centimeters**, plan X/Y, elevation Z — verified: `dream_house.sh3d` uses
   `wallHeight='236.22'` cm).
3. **Structure preserved** — walls/rooms/furniture as separately addressable
   objects with sensible names; materials and textures intact (embedded where
   possible).
4. **Cheap to implement** — reuses the existing Three.js scene description
   instead of writing a second exporter stack.

What we explicitly do **not** promise: an editable *parametric* home (walls as
extruded curves, rooms as floor plans) — that is the Blender add-on route
(§6.3), tracked separately as a stretch.

## 2. Current state (investigation findings)

### 2.1 What the Java app does today

- `HomePane.exportToOBJ` → `OBJExporter.exportHomeToFile` builds the Java3D
  scene via `Object3DBranchFactory` (a **clone** of the home, empty selection),
  then `OBJWriter` (1684 LOC) serializes it:
  - OBJ + MTL sidecar; header comment with date; `g <name>_<shapeIndex>`
    groups; `usemtl` per appearance; per-object textures copied next to the
    MTL as PNG/JPG.
  - **Y-up coordinates, centimeter units** — ground at `y=0`, wall tops at
    `y≈236`. Confirmed in `examples/dream_house.obj` (`v 84.63287 589.38
    -11.502183` is a wall on an upper level; `mtllib dream_house.mtl`).
  - "Export all vs selection" confirm dialog (mirrors `confirmExportAllToOBJ`).
  - `writeNodeInZIPFile` bundles OBJ+MTL+textures into a zip.
- `examples/dream_house.obj.blend` (66 MB) is a **Blender 2.79** file
  (`BLENDER-v279REND` header) — i.e. the historical workflow was
  "export OBJ from the desktop app, import into Blender, save". It shows both
  that OBJ→Blender is the established path and that the `.blend` format churns
  across Blender versions (2.79 files open in 4.x only through migration).

### 2.2 What SweetHomeJS has today

| Piece | State | Relevance |
| --- | --- | --- |
| `packages/export` | PDF + CSV only (`PDFExporter`, `CSVExporter`) | Home for the new exporter |
| File menu | `Export to OBJ…` is a **disabled placeholder** (`HomePane.tsx`) | The wiring point |
| Scene intermediate | `render3d` `buildSceneIntermediate` → `THREE.Group` with walls, rooms, furniture, ground, dimension lines, labels, lights | **The export input** — the same graph the 3D view and photo renderer consume |
| Units/axis in the scene | plan `(x,y)` → three `(x,z)`, elevation → three `y` → **already Y-up, centimeters** | glTF is Y-up meters → only a scale change needed |
| Materials | `MaterialCache` → `MeshStandardMaterial` (PBR: color, emissive=ambient, roughness from shininess, opacity, double-sided) | Maps 1:1 onto glTF metallic-roughness |
| Textures | `TextureCache` → `THREE.CanvasTexture`, sRGB, repeat/offset/rotation via `applyHomeTextureAttributes` | GLTFExporter embeds canvas textures as PNG (verified in three r185 source) |
| Model loading | `ModelManager` async (`getModel` + waiters), models normalized to a 1-unit box, scaled by piece dimensions | Export must **await loads** or fall back to placeholders |
| Furniture without models | `InstancedFurniture` `InstancedMesh` | GLTFExporter handles `InstancedMesh` → `EXT_mesh_gpu_instancing` (Blender ≥ 3.6; older importers get the base mesh) |
| Lights | `SceneLights`: sun + rig `DirectionalLight`s + `AmbientLight` | GLTFExporter → `KHR_lights_punctual` (directional/point/spot; ambient not representable) |
| Cameras | `View3DCamera.applyModelCameraToThree` (`position.set(x, z, y)`) | GLTFExporter writes `PerspectiveCamera`s |
| three.js | **0.185.1**, ships `examples/jsm/exporters/{GLTFExporter,OBJExporter,USDZExporter,STLExporter,PLYExporter}` | `GLTFExporter` is the primary tool; no new dependency needed for v1 |
| Download | `WebContentManager.saveFile` (FSA + download fallback); `downloadBytes` helper in `HomePane` | Output path |

### 2.3 Ecosystem facts (checked)

- **glTF** is Blender's native interchange: File ▸ Import ▸ glTF 2.0 (and drag
  & drop) since 2.80; full material, texture, camera, light, and (3.6+)
  GPU-instancing support. The Khronos `gltf-validator` is on npm
  (`gltf-validator@2.0.0-dev.3.10`) — CI gate candidate.
- **.blend writer libraries in JS are essentially nonexistent** (npm search:
  no maintained writer; readers exist for forensic use only). Blender's own
  Python `blendfile` module is read/write but Python-side, and the on-disk
  format (SDNA `DNA1` struct catalog) is **version-pinned** — a writer must
  ship a struct catalog matching one Blender release and is invalid for
  others.
- **USD**: three's `USDZExporter` is AR-Quick-Look-oriented (single camera,
  not a general scene-graph writer); a real USD writer in JS is immature.
  Blender ≥ 3.0 imports USD, but quality here is below OBJ/glTF. Deferred.
- **Blender headless** (`blender -b -P script.py`) is installable in CI
  (apt/snap, ~200 MB) for true end-to-end import smoke tests.

## 3. Format options

| Format | Blender open | Units/axis | Fidelity | Effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| **glTF / GLB** | native, ≥ 2.80, drag & drop | meters, Y-up (exact match after cm→m scale) | materials+textures embedded, objects named, cameras/lights | **Low** — `GLTFExporter` on the existing scene | **Primary** |
| **OBJ + MTL + textures** | native, all versions | cm, Y-up (as Java) | groups/usemtl; textures sidecar | Low–med — port `OBJWriter` (already planned in [08 §5](08-model-loaders.md#5-exporters)) | **Parity/fallback** (matches Java exactly) |
| **.blend (native)** | instant | — | full editable scene | **High** — SDNA/DNA1 writer, version-pinned, no JS lib | Stretch only (§6.2) |
| **USD / USDZ** | ≥ 3.0 | meters, Y-up | limited by three's exporter (AR-oriented) | Med | Defer |
| **Blender add-on** (Python, imports `.sh3d`) | via add-on | — | parametric (walls→curves, levels→collections) | Med | Complementary stretch (§6.3) |

**Recommendation**: ship **glTF/GLB as the Blender output** (single-file GLB
default), port the **OBJ writer for Java parity** as the documented fallback,
keep `.blend`-writer and the add-on as clearly-scoped stretch items. This
maximizes user value (Blender opens GLB with one action, everything embedded)
at the lowest engineering cost, because it serializes a scene we already build.

## 4. Design: the GLB/glTF exporter

### 4.1 Architecture

```
File ▸ Export 3D view to Blender… (HomePane menu, enabled)
   │  options dialog (format, unit, ground/lights/cameras, texture cap)
   ▼
BlenderExporter.exportHome(home, preferences, options)     [packages/export]
   │  1. build export scene = buildSceneIntermediate(home, prefs, {no lights…})
   │     + await ModelManager loads (full-resolution furniture)
   │     + assign names from model objects (walls/rooms/pieces/levels)
   │  2. exportRoot = new Group(); exportRoot.add(scene.group)
   │     exportRoot.scale.setScalar(0.01)          // cm → meters (glTF spec)
   │  3. new GLTFExporter().parse(exportRoot, {binary, …})   // three r185
   │  4. return {bytes, mime, extension}           // .glb or .gltf(+zip)
   ▼
WebContentManager.saveFile → FSA or download       [packages/ui]
```

- **No new runtime dependency**: `GLTFExporter` ships inside the existing
  `three` 0.185.1 (`examples/jsm/exporters/GLTFExporter.js`).
- The exporter consumes the **same `SceneIntermediate`** the 3D view and
  photo renderer use ([08 §1.3 / 09 §1.3](09-photo-video-print.md#13-architecture-for-the-renderer)),
  so "what you see is what you export". It builds a **private** export scene
  (not the live view scene) to avoid disturbing the UI, then disposes it.
- **Placement**: `packages/export/src/GltfExporter.ts` (pure, no DOM) with a
  thin `BlenderExporter.ts` facade adding the Blender-specific options
  (unit, ground, cameras) and the download packaging. Worker placement per
  [14-worker-topology.md](14-worker-topology.md) for big homes — see §4.8.

### 4.2 Unit and axis mapping

- Sweet Home 3D model coordinates are **centimeters**; glTF mandates
  **meters** with **Y-up**.
- The Three.js scene is already Y-up (plan `x,y` → three `x,z`; elevation →
  three `y`), so the only transform needed is a uniform `0.01` root scale.
  A uniform scale keeps every furniture piece's local matrix consistent and
  Blender displays the home at true metric size (a 5 m wall is 5 m). Users
  who prefer cm can scale the imported scene by 100 in Blender.
- Blender's glTF importer keeps the node hierarchy — each named object stays
  editable.

### 4.3 Naming and hierarchy

`GLTFExporter` emits node names from `object.name` / `object.userData`. The
builders currently produce generic names, so the exporter assigns names from
the model before serializing (walking the intermediate's `builders`):

| Model item | Exported name | Notes |
| --- | --- | --- |
| Wall | `wall_<id>` (e.g. `wall_3`) | sanitized to `[A-Za-z0-9_]`-ish, deduped with counter |
| Room | `room_<id>` | |
| Furniture (model) | `<name>_<id>` | mirrors Java's `name + "_" + shapeIndex` |
| Furniture (no model) | `<name>_<id>` (placeholder box) | warn on export |
| Ground | `ground` | optional |
| Level | top-level group per level (`level_<id>`) when exporting all levels | v1 may export the visible level set only |
| Cameras | `camera_<observer|stored_<n>>` | optional |
| Lights | `sun`, `light_<name>` | optional, via `KHR_lights_punctual` |

Names go through a single sanitizer shared with the future OBJ writer
(Java's `OBJWriter.accept` allows only letters/digits/underscores — port that
exact rule for parity).

### 4.4 Materials and textures

- `MeshStandardMaterial` → glTF metallic-roughness. The existing
  shininess→roughness approximation (`1 - shininess/128`) is preserved;
  `metalness = 0` (Sweet Home 3D is dielectric). `doubleSided` → glTF
  `doubleSided` flag; `transparent/opacity` → glTF alpha. `polygonOffset`
  is not representable — drop it (affects only z-fighting artifacts that
  Blender will not have).
- `TextureCache` textures are `CanvasTexture` (sRGB). `GLTFExporter` embeds
  `HTMLCanvasElement` images as PNG (verified: `processTexture` has a canvas
  code path) → **GLB embeds all textures in one file**. v1 cap texture size
  (`maxTextureSize`) to keep the GLB reasonable (option, default e.g. 2048).
- Texture transforms: `offset/repeat` map to `KHR_texture_transform`
  (GLTFExporter emits it whenever a texture's offset/rotation/repeat differ
  from defaults). Known deviation:
  `applyHomeTextureAttributes` sets `rotation` with `center(0.5, 0.5)`,
  while KHR rotates around the UV origin — accept and log to
  `KNOWN_DIFFS.md` (the Java OBJ/Sunflow paths have analogous transform
  limitations).
- Furniture models: their own `MeshStandardMaterial`s (from the parsed OBJ/
  DAE/3DS) export as separate glTF materials, deduplicated by GLTFExporter.

### 4.5 Model loading

- Before serializing, `await` every pending `ModelManager.getModel` waiter so
  furniture exports at **full model resolution** (units already normalized by
  `normalizeModel`; final size comes from `applyPieceTransform` per piece).
- On load failure, fall back to the placeholder box (same behavior as the 3D
  view) and surface a warning count in the export result, mirroring Java's
  broken-model handling.
- This makes export async with progress (per-model count) and cancel, reusing
  the controller pattern from photo/video.

### 4.6 Cameras and lights

- Export the observer camera and stored cameras as glTF perspective cameras
  (reusing `applyModelCameraToThree` math — fov, aspect from the viewport or
  options). Optional.
- Export the sun as a `KHR_lights_punctual` directional light (position from
  the `Compass`); point lights from furniture `LightSource`s are already in
  the scene via `SceneLights`. `AmbientLight` is not representable in glTF —
  skip it (Blender scene world handles ambient). Optional toggle.

### 4.7 Export surface (v1)

- **Format**: GLB (binary, single file, embedded textures) — default;
  `.gltf` + `.bin` + textures zipped, as an option.
- **Unit**: meters (glTF) — v1 fixed; cm offered later if requested.
- **Scope**: export all (default); selection export mirrors Java's
  `confirmExportAllToOBJ` (v2 — §6.1).
- **Include**: ground (default on, like Java's `Ground3D`), lights, cameras
  (defaults per options dialog).

### 4.8 Worker placement and memory

- `GLTFExporter.parse` is synchronous and can take seconds / hundreds of MB on
  the 500-furniture fixtures (`dream_house.obj` alone is 230k vertices). Run the
  export in a worker (per [14](14-worker-topology.md) topology: codec-style
  worker) with the result transferred back as an `ArrayBuffer`; the UI shows
  progress. Fallback to main-thread when workers are unavailable.
- After export, dispose the private scene (geometries/materials/textures) —
  the exporter owns it.

## 5. OBJ parity port (fallback format)

- Port `OBJWriter` to TS in `packages/export/src/OBJExporter.ts` as planned
  in [08 §5](08-model-loaders.md#5-exporters): same header comment, `g`
  groups, `usemtl`/MTL emission, `d/Ka/Kd/Ks/Ns/Ni/illum` lines, per-appearance
  texture sidecars, `DecimalFormat("0.#######")`-equivalent float formatting
  (reuse the `formatFloat` policy from [05-file-format.md](05-file-format.md)).
- Same export-scene assembly as glTF (shared naming sanitizer, same
  model-preload step), writing **cm/Y-up as Java does** so
  `dream_house.obj`-equivalent output is reproducible. Output zipped
  (OBJ+MTL+textures) like Java's `writeNodeInZIPFile`.
- This is the format to compare against the Java oracle (§8) and the
  documented fallback for workflows that must byte-match the desktop app.

## 6. Stretch options (tracked, not committed)

### 6.1 Selection / partial export

Port of `confirmExportAllToOBJ` — selection vs all, with `HomeFurnitureGroup`
expansion and `isAllLevelsSelection` handling. Small, defer to v2.

### 6.2 Direct `.blend` writer — feasibility assessment

- **Format**: a `.blend` file is `BLENDER-<ver>REND` + `BLEND`/`USER`/`GLOB`/
  `DNA1`/`TEST`/`ENDB` blocks; `DNA1` carries a serialized C-struct catalog
  (SDNA) that encodes the exact struct layout of one Blender build.
- **Feasible but brittle**: a writer that emits a minimal
  `Scene`/`Collection`/`Object`/`Mesh`/`Material`/`Image`/`Texture` SDNA
  catalog for a pinned Blender release (e.g. 3.6 LTS or 4.2 LTS) is a
  realistic ~2–4 week spike, but every Blender release can invalidate it;
  Blender's own forward-migration paths reduce (not eliminate) the risk.
- **No JS library** exists; the writer would be original code against the
  public format docs. This is the highest-effort/lowest-ROI option since GLB
  already opens in one click.
- **Recommendation**: treat as a spike task (11.7) only after glTF + OBJ ship;
  gate on real demand.

### 6.3 Blender add-on that imports `.sh3d`

- A small Python add-on (distributed as a download from the app) reading the
  `.sh3d` zip's `Home.xml` directly: walls as extruded curves or closed
  solids, rooms as floor meshes, furniture as collection instances with
  materials/textures from the zip content, levels as collections. This is the
  only route to a **parametric/editable** home in Blender.
- Complementary, not competitive, with GLB export (GLB = fidelity of the
  rendered scene; add-on = structure). Same effort class as 6.2; decide
  together.

## 7. Browser-side rendering: nicer surfaces + GI (and the Blender bake round-trip)

This section answers: how much of the *rendering* can happen in the browser,
and can we get Eevee-level quality? Short answer: **yes for the features that
matter to architecture** (better surfaces + global illumination) — Eevee is
rasterization + screen-space tricks + baked light probes, and every one of
those techniques has a browser equivalent. Three quality tiers:

### 7.1 Tier 1 — WebGL2 today, no baking (what the app has + cheap upgrades)

The app already renders the scene intermediate with `MeshStandardMaterial`
PBR, ACES tone mapping and PCF-soft shadow maps (photo renderer task 8.3).
All of the following ship inside the existing three 0.185.1 and run on the
current WebGL2 support matrix:

| Effect | three r185 module | Eevee equivalent | Cost |
| --- | --- | --- | --- |
| Image-based bounce light (interior) | `PMREMGenerator` + `RoomEnvironment` | Eevee's world/env lighting | one-time PMREM, cheap |
| Image-based bounce light (exterior) | `GroundedSkybox` / `Sky` | sky + sun setup | cheap |
| Ambient occlusion | `GTAOPass` (Activision ground-truth AO — the same algorithm family Eevee uses) / `SSAOPass` | GTAO | medium |
| Screen-space reflections | `SSRPass` (WebGL2) / `SSRNode` (WebGPU) | SSR | medium–heavy |
| Nicer surfaces | `MeshPhysicalMaterial`: clearcoat (kitchen counters, car paint), transmission (glass, water), sheen (fabrics), iridescence, anisotropy | Eevee Principled BSDF | free at runtime |
| Diffuse GI per room (baked in-browser) | `LightProbe` + `LightProbeGenerator.fromCubeRenderTarget()` | Eevee irradiance light probes | one cube render per room at load/probe-dirty |
| Bloom / DOF / grading | `UnrealBloomPass`, `BokehPass`, `LUTPass` | Eevee viewport compositor | cheap–medium |

- The scene intermediate is shared by the 3D view *and* the photo renderer, so
  these upgrades land in both with one change to `MaterialCache`/the render
  pipeline.
- **Limits**: screen-space effects are frame-dependent (miss off-screen
  geometry — Eevee has the same artifact); `LightProbe` gives one irradiance
  per probe (fine for per-room architecture); no full-range specular GI.

### 7.2 Tier 2 — the Blender bake round-trip (the architectural-preview sweet spot)

The user-facing workflow this enables:

```
SweetHomeJS ──GLB export (§4)──▶ Blender
                                   │ import, set up sun/world
                                   │ bake GI lightmaps + AO (Cycles or Eevee)
                                   │ bake reflection env cubemap
                                   │ export GLB (Blender ≥ 4.1 writes KHR_materials_lightmap)
SweetHomeJS ◀────GLB import───────┘
   ▶ interactive preview with baked GI at full frame rate, any device
```

Baked GI costs nothing at runtime — this is exactly what architectural-vis
firms ship (lightmap + env map + AO), and it works on the WebGL2 path and
mobile, not just WebGPU desktops. "Bake once in Blender, preview anywhere in
the browser."

Implementation notes (verified against r185):

- three's `GLTFLoader` does **not** read `KHR_materials_lightmap` (no support
  in r185). Two options: (a) small loader patch — the extension is simple
  (lightmap texture + strength, applied like an AO/emissive term); (b) map
  the lightmap into the `emissiveMap` slot on import — a baked lightmap is
  unlit by definition, so `emissiveMap` renders it identically and needs no
  loader change. Recommend (b) for v1.
- The app needs a **GLB import path**: `ModelManager` currently loads
  obj/dae/3ds only; add a `gltf` loader (three's `GLTFLoader` + `DRACOLoader`
  optional) and an "import rendered scene" mode that swaps the home's 3D
  representation for the imported one (keep the plan 2D + model as source of
  truth; the imported scene is a preview artifact).
- Reflection env: bake one HDR cubemap in Blender → `PMREMGenerator` in three.
  Fallback without Blender: `RoomEnvironment` (Tier 1).
- **Limits**: lighting is baked (static — re-bake on major edits); this is a
  preview/visualization mode, not a live-lighting editor.

### 7.3 Tier 3 — WebGPU: in-browser Eevee-Next and Cycles-class stills

- three 0.185.1 ships the `three/webgpu` build + TSL node system with the
  full real-time stack: `SSGINode` (screen-space GI), `SSRNode`, `GTAONode`,
  `TileShadowNode`, `ClusteredLightsNode`, `TAAUNode`/`FSR1Node` upscaling,
  `RecurrentDenoiseNode` denoiser, `ImportanceSampledEnvironment`. That is an
  Eevee-Next-class pipeline once WebGPU is universal (Chrome/Edge stable,
  Firefox preview, Safari 26+). Gate on `navigator.gpu` with the Tier-1
  WebGL2 fallback (the support matrix demands it).
- For **photo-quality stills**: `three-gpu-pathtracer` (npm 0.0.24, peer
  `three >= 0.180` — compatible with the repo's 0.185.1) is a real in-browser
  Cycles-style path tracer (BVH + `xatlas-web` lightmap UV unwrap +
  denoiser). It is the ready-made engine for the deferred WebGPU path tracer
  milestone (task 8.4 / docs/09 §1.2 option B).

### 7.4 Recommendation

1. **Short term (no baking)**: IBL environment (`RoomEnvironment`/
   `GroundedSkybox`) + `GTAOPass` + `MeshPhysicalMaterial` upgrade in the
   shared scene intermediate — the biggest visual win per engineering hour
   for both the 3D view and the photo renderer.
2. **Flagship "architectural preview"**: the Tier-2 bake round-trip (GLB
   export → Blender bake → GLB import with lightmap→emissive mapping). It is
   the missing half of this doc's export story and the compelling demo.
3. **Medium term**: Tier-3 WebGPU SSGI pipeline behind a capability probe.
4. **Photo**: adopt `three-gpu-pathtracer` when task 8.4 lands.

**Blender is optional.** Tiers 1 and 3 are implemented entirely in this
codebase — every module above (PMREM, RoomEnvironment, GroundedSkybox,
LightProbeGenerator, GTAO/SSR passes, three/webgpu + TSL) ships inside the
already-vendored three 0.185.1, and `three-gpu-pathtracer` is a plain npm
dependency. Blender appears only in the Tier-2 bake path, and even that bake
can eventually run in-browser (`three-gpu-pathtracer` already path-traces
lightmaps into UV space). An in-browser bonus the baked path cannot offer:
**dynamic lighting** — the sun follows the compass date/time and lamps toggle
in real time, because the GI is computed live rather than baked.

Honest framing: browser real-time GI (Tiers 1/3) is **good architectural
preview** — viz-final quality is the **baked** Tier-2 path. Both are cheap to
reach because they consume the same scene intermediate.

## 8. Testing and parity

| Test | Method | Gate |
| --- | --- | --- |
| Unit — structure | Export fixture home → parse GLB with three `GLTFLoader` → assert node names/counts, meters positions, material/texture counts, camera presence | unit |
| Round-trip | export → `GLTFLoader` import → vertex/normal/bounds compare vs source scene (tolerance) | unit |
| Validator | `gltf-validator` on every exported GLB (npm dev dep) | CI |
| Java parity (OBJ) | TS OBJ output vs `tools/java-harness` dump of Java `OBJWriter` on the same fixture: group names, vertex counts, bounds, MTL lines | CI |
| Golden | `examples/dream_house.sh3d` → GLB; commit hash + size + node-count snapshot; regenerate per [10.2](TODO.md) workflow | CI |
| Blender smoke (optional) | CI job: install headless Blender, `blender -b -P import_and_dump.py scene.glb`, assert imported object/mesh counts | CI (separate, can be allowed to fail on infra) |
| Perf | export 500-furniture home < budget (e.g. 15 s incl. model load) | CI |

Known divergences to record in `KNOWN_DIFFS.md`: texture-rotation center vs
KHR origin; `polygonOffset` dropped; ambient light skipped; cm→m scale (a
deliberate spec compliance, not a diff).

## 9. Deliverables checklist

- [ ] `packages/export/src/GltfExporter.ts` — scene → GLB/glTF (units, names,
      materials, textures, lights, cameras), private scene + dispose
- [ ] Model preload (await `ModelManager`), placeholder fallback + warnings,
      progress/cancel
- [ ] `packages/export/src/OBJExporter.ts` — Java `OBJWriter` parity port
      (+ zip packaging)
- [ ] Shared naming sanitizer + export-options types (used by both writers)
- [ ] UI: enable File ▸ Export 3D view to Blender… (+ OBJ), options dialog,
      `downloadBytes`/`WebContentManager.saveFile` path, i18n keys in all
      8 locale files
- [ ] GLB import path (ModelManager `gltf` loader) + "import rendered scene"
      preview mode + lightmap→emissive mapping (Tier-2 round-trip, §7.2)
- [ ] Shared render upgrade: IBL env + GTAO + MeshPhysicalMaterial in the
      scene intermediate (Tier-1, §7.1) — benefits 3D view and photo renderer
- [ ] Tests: unit structure, GLB round-trip, gltf-validator CI gate, Java
      OBJ parity, golden snapshot for `dream_house.sh3d`
- [ ] Docs: this doc's status flip to implemented; `KNOWN_DIFFS.md` entries;
      docs/README.md index
- [ ] Stretch spikes (11.7) evaluated with a written verdict

## 10. Open questions

1. GLB with `EXT_mesh_gpu_instancing` (placeholder furniture) — confirm
   import quality in Blender 3.6+ vs 4.x; else bake instances to real meshes
   behind an option.
2. `maxTextureSize` default (512/1024/2048) — measure GLB size on
   `dream_house.sh3d` (has ~50 JPG/PNG textures).
3. Levels: export only visible levels (Java's `isAllLevelsSelection` behavior)
   or all levels grouped by level name — pick v1 default after a quick user
   check.
4. Whether to add cm as an optional unit in the options dialog (v2).

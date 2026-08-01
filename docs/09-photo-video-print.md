# 09 — Photo Rendering, Video Export, Print/PDF/SVG

## 1. Photo rendering (the biggest "invent" item)

### 1.1 What the Java app does

`AbstractPhotoRenderer` / `PhotoRenderer` (Sunflow) / `YafarayRenderer`:

- User picks a camera (or a point of view), quality (LOW/HIGH → image size,
  ray depth, GI samples), rendering engine (Sunflow by default, Yafaray if
  installed).
- `PhotoRenderer.render(BufferedImage, camera, updatedItems, observer)`
  builds a **Sunflow scene** from the home: converts every `Object3DBranch`
  (walls, rooms, furniture, ground) into Sunflow primitives (triangle meshes
  with materials), sets up lights (sun + light sources from furniture
  `LightSource`s), and runs Sunflow's bucket-based raytracer (GI, path
  tracing, antialiasing) writing into the image with a `Display` callback
  (`imageBegin/imageUpdate/imageFill/imageEnd`).
- The renderer reuses the same object3D branch graphs (with a `waitForLoading`
  mode) — i.e., the photo pipeline consumes the **same scene description as
  the 3D view**, which is why it can update only `updatedItems` incrementally.
- Light source plugins (`SphereLightWithNoRepresentation`,
  `TriangleMeshLightWithNoRepresentation`) — extensible per model type.

### 1.2 Port options

| Option                         | Description                                                                                               | Pros                                                      | Cons                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A. Port Sunflow to TS/WASM** | Transcribe the raytracer (scene, GI, buckets, materials) into TS or C/Rust → WASM                         | Exact parity of output; reuse Sunflow's proven algorithms | Big effort (~20–30K LOC port); long tail of features (GI modes, caustics, instancing)        |
| **B. New GPU path tracer**     | Write a WebGPU/WebGL2 path tracer in a worker, fed by the same scene intermediate used by Three.js        | Modern, fast, interactive-quality; smaller code           | Output differs from Sunflow; needs careful material/light mapping to stay "SweetHome3D-like" |
| **C. Three.js-based renderer** | Use Three.js with physically-correct lights, shadows, postprocessing (e.g., render to high-res + denoise) | Cheap, reuses `render3d` scene builders                   | Not raytraced; GI quality limited (no real global illumination)                              |
| **D. Hybrid**                  | B for real-time preview; A (WASM) for high-quality final render                                           | Best quality + speed                                      | Two renderers to maintain                                                                    |

**Recommendation: start with C** (ship photo feature fast, reuse the Three.js
scene, add `MeshPhysicalMaterial` + env lighting + postprocessing like
SSAO/Bloom), **then graduate to B (WebGPU path tracer)** as the flagship
photo engine, with A as a long-term stretch. Photo output is a _creative
artifact_ — exact Sunflow parity is explicitly **not required** (unlike plan
rendering). We only need:

- same cameras/lenses (pinhole/normal/fisheye/spherical — port camera math
  exactly),
- same light sources (sun position from `Compass` + `HomeEnvironment` light
  color/power; furniture `LightSource`s with power/color),
- comparable quality levels (image size presets mirror the Java UI: 4:3/16:9,
  320×240…7680×4320),
- progressive display (buckets/scanlines → progressive path tracing passes).

### 1.3 Architecture for the renderer

```
PhotoController (ported) ──► PhotoRenderer (interface, ported)
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
      Three.js photo renderer  WebGPU path tracer   Sunflow-WASM (stretch)
             │                    │                    │
             └──────────┬─────────┘                    │
                        ▼
             Scene Intermediate (port of Object3DBranch
             family → triangles + materials + lights)
```

- **Scene intermediate**: define once (shared with `render3d`): meshes,
  materials (PBR-ish mapping of `HomeMaterial`), light sources, camera.
  The renderers consume it; the 3D view's Three.js scene builds from it too
  (avoids divergence between preview and photo).
- **Worker isolation**: rendering runs in a worker (WebGPU/WebGL2 or WASM);
  progress events via Comlink; cancellation (`PhotoRenderer.stop()` port).
- **Incremental updates**: the Java `updatedItems` optimization (only changed
  branches re-uploaded) maps to dirty-scene re-upload.

### 1.4 Sunflow feature checklist (for option A later)

Sunflow 0.07.3 core: `Scene` (objects/light list), `PrimitiveList` /
`TriangleMesh`, `Shader` (Phong, Ward, Mirror, Glass, AmbientOcclusion,
GIEngine: path tracing, irradiance cache, photon mapping optional), `Camera`
(pinhole/ortho/fisheye/spherical), bucket renderer, `Light` (sun, point,
sphere, mesh, image-based). The SweetHome3D glue builds meshes per home
object and uses `Path tracing GI` (with `irr-cache` in HIGH?). Porting path
traversals + BVH from Java to Rust/C is mechanical. **Deferred**; decide when
options B's quality gap is measured.

## 2. Video export

### 2.1 Java behavior

`VideoController` + `VideoPanel`:

- Defines a **camera path** (list of `Camera` with time) in the environment.
- Renders each frame with the 3D view or the photo renderer at a chosen
  format (JPEG frames; 4:3/16:9; up to 8K; fps presets 12–30).
- Writes frames via JMF into an AVI (Motion JPEG).
- Progress + cancel UI (`ThreadedTaskController`).

### 2.2 Web port

- Frames: render with the Three.js scene (fast path) at the chosen size/fps —
  camera interpolation along the path must match Java
  (`HomeController3D`'s path interpolation — port `interpolate` math; note
  Java also offers "smooth" interpolation between cameras).
- Encoding: two viable paths:
  1. `canvas.captureStream(fps)` + `MediaRecorder` → WebM (VP9/AV1) — trivial,
     browser-supported, but output is WebM not AVI. Sweet Home 3D's own
     product is fine with a modern container; offer `.webm` and `.mp4`.
  2. WebCodecs `VideoEncoder` (VP9/H.264/AV1) → MP4/WebM muxer (mp4-muxer /
     webm-muxer libs). Better quality control, matches Java's frame-driven
     model (encode the rendered frames as they're produced).
- Support both; default WebCodecs → MP4 when available (Safari/Chrome), fallback
  MediaRecorder.
- Cancel/progress UI mirrors `VideoPanel`.

## 3. Print to PDF / SVG / CSV

### 3.1 What Java exports

- **Print / Print preview**: prints the plan (with furniture list option) via
  Java2D printing (`HomePane.print`, `PlanComponent.print`).
- **Print to PDF**: `HomePDFPrinter` (iText) writes the plan (and optionally
  furniture list) to PDF.
- **Export to SVG**: `PlanComponent.SVGSupport` (FreeHEP) writes the plan as
  SVG — used by web galleries; there is also "export plan to SVG" behavior in
  HomePane.
- **Export to CSV**: furniture list as CSV (`ExportableView`).

### 3.2 Web port

Because we already abstracted plan drawing behind `PlanPainter`
([06-2d-plan-view.md](06-2d-plan-view.md#svg-export)), we get:

- **SVG export**: `PlanPainter` → SVG implementation (direct `<path>` +
  text elements + embedded images). Round-trips through Inkscape/browsers.
- **PDF export**: two options:
  1. Vector: implement `PlanPainter` → PDF via `pdf-lib` (`pdf-lib` supports
     vector paths + text via embedded fonts). Best quality, closest to
     `HomePDFPrinter`'s vector output.
  2. Raster: render plan canvas at print DPI → embed PNG/JPEG in PDF.
     Ship (1) with (2) as fallback for fonts (embed the font subset; plan text
     uses `TextStyle` — map to embedded PDF fonts).
- **Print dialog**: browser `window.print()` with a print stylesheet that lays
  out the plan at the chosen paper size (`HomePrint`: format/orientation/
  margins). Match Java's paper presets (A4, Letter, etc.).
- **CSV export**: trivial (furniture table model → CSV with locale-aware
  delimiters; Java uses `;` or `,` per locale — check `ExportableView`).

### 3.3 Print layout parity

`HomePrint` fields: paper format (A0–A5, Letter, Legal…), size, orientation
(PORTRAIT/LANDSCAPE/REVERSE_LANDSCAPE), margins (top/bottom/left/right),
furniture printed flags (name/description/color…), grid printed, scale (1:50,
1:100…). Port `PlanComponent`'s `getPrintedPlanScale` logic (Java computes the
largest scale that fits the plan on the paper at the chosen orientation).
The print preview (`PrintPreviewController`/`PrintPreviewPanel`) ports to a
React modal rendering the plan via `PlanPainter` at the paper size.

## 4. Deliverables checklist

- [ ] `PhotoRenderer` interface + `PhotoController` ported (cameras, quality
      presets, progressive display, cancel)
- [ ] Scene intermediate shared by 3D view and photo
- [ ] Three.js photo renderer (C) — v1
- [ ] WebGPU path tracer (B) — v2 milestone
- [ ] Video: path interpolation, WebCodecs/MediaRecorder pipeline, presets
- [ ] Print preview + browser print + PDF (vector via pdf-lib)
- [ ] SVG export via `PlanPainter`
- [ ] CSV export
- [ ] Perceptual parity tests vs Sunflow reference images (tolerance-based)

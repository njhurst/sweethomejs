# 08 — Model Loaders and Exporters (OBJ / DAE / 3DS / LWS)

> Java: `j3d/OBJLoader.java` (2.0K), `j3d/DAELoader.java` (1.2K),
> `j3d/Max3DSLoader.java` (1.8K), `j3d/OBJWriter.java`, `j3d/OBJMaterial.java`,
> `j3d/ModelManager.java`
> Target: `packages/core/src/loaders/` (pure TS, worker-friendly)

Sweet Home 3D ships its own model loaders (not Java3D's) because it needs
tight control over geometry parsing, material assignment, and error tolerance.
We port these parsers to TS so that **model files behave identically** — this
matters because the same OBJ must look the same in 3D and photo rendering.

## 1. Input formats supported

| Format | Notes |
|---|---|
| **OBJ** (Wavefront) | MTL files; `v/vt/vn/f/o/g/usemtl/mtllib/s/…`; negative indices; smoothing groups; quad faces (`f a b c d`) must be triangulated; comments; continuation lines. Java's loader is very tolerant. |
| **DAE** (COLLADA 1.4/1.5) | XML; `<geometry><mesh>` with `<source>` float arrays, `<vertices>`, `<polylist>/<triangles>/<triangles>`; `<library_materials>/<library_effects>`; bindings. Java's `DAELoader` uses DOM (JDOM). |
| **3DS** (3D Studio) | Chunked binary format; material chunks, mesh chunks, transform chunks, keyframe chunk; Java's loader is lenient with malformed chunk lengths. |
| **LWS** (LightWave Scene) | Text scene format via `Lw3dLoader` (Java3D) — rarely used; port only if needed (defer). |

Plus **texture images** referenced by materials (PNG/JPG), loaded via
`TextureManager`.

## 2. Output contract

Java loaders produce a Java3D `BranchGroup` with child `Shape3D`s; the 3D view
and photo renderer consume geometry + appearance. TS parsers should emit a
neutral intermediate (works for Three.js and the raytracer):

```ts
interface LoadedModel {
  // grouped by sub-object
  groups: ModelGroup[];
  // node transform hierarchy (3DS keyframes collapse to static transforms)
}
interface ModelGroup {
  name: string;
  positions: Float32Array;   // vertex xyz
  normals: Float32Array;     // per-vertex (computed if missing)
  uvs: Float32Array | null;
  indices: Uint32Array | null;
  materialIndex: number;
}
interface ModelMaterial {
  name: string;
  diffuse?: [r,g,b]; specular?: [r,g,b]; ambient?: [r,g,b];
  shininess?: number; opacity?: number;
  texture?: string;            // relative file name
  // DAE-specific: effect parameters (transparent, reflectivity, bump)
  extra?: Record<string, unknown>;
}
```

**Normalization policy (critical)**: Java `ModelManager.getModelBounds`/
`getModelScale` computes each model's bounding box, then scales+centers so the
model fits the furniture's width/depth/height and sits on its base. This
"unit cube" normalization must be ported exactly — it's what makes a 100-unit
OBJ from one catalog sit next to a cm-scaled one from another. Details:

- bounds from geometry (`BoxBounds` accumulation including groups)
- `getModelScale`: `1 / max(width, depth, height)`-ish then applied with the
  furniture's own scale — port the exact formula from `ModelManager` and
  `HomePieceOfFurniture3D` (there's subtlety around the y-offset so the model
  rests on the floor, and around `modelMirrored`/rotation).
- OBJ exporter (`OBJWriter`) mirrors this: writes models in catalog units.
  Port for "export furniture as OBJ" and for round-trip tests.

## 3. Parser porting notes per format

### OBJ
- Tokenizer with continuation handling (`\`).
- Face winding: Java preserves winding; ensure consistent CCW faces for
  Three.js (material side set per model; don't auto-flip).
- Quads → triangles: Java splits quad `(a,b,c,d)` into `(a,b,c),(a,c,d)` —
  match exactly (affects normals/winding).
- `vn` optional: Java computes normals (with smoothing groups via `s`) using
  `ShapeTools.getNormals`; port the smoothing-group normal computation.
- Negative/zero-area faces: Java drops degenerate triangles — match.
- MTL: `Kd/Ka/Ks/Ns/d/Tr/illum/map_Kd`; port `OBJMaterial` semantics;
  texture paths resolved relative to the OBJ location.

### DAE
- Use a DOM parser (`DOMParser`) instead of JDOM — same data.
- `polylist` with varying counts → triangulation (fan) — match Java.
- `accessor` strides, `float_array` ids; `<bind_vertex_input>` for UVs.
- Effects: `Phong`/`Lambert`/`Blinn` → map to material params; `<texture
  texcoord="…">` ↔ `<input semantic="TEXCOORD">`.
- Node `<matrix>`/`<translate>/<rotate>/<scale>` — Java applies node
  transforms to meshes; apply per-group.
- Handle `up_axis` (Y_UP default in COLLADA; SweetHome3D models are typically
  Z-up after conversion — Java's loader flips to its convention; **match the
  exact axis convention** the Java loader uses, since catalog models were
  authored against it).

### 3DS
- Chunk parser: read `chunkId` + length, recurse; skip unknown chunks; guard
  against length overruns (Java tolerates bad files — same tolerance).
- `0x4000` (object), `0x4100` (triangular mesh), `0x4110` vertices,
  `0x4120` faces, `0x4130` materials, `0x4160` local axes, `0x4600` keyframes.
- Materials `0xAFFF`: colors `0x0010/0x0011/0x0012`, shininess, texture maps.
- Winding/axis: 3DS is Z-up left-handed — Java converts; replicate its
  conversion (mirror + swap) so geometry matches.

## 4. Async loading & caching

- Parser runs in a worker; `ArrayBuffer`/`Uint8Array` passed via transfer.
- Cache: `Map<contentDigest, LoadedModel>`; while loading, promise waiters.
- Texture images: load via `fetch`/`createImageBitmap` in the worker (or main
  for canvas access), cache by digest.
- On parse error: Java shows the placeholder box + console message and marks
  the furniture "broken" (`ModelError` observer). Same behavior: fallback
  mesh + toast/console.

## 5. Exporters

- **OBJWriter** (port): exports furniture/catalog models as OBJ+MTL; used by
  "Export furniture" and by photo renderer for some paths. Straightforward
  from the intermediate representation.
- **Home.xml content writing** is handled by the io codec
  ([05-file-format.md](05-file-format.md)); content files inside `.sh3d` are
  stored verbatim (original OBJ/DAE/3DS bytes, digest-named), so round-trip
  preserves them exactly.

## 6. Tests

- Parser golden tests: for each fixture model (from `io/resources/*.obj` and
  third-party), assert parsed geometry (vertex counts, bounds, material
  counts) matches Java's loader output (dump Java-side via a small harness
  that prints `ModelManager` results).
- Malformed-file tests: truncated OBJ, bad 3DS chunk lengths, missing MTL —
  assert graceful degradation identical to Java.
- Normalization tests: models of wildly different units produce identical
  placement in a test home.
- OBJ round-trip: load → export → load → geometry equal.

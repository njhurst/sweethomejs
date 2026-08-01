# 11 — Web Platform Services

This doc covers the browser-specific plumbing the port depends on: file I/O,
persistence, workers, and deployment. All decisions here follow a simple rule:
**the core (`core/`) must never import browser-only APIs**; they live behind
interfaces implemented in `apps/web`.

## 1. File I/O

### 1.1 Opening `.sh3d` files

| Mechanism                                         | Use                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `<input type="file">`                             | baseline open (works everywhere)                                                                                |
| **File System Access API** (`showOpenFilePicker`) | primary UX: returns a `FileSystemFileHandle` we can re-open and save _in place_ (like the Java app's open/save) |
| Drag & drop                                       | drop `.sh3d`/`.sh3f`/`.sh3t` onto the window → open                                                             |
| URL param / import                                | `?open=<url>` opens a remote home (like the Java applet's URL open); CORS permitting                            |

### 1.2 Saving

| Mechanism                                                            | Use                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **File System Access API** (`showSaveFilePicker` + `createWritable`) | primary: true save-as with same-file re-save; also "recent files" via stored handles |
| `a[download]` + Blob URL                                             | fallback (Safari/Firefox) and "Export a copy"                                        |
| **OPFS** (Origin Private File System)                                | autosave, recovery copies, and offline "My files" area                               |
| Web Share API                                                        | share `.sh3d` via OS share sheet (nice-to-have)                                      |

`ContentManager` port: the `viewcontroller/ContentManager` interface
(`showOpenDialog`, `showSaveDialog`, `getContentName`…) gets a browser
implementation with the same call semantics (returns chosen content + name),
so `HomeController` needs no changes.

### 1.3 Reading the zip

- `fflate` (pure TS, fast, worker-friendly) for zip read/write and
  deflate/inflate. For very large files (>100 MB), run in a worker.
- Streaming: read `Home.xml` entry first (it's near the start of the zip when
  written by the app), parse, then resolve content lazily by entry name
  (digest lookup). This makes "open a 200 MB home" feel instant.

## 2. Persistence

### 2.1 IndexedDB schema (via `idb`)

```
db "sweethomejs"
 ├─ store "preferences"      key: string            value: any
 ├─ store "documents"        key: id (uuid)         value: { name, blob (sh3d), mtime,
 │                                                        thumb (ImageBitmap), handle? }
 ├─ store "libraries"        key: name              value: { bundle blob, xml, content[] }
 ├─ store "content"          key: sha1 digest       value: Blob          (dedup cache)
 └─ store "recovery"         key: docId             value: { homeXml, timestamp, docMeta }
```

- `documents`: "My homes" list in-app (like recent files, but also a local
  library); cloud sync can mirror this store (see §6).
- `content`: dedup store for models/textures across open homes (eviction:
  LRU with a cap, e.g., 500 MB; contents are recoverable from any open home).
- `recovery`: autosave target.

### 2.2 State persistence across reloads

- App state (current home, viewport, selected tool) is **not** persisted by
  default (like the Java app, where closing loses unsaved work) — but we
  autosave to `recovery` so a crash/refresh offers recovery.
- Preferences persist immediately on change.

## 3. Web Workers

| Worker           | Work                                                                                                 | Notes                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| `codec.worker`   | zip inflate/deflate for big files, XML parse (saxes-style), legacy serialized-`Home` deserialization | COM: transfers `ArrayBuffer`s  |
| `model.worker`   | OBJ/DAE/3DS parsing + normalization                                                                  | parse → `LoadedModel` transfer |
| `texture.worker` | image decode (`createImageBitmap`), colorize filters                                                 |                                |
| `photo.worker`   | WebGPU/WebGL2 path tracer                                                                            | owns its own renderer context  |
| `video.worker`   | WebCodecs encode + mux                                                                               |                                |
| `icon.worker`    | offscreen top-view model icons                                                                       | WebGL2 in worker               |

Comlink wraps them; the interface types live in `core` (`ModelManager`,
`PhotoRenderer`, etc.) so workers are swappable.

**Caveats**: WebGL contexts per worker are limited; icons + photo renderer may
need to share one worker context or queue. Test on Safari (worker WebGL
support). Keep a main-thread fallback for `icon.worker`.

## 4. WASM

Places we expect real native-speed wins:

1. **Path tracer** (photo renderer) — if we go the Sunflow-port route, a
   Rust/C → WASM core with SIMD (`wasm SIMD128`) is the way.
2. **Legacy serialized-`Home` parser** — pure TS is fine (it's I/O bound), but
   if profiling says otherwise, WASM.
3. **Zip** — fflate is fast enough; no WASM needed.
4. **Geometry (boolean ops for `Area`)** — polygon-clipping in TS is fine.

WASM toolchain: Rust + `wasm-bindgen`/`wasm-pack`, or C + Emscripten. Bundle
as ES modules with `vite-plugin-wasm`. Keep WASM optional behind feature
detection: pure-TS fallback for the path tracer (slower but works everywhere).

## 5. PWA & offline

- **Vite PWA** (`vite-plugin-pwa`): cache the app shell + default catalog +
  help + i18n for the active locale. The app is fully functional offline
  (except opening remote URLs / cloud sync).
- **Installability**: manifest + icons (reuse the existing SH3D icon assets as
  a starting point, replaced with our own).
- **Update strategy**: versioned asset hashes; on new deploy, show "reload to
  update" (don't auto-reload mid-edit; preserve recovery data).

## 6. Cloud sync (post-v1)

Design a seam now, ship later:

- `HomeStore` interface: `list()`, `save(home, meta)`, `load(id)`, `delete(id)`.
  Implementations: `IndexedDBHomeStore` (local, v1) and `CloudHomeStore`
  (optional backend: S3-compatible object store + JSON metadata, or a
  self-hosted server; auth via WebAuthn/OAuth).
- Collaboration (multi-user editing) is **out of scope** — SH3D documents are
  single-user; document-level sharing + sync conflicts (last-write-wins with
  copies) is the v1 cloud story.

## 7. Security & privacy

- All processing is client-side: **home files never leave the browser**
  unless the user explicitly syncs/shares — a strong privacy story to
  advertise.
- Content URLs (models inside a home referencing `http://...`) — Java
  downloads them; on web, fetch with CORS (document; many catalog URLs are
  CORS-open) and cache in `content`.
- Blob URLs and File System Access handles are revoked/cleaned on close.
- Third-party libraries: sandbox or require signed bundles (later phase).

## 8. Deployment

- Static build (no server): Nginx/Netlify/Cloudflare Pages/GitHub Pages.
- Long-term: shared hosting of the furniture library mirror + help pages;
  a download endpoint for `.sh3d` export from the catalog.
- CLI (`apps/cli`) for CI parity tests runs the same `core` code in Node.

## 9. Deliverables checklist

- [ ] `ContentManager` web implementation (FS Access + fallback download)
- [ ] fflate-based codec worker with lazy content resolution
- [ ] IndexedDB schema + `idb` layer + `PreferencesStore`
- [ ] Worker topology (Comlink) for codec/model/texture/icon/photo/video
- [ ] WASM decision spike for path tracer (perf benchmark vs TS)
- [ ] PWA shell + offline assets + update flow
- [ ] `HomeStore` interface + IndexedDB impl (cloud later)

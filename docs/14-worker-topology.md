# 14 — Worker Topology (finalized)

> Task 9.2 — the worker/threading model of SweetHomeJS, settled after P5–P7.
> Comlink was evaluated; the codebase uses direct `Worker`/`OffscreenCanvas`
> seams with synchronous fallbacks instead (fewer moving parts, no extra dep).

## Principles

1. **The UI thread owns the DOM and the model.** React renders the HomePane;
   the model (Home) lives on the main thread — it is not postMessage-serializable
   (JavaBeans listeners, Content objects), so heavy logic that needs the model
   runs on the main thread unless it can be fed a snapshot.
2. **Rendering that only needs a snapshot runs off-thread.** The photo renderer
   builds its scene from the home on the main thread but renders to an
   `OffscreenCanvas` (worker-ready) with `createImageBitmap` readback.
3. **Fallbacks everywhere**: every worker path has a main-thread equivalent so
   browsers without the feature still work.

## Topology

| Pipeline | Thread | Mechanism | Fallback |
| --- | --- | --- | --- |
| Plan paint (2D) | main | Canvas2DPainter, rAF-dirty batching | — (DOM-owned) |
| 3D view (Three.js) | main | WebGLRenderer on a `<canvas>` | WebGL-unavailable → nothing renders |
| Model loading (OBJ/DAE/3DS) | main, async | three loaders + ModelManager cache; `load` off the WebGL critical path | URL fetch failures → placeholder |
| Furniture icons (top view) | main, async | TopViewIconRenderer → ImageBitmap cache | icon cache miss → repaint later |
| Photo rendering | main-thread renderer, OffscreenCanvas | ThreeJSPhotoRenderer: OffscreenCanvas when available, hidden `<canvas>` otherwise; `createImageBitmap` readback | WebGL probe `isAvailable()` |
| Video encoding | main | MediaRecorder + canvas.captureStream (WebM); frames via single-shot renderFrame | MediaRecorder unavailable → frame list export |
| File codecs (sh3d zip, Java serialization) | main, async | Sh3dContainer / JavaObjectDecoder (pure, could move to a worker) | — |
| i18n / help bundles | main, static | build-time JSON + index.html copies | — |

## Seams (already in code)

- `ThreeJSPhotoRenderer` accepts an `OffscreenCanvas` (constructed internally
  when available) — a future photo worker only needs the scene snapshot
  transferred (`Transferable` ImageBitmap + a serialized scene descriptor).
- `renderVideoFrames`/`recordVideo` separate "produce frames" from "encode",
  so a WebCodecs encoder can replace MediaRecorder without touching the
  frame pipeline.
- `ModelManager` already caches + dedupes loader requests and is
  transferable-friendly (it never touches the DOM).

## What was deliberately NOT built

- Comlink wrapping: the main-thread model would need deep clones per call;
  the win is only for asset decode + photo/video, both of which have lean
  native paths already.
- A WebGPU path tracer worker (8.4, deferred): WebGPU is still evolving and
  the Three.js renderer meets the quality bar for v1.

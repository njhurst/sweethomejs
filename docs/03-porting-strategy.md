# 03 — Porting Strategy

## 1. Principles

1. **Port in dependency order, verify at each layer.** model → io (file
   format) → controllers → plan view → 3D view → dialogs → photo/video/print.
   Each layer has an executable parity check before the next begins.
2. **Keep the seams.** Port `View`, `ViewFactory`, `Controller`, `ContentManager`,
   `Object3DFactory` as interfaces/types exactly as upstream designed them.
   Every Java class lands in a TS file with the same name so upstream
   bugfixes map 1:1 (greppable translation table).
3. **Faithful translation, not clever rewrite** — for model/io/controllers.
   The correctness bar is _"same output as Java"_, and creative rewrites make
   parity impossible to reason about. (Cleverness is reserved for the parts we
   must rebuild: UI chrome, 3D backend, photo renderer.)
4. **float32 discipline.** Model fields are Java `float`s; TS `number` is
   double. Introduce `f32()` = `Math.fround` applied at: field setters (where
   Java would narrow), serialization, and geometry entry points. A lint rule
   or codegen marker enforces this. (Detailed policy in
   [05-file-format.md](05-file-format.md#floating-point-policy).)
5. **Automated, mechanical translation first; human review second.** Use a
   tool-assisted pass (see §4) to produce a compilable first draft of each
   class, then review semantics.

## 2. Build & repo layout

```
sweethomejs/
  docs/                       ← this documentation set
  src/                        ← extracted upstream (reference only, not compiled)
  packages/
    core/                     ← model + io + tools + controllers (pure TS)
      src/model/
      src/io/
      src/controllers/
      src/geom/               ← awt.geom shim
      src/events/
    render2d/                 ← plan canvas engine (depends on core)
    render3d/                 ← Three.js scene builders (depends on core)
    ui/                       ← React shell + dialogs (depends on core, render2d, render3d)
    photo/                    ← path tracer / renderer worker
    codecs/                   ← .sh3d reader/writer, model loaders, exporters
  apps/
    web/                      ← Vite app, PWA, static build
    cli/                      ← node CLI: convert .sh3d, render offscreen (parity tooling)
  test/
    fixtures/                 ← golden .sh3d files, expected outputs
    unit/  parity/  e2e/
```

Why packages: `core` must run in Node for tests and CLI; `render2d/3d` need
DOM; `photo` needs workers/WASM; `ui` needs React. Strict package boundaries
keep the test matrix small.

## 3. Translation order and gates

| Phase                        | Output                                                       | Gate (definition of done)                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0 tooling                   | repo scaffold, tsconfig, CI, f32 lint, golden corpus capture | CI green; corpus of `.sh3d` files (from Java app + hand-built) collected                                                                                                                                                 |
| P1 `geom` shim               | `geom/` + tests                                              | awt.geom semantics tests ported from Java (e.g., `Area` ops on known polygons, `PathIterator` segment outputs)                                                                                                           |
| P2 `model`                   | all 64 classes                                               | 1. TypeScript compiles strict. 2. Unit tests ported from `test/` (RoomTest, HomeCameraTest, etc.). 3. A "model replay" harness: deserialize fixture homes and assert field-by-field equality vs Java-produced JSON dumps |
| P3 `io` codecs               | `.sh3d` reader/writer, XML, catalogs                         | **Round-trip gate**: Java-written `.sh3d` → our reader → our writer → Java reader → identical `Home` (field diff). Plus byte-level golden tests for XML entry                                                            |
| P4 `controllers` (plan core) | PlanController + furniture/room/wall/etc. controllers        | Ported unit tests pass (PlanControllerTest etc. run headless with a mock view)                                                                                                                                           |
| P5 `render2d`                | PlanComponent → Canvas2D                                     | **Golden-image gate**: render fixture homes on a canvas, diff against Java-rendered PNGs (see [12-testing-and-parity.md](12-testing-and-parity.md))                                                                      |
| P6 `render3d`                | Three.js scene builders                                      | Golden screenshots at fixed cameras vs Java 3D screenshots; model-loading parity                                                                                                                                         |
| P7 `ui` shell                | React HomePane + dialogs                                     | e2e flows: open → edit wall → save → reopen                                                                                                                                                                              |
| P8 photo/video/print         | path tracer, video, PDF/SVG export                           | Photo: perceptual similarity vs Sunflow reference images; Print: PDF reopens in Java identically                                                                                                                         |
| P9 polish                    | i18n, PWA, cloud sync, touch                                 | acceptance suite                                                                                                                                                                                                         |

## 4. Translation tooling

Options for the mechanical pass:

1. **Do it by hand, class by class.** 242 files; model/io/controllers are
   ~75K LOC — roughly 2–3 months of focused porting. Most reliable.
2. **Automated Java→TS transpiler.** Tools exist (e.g. `java2typescript`,
   `j2ts`, `meteor/deepdive` research, CheerpJ is Java-in-browser not
   translation). Quality is poor for idiomatic Java (generics, anonymous
   classes, overloading). **Verdict: not viable for full automation**, but
   useful as a _scaffold_: transpile a file, then hand-fix. We can script
   per-file scaffolding: class skeleton + method signatures + enum/Property
   lists from the Java source, which is ~50% of the typing work.
3. **Runtime transpilation (CheerpJ/TeaVM/GWT)**: run the Java bytecode in
   browser. Tempting for instant fidelity, but (a) it drags in Swing/Java3D
   which we want to _replace_, (b) it makes the web app unmaintainable and
   un-hackable by JS devs, (c) performance and UX constraints. **Verdict:
   rejected for the main product**, though _CheerpJ might serve as an interim
   "Java in browser" stopgap_ if we ever want to demo a working app early
   (spike only, see [13-roadmap.md](13-roadmap.md#p0-spikes)).

**Chosen approach**: hand port with codegen assistance:

- A small `tools/scaffold.ts` script reads a `.java` file and emits:
  - TS class with all fields (`private` types mapped), enum `Property`
    definitions, constructor signatures, public method signatures with Javadoc
    comments preserved (attribution), TODO stubs for bodies.
  - Then a human fills bodies, porting semantics.
- Keep a `TRANSLATION.md` mapping file: Java class → TS file → status →
  notes on divergences. This is also the audit trail for GPL attribution.

## 5. Java→TS idiom translation table

| Java                                             | TS                                                                                                                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| class with fields, getters/setters               | class with typed private fields + getters/setters (port names exactly: `getWallHeight()` → `getWallHeight()`)                                                                                                        |
| `float`, `double`, `int`, `long`, `boolean`      | `number`, `boolean`; `Math.fround` at narrowing points                                                                                                                                                               |
| `String`                                         | `string`                                                                                                                                                                                                             |
| `List<T>`, `ArrayList`                           | `T[]` internally or `List<T>` wrapper only where Java index semantics matter; prefer arrays for perf, wrapper class `HomeList` only if needed for identity semantics (most lists are replaced wholesale via setters) |
| `Map<K,V>`, `HashMap`                            | `Map<K,V>`                                                                                                                                                                                                           |
| interfaces                                       | interfaces                                                                                                                                                                                                           |
| enums (`enum Property {...}`)                    | const string unions + frozen const objects (port `.name()` semantics) — but keep Java names in comments for mapping                                                                                                  |
| anonymous inner classes (listeners, comparators) | arrow functions / named classes                                                                                                                                                                                      |
| `PropertyChangeSupport`                          | `EventEmitter<Property>` (see below)                                                                                                                                                                                 |
| `CollectionChangeSupport<T>`                     | `CollectionEventEmitter<T>` (ADD/DELETE with `getIndex()`)                                                                                                                                                           |
| `SwingUtilities.invokeLater`                     | `queueMicrotask` / `requestAnimationFrame` (must preserve ordering semantics carefully — see [06-2d-plan-view.md](06-2d-plan-view.md#event-ordering))                                                                |
| `Timer`                                          | `setInterval` wrapper with the same `isRunning/restart` API                                                                                                                                                          |
| `Executors`                                      | worker pool wrapper (or just `Promise` chains in UI)                                                                                                                                                                 |
| `java.text.DecimalFormat`, `Collator`            | `Intl.NumberFormat`, `Intl.Collator` with pinned locales                                                                                                                                                             |
| `ResourceBundle.getString`                       | `messages` lookup from ported `.properties`                                                                                                                                                                          |
| `Serializable` / `clone()`                       | `clone()` method (deep)                                                                                                                                                                                              |
| `throws XException`                              | TS exceptions; port exception hierarchy names                                                                                                                                                                        |

## 6. Event system design (port of JavaBeans)

```ts
// core/src/events/EventSupport.ts
type PropertyListener<T> = (ev: PropertyChangeEvent<T>) => void;

class PropertyChangeSupport {
  addPropertyChangeListener(prop: string, l: Listener): void;
  removePropertyChangeListener(prop: string, l: Listener): void;
  firePropertyChange(prop: string, oldValue: unknown, newValue: unknown): void;
}

class CollectionChangeSupport<T> {
  addCollectionListener(l: CollectionListener<T>): void;
  fireCollectionChanged(type: Type, item: T, index: number): void;
}
```

Notes:

- Event **delivery is synchronous** in Java (listeners run in the same stack).
  Keep it synchronous — the plan/3D views schedule their own repaint batching;
  don't introduce async event delivery, or ordering bugs will creep in.
- The model classes use `transient` support fields rebuilt in `readObject`.
  In TS, keep listeners in a separate `WeakMap` keyed by instance (or a
  non-enumerable symbol field) so they are not part of any serialized state.
- `Home`'s `Property` enum (name, modified, camera, selection, etc.) becomes a
  string union; keep exact strings for portability of code and tests.

## 7. Undo/redo

Java uses Swing `UndoManager` with `LocalizedUndoableEdit` edits created by
controllers. Port as:

- `core/controllers/UndoSupport.ts` with `addEdit/undo/redo/canUndo/canRedo`,
  `UndoableEdit` interface (`undo()`, `redo()`, `addEdit()` coalescing,
  `isSignificant()`).
- Controllers create `LocalizedUndoableEdit` instances with the same
  messages/keys so UI strings stay identical.
- Coalescing rules (e.g., furniture moves coalesce) live in the edits — port
  verbatim.

## 8. i18n

- The `.properties` files are bundled in the source (GPL). Convert to a build
  step emitting TS modules / JSON per locale. Keep the exact keys.
- `ResourceBundleTools` and the `getLocalizedString(Class, key)` pattern →
  a `Messages` module that resolves `bundle.classKey` with fallback locale.
- Plurals/format args: `String.format` calls in Java use `%s`/`%d`; use
  `Intl.MessageFormat`-free small formatter port (the Java format strings are
  positional, `{0}`-style in some places, `%`-style in others — port exactly).
- 25 locales total; start with en/fr/de/es/pt/zh/ja (top by usage), rest as
  generated.

## 9. Plugin system

Java plugins (`.sh3p` JARs with `Plugin` subclasses) are out of scope. Web
replacement:

- A `Plugin` interface: `getActions()`, `getHomePluginController()`, hooks for
  renderers (matching `PluginRegistry.lightSourcePlugins` seam used by
  `PhotoRenderer`).
- Plugins are ES modules loaded at runtime (dynamic `import()` from a
  configured URL or a signed bundle) with the same action/menu model as the
  Java `PluginAction`.
- This is a later phase; the seam (an interface + registry) is designed now so
  `PhotoRenderer` port doesn't hard-code light sources.

## 10. Risks specific to strategy

- **PlanController scale**: 15.9K LOC with dozens of anonymous mouse-handler
  classes. Mitigation: port it last among controllers, port its unit tests
  first (`PlanControllerTest.java`, `PlanComponentTest.java`,
  `PlanComponentWithFurnitureTest.java` exist upstream and exercise the state
  machines), and keep a feature-flag'd UI during porting.
- **Float parity**: see [05-file-format.md](05-file-format.md#floating-point-policy).
- **Sunflow**: the biggest "invent" item. De-risked by the seam: `PhotoRenderer`
  port can initially shell out to a WebGPU path tracer with a _different_
  look; exact parity is explicitly **not** required for photo (it's a creative
  output), only quality parity. See [09-photo-video-print.md](09-photo-video-print.md).
- **Legal**: GPL. Attribution header on every translated file (original
  author + license + "translated from Java" note). See
  [01-overview.md](01-overview.md#license).

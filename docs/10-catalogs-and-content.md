# 10 — Catalogs, Content, Help, and Internationalization

## 1. Default furniture & texture catalogs

### 1.1 What ships today

- `io/resources/` contains the **default furniture catalog**: 93 OBJ models +
  PNG preview images (bed, sofa, kitchen, bathroom, office…) plus the default
  **textures catalog** (wood, tiles, stone…) and 8 **hatch patterns** used on
  the plan.
- The catalog _structure_ (names, categories, descriptions, licenses) lives in
  `DefaultFurnitureCatalog.properties` / `DefaultTexturesCatalog.properties`
  (one per locale, ~20 languages), parsed by `DefaultFurnitureCatalog` /
  `DefaultTexturesCatalog` in `io/`.
- Models are tiny (few KB each), textures small; the whole set is ~5.9 MB.
- Users can install **additional furniture/texture libraries** (`.sh3f`/
  `.sh3t` zip bundles with `FurnitureCatalog.xml`/`TexturesCatalog.xml` +
  content), from the web catalog (thousands of free models).

### 1.2 Web strategy

- **Bundle the defaults** as static assets (or a single `catalog.sh3f`-style
  zip loaded lazily). Parse with the same catalog codec
  ([05-file-format.md](05-file-format.md#6-catalog--library-files)).
- Serve `.sh3f`/`.sh3t` **as-is** (no conversion): the format is already a
  zip + XML; we read it directly. This preserves the ecosystem of existing
  libraries.
- Furniture **model URLs**: `DefaultFurnitureCatalog` maps model names to
  `ResourceURLContent` (classpath). Web: map catalog model names to asset
  URLs via a manifest generated at build time from the properties files.

### 1.3 Catalog UX (FurnitureController port)

- Left panel: category tree + search (Java has a search field with
  relevance scoring — `searchRelevance.gif`); categories with counts.
- Drag & drop furniture from catalog to plan (or click-to-place): port
  `FurnitureCatalogController` + the drop target logic in `PlanController`.
- **Drag & drop on web**: HTML5 DnD or pointer-based custom DnD (more reliable
  on touch); the plan must handle drop at world coordinates (convert client
  point → plan coords via inverse transform).
- Catalog sorting (by name/creator/size), multi-column views.

## 2. Help system

- 12 MB of localized HTML help (`viewcontroller/resources/help/<locale>/index.html`
  - pages + images), shown in a `HelpController`/`HelpView` browser pane.
- Web: ship the help as static pages; open in a new tab or an in-app iframe/
  side panel. Keep the same `ActionType.HELP` menu wiring. Stretch: convert to
  Markdown and generate docs — but **shipping the existing HTML is cheapest
  and stays in parity**.

## 3. Localization

- ~25 locales with `package_*.properties` bundles per package (model, swing,
  viewcontroller, io, tools). Total ≈ hundreds of files, a few thousand keys.
- Port pipeline: parse `.properties` (with Unicode escapes `\uXXXX`, comment
  handling, and Java's `ISO-8859-1` encoding) → JSON per bundle → runtime
  `Messages` registry with fallback chain (locale → default).
- `LengthUnit_*.properties`, `DefaultFurnitureCatalog_*.properties`,
  `DefaultUserPreferences_*.properties` included.
- Language switcher in preferences (`UserPreferencesController`).

## 4. Preferences (UserPreferences)

Java `FileUserPreferences` persists to `~/.sweethome3d/` (Java Preferences or
XML). Web: **IndexedDB** store:

- `userPreferences` — unit, language, currency, VAT, recent files, window
  layout, shortcuts, 3D attributes (default colors/textures, navigation
  panel), furniture display columns.
- `libraries` — installed `.sh3f`/`.sh3t` libraries (blob storage with
  metadata; re-import on app load).
- `recoveredHomes` — auto-recovery data (see below).
- Recent files: store last N file handles (File System Access API) + blobs.

Port `DefaultUserPreferences`/`FileUserPreferences` _structure_ (properties
and defaults), with an async `Preferences` interface:

```ts
interface PreferencesStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  // + blob storage for libraries/recovery
}
```

## 5. Auto-recovery

Java `AutoRecoveryManager` periodically writes a backup copy of the open home
to a temp file and offers recovery on next launch ("recovered/repared home"
flags on `Home`). Web port:

- Save an autosave snapshot (the `.sh3d` bytes, or the XML) to IndexedDB
  every N minutes (or after M edits) per open document.
- On load, detect interrupted session → offer "Recover your home?" dialog
  mirroring the Java UX (`Home.RECOVERED`/`REPAIRED` properties, the
  `repairedIcon`/`repairedImage` resources).
- `ContentDigestManager`-based repair of damaged content (missing model in
  file → try preferences/default catalog, mark repaired) — port the
  `DamagedHomeIOException` handling flow.

## 6. Content addressability & dedup

- All content (models, textures, background images) is stored digest-named in
  files. On web, keep an in-memory + IndexedDB blob store keyed by digest so
  the same texture used by 20 furniture items loads once.
- `HomeURLContent`/`SimpleURLContent`/`TemporaryURLContent`/`ResourceURLContent`
  → one `Content` impl backed by: asset URL (built-in), blob (user-imported),
  or in-zip entry (opened file). `Content.openStream()` returns a
  `ReadableStream`/`Blob`.

## 7. Deliverables checklist

- [ ] Catalog codec for `.sh3f`/`.sh3t` + default catalog assets pipeline
- [ ] FurnitureCatalogController/View (tree, search, DnD)
- [ ] Help static export + in-app display
- [ ] `.properties` → JSON build step + `Messages` runtime with fallback
- [ ] IndexedDB `PreferencesStore` + port of preference defaults
- [ ] Auto-recovery (autosave + recovery dialog)
- [ ] Content blob store with digest dedup

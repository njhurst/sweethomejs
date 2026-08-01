# 04 — Model Layer Port

> Java package: `com.eteks.sweethome3d.model` (64 files, ~22.6K LOC)
> Target: `packages/core/src/model/`

## 1. Goals

- A 1:1, behavior-identical TypeScript port of every model class, with the
  same method names, same `Property` enums, same event payloads.
- Zero DOM dependencies; runs in Node for tests and CLI.
- Fields use float32 discipline per [05-file-format.md](05-file-format.md#floating-point-policy).

## 2. Class inventory and port status mapping

### 2.1 Document root & core

| Java class                                                           | TS file              | Notes                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Home`                                                               | `Home.ts`            | The root. Port `CURRENT_VERSION = 7400`, all collections, `Property` enum, `get/set` for every field, listener support, `getSelectedItems()`, `getFurnitureWithSubGroups()` helper, clone, `HomeObject` id handling, visual/properties maps, base plan lock, additional furniture properties |
| `HomeObject`                                                         | `HomeObject.ts`      | base class: id (uuid or name-based), name, visibility, level binding, `getVisualProperty`/`setVisualProperty`, `clone`                                                                                                                                                                       |
| `Selectable`                                                         | `Selectable.ts`      | interface: `getX/getY/getZ/getPoints`, `containsPoint`, `move`, `clone`                                                                                                                                                                                                                      |
| `CollectionChangeSupport` / `CollectionEvent` / `CollectionListener` | `events/`            | port of the collection event plumbing (ADD/DELETE with index)                                                                                                                                                                                                                                |
| `HomeApplication`                                                    | `HomeApplication.ts` | small: holds `HomeRecorder` + `UserPreferences`                                                                                                                                                                                                                                              |
| `HomeRecorder`                                                       | `HomeRecorder.ts`    | interface (readHome/writeHome/exists) + `Type` enum                                                                                                                                                                                                                                          |
| `Content`                                                            | `Content.ts`         | interface: `openStream()`, `getURL()` — web impl: `Blob`/`File`/URL-backed                                                                                                                                                                                                                   |

### 2.2 Furniture family

| Java class                                                                           | Notes                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HomePieceOfFurniture` (1849 LOC)                                                    | the biggest model class: x/y/z, yaw/pitch/roll, width/depth/height, model `Content`, catalog id, name/description, color/texture/material, visibility, movable, deformable, resizable, model mirrored, backface shininess, name label (offset/style/angle), light sources, elevation, level, home transform, box bounds. Port all `Property` members. |
| `HomeDoorOrWindow`                                                                   | wall attachment (thickness, distance, wall width/left/height/top, sashes, boundary/wall thickness flags, hinge) — pure math port                                                                                                                                                                                                                      |
| `HomeLight`                                                                          | power (lumens), light sources list, light source material names                                                                                                                                                                                                                                                                                       |
| `HomeShelfUnit`                                                                      | shelf elevations + shelf boxes (4 shelf properties)                                                                                                                                                                                                                                                                                                   |
| `HomeFurnitureGroup`                                                                 | group of `HomePieceOfFurniture` with `getFurniture()`, bounding box compute, `setMovable`, etc.                                                                                                                                                                                                                                                       |
| `CatalogPieceOfFurniture`, `CatalogDoorOrWindow`, `CatalogLight`, `CatalogShelfUnit` | immutable catalog entries (imported model, category, creator, license)                                                                                                                                                                                                                                                                                |
| `PieceOfFurniture`, `DoorOrWindow`, `Light`, `ShelfUnit`                             | interfaces implemented by both Home- and Catalog- variants                                                                                                                                                                                                                                                                                            |
| `Elevatable`, `Selectable`, `Transformation`                                         | small interfaces; `Transformation` (Matrix3D-ish affine) used by the 3D layer                                                                                                                                                                                                                                                                         |

### 2.3 Plan geometry

| Java class                                               | Notes                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Wall` (1254 LOC)                                        | start/end points, arc extent, thickness, height, wallAtStart/End (connecting walls), baseboards (left/right `Baseboard`), `getPoints()` → polygon via `GeneralPath`; `getWallAtStart/End` topology helpers; intersection math |
| `Baseboard`                                              | height, thickness, color/texture                                                                                                                                                                                              |
| `Room` (864)                                             | points, floor texture/surface color, ceiling/trim colors, name + label style, area visibility, level; `getArea()`/`getPerimeter()` ported math; point-in-polygon, room point detection (`getRoomAtPoint`)                     |
| `Polyline` (766)                                         | points, thickness, cap/join/dash styles, arrows, closed path, elevation, 3D visibility; arc-length/flattening for dashed rendering                                                                                            |
| `DimensionLine` (658)                                    | start/end/elevation, offset, end mark size, pitch, length style, color, visibility; `getLength()`                                                                                                                             |
| `Label` (362)                                            | text, position, style, color/outline, angle/pitch, level                                                                                                                                                                      |
| `Compass` (1094)                                         | x/y, diameter, north direction, latitude/longitude/timezone + sun position math (`getSunPosition`), visible flag                                                                                                              |
| `Level` (258)                                            | name, elevation, height, floor thickness, background image, visible/viewable                                                                                                                                                  |
| `BackgroundImage` (164)                                  | file content, scale, offset, rotation                                                                                                                                                                                         |
| `HomeTexture` (285)                                      | texture image content + scale + color; `getFilteredImage` helper used by renderers                                                                                                                                            |
| `HomeMaterial` (151)                                     | diffuse/specular/ambient colors, shininess, texture                                                                                                                                                                           |
| `HomeEnvironment` (665)                                  | sky/ground colors, textures, light color, walls alpha, drawing mode (FILL/OUTLINE/FILL_AND_OUTLINE), camera elevation adjustment, video paths, sun lighting, ground/ceiling visibility, subpart lights                        |
| `HomePrint` (208)                                        | paper format/size/orientation, margins, furniture printed flags, grid                                                                                                                                                         |
| `Camera` (368) / `ObserverCamera` (310) / `TopCamera`    | lens (PINHOLE/NORMAL/FISHEYE/SPHERICAL), fov, yaw/pitch, time-of-day, renderer name                                                                                                                                           |
| `LightSource`                                            | x/y/z + color + diameter — geometry only                                                                                                                                                                                      |
| `Sash`                                                   | axis, x/y/z, width/height, horizontal                                                                                                                                                                                         |
| `BoxBounds` (old)                                        | legacy bounds                                                                                                                                                                                                                 |
| `AspectRatio`, `TextStyle` (240), `ObjectProperty` (209) | value objects                                                                                                                                                                                                                 |

### 2.4 Catalogs & preferences

| Java class                                                                                        | Notes                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FurnitureCatalog`, `FurnitureCategory`, `TexturesCatalog`, `TexturesCategory`, `PatternsCatalog` | tree structures + change events                                                                                                                                                                                                                                                                                              |
| `UserPreferences` (1401)                                                                          | the big preferences object: language, units, currency, VAT, furniture/texture catalogs, patterns, 3D view attributes, navigation panel, recent files, keyboard shortcuts, actions (`ActionType` enum? it's actually on `HomeController`/`UserPreferences`), tool-tip feedback, default textures; port all `Property` members |
| `LengthUnit` (1127)                                                                               | units: CENTIMETER, METER, FOOT, INCH, CENTIMETER_INCH, METER_FOOT; conversions; `getFormatWithUnit()`; decimal formatting parity is important for dimension rendering                                                                                                                                                        |
| `Library`, `HomeDescriptor`                                                                       | library bundle metadata (name, id, version, license, contributor)                                                                                                                                                                                                                                                            |
| `TexturesCatalog`, `PatternsCatalog`                                                              | as above                                                                                                                                                                                                                                                                                                                     |

### 2.5 Exceptions

Port the exception hierarchy as `Error` subclasses with the same names:
`RecorderException`, `InterruptedRecorderException`, `NotEnoughSpaceRecorderException`,
`DamagedHomeRecorderException`, `IllegalHomonymException`.

## 3. Semantics that need special care

### 3.1 `Home` list replacement semantics

Java setters like `setFurniture(List)` copy into a new list and fire
`furnitureChange` per item (ADD) — check each setter's behavior. The plan
controller relies on `CollectionEvent` `getIndex()` being correct after
insertions/removals. Port `addX`, `deleteX`, `setX` exactly, including the
**modified flag** side effects (Java sets `modified=true` in setters; the
`modified` property is transient and `propertyChangeSupport` fires on it).

### 3.2 Selection state

`Home` holds `selectedItems` (transient) and fires `SELECTION` property
changes; `getSelectedItems` returns a **copy** (check — it returns unmodifiable
list). Selection is managed by controllers through `home.setSelectedItems`.
All-levels selection flag interacts with `Level` visibility. Port exactly.

### 3.3 Cloning

`clone()` is used for: editing wizards (preview), undo snapshots, group
creation, and `HomeFurnitureGroup` compute. Java's `clone()` is shallow for
lists but `HomePieceOfFurniture.clone()` deep-copies material/light fields.
Port clone methods; verify `HomeFurnitureGroup` computes bounding box on clone.

### 3.4 Id generation

`HomeObject` generates ids: `getId()` returns existing or creates
`UUID`-based or `"furniture_" + counter` style ids — check `createId`.
Furniture in groups uses `furnitureGroup_...`? Whatever the scheme, port it so
serialized ids match the Java app's format (ids appear in XML and must be
stable across save/load and **identical between Java and JS writes** for
round-trip parity).

### 3.5 Level ordering & elevation index

`Home` keeps levels sorted by elevation + `elevationIndex`; `addLevel` inserts
in order. Port `LEVEL_ELEVATION_COMPARATOR` and the re-indexing logic.

### 3.6 Geometry in the model

`Wall.getPoints()` returns `float[][]` outlines. `Compass.getSunPosition()`
does astronomy math — port to double then fround per policy. `Room.getArea()`
uses the shoelace formula. `Polyline` has arc flattening. `HomeObject` has
`getShape()`/`isPointInShape` using `GeneralPath` — use the `geom` shim.

### 3.7 Serialization-related transient fields

Many fields are `transient` in Java (listener supports, selection, modified
flag, etc.). In TS, mark them clearly (`/** transient */`) and exclude from any
serialization path. Conversely some fields are **non-transient for backward
compat** (e.g., `furnitureSortedProperty` in Home) — those must be serialized.

## 4. LengthUnit & formatting parity

`LengthUnit` is used everywhere the plan shows dimensions and in import
wizards. The Java class builds `DecimalFormat` patterns per unit, e.g.:

- CENTIMETER: `0.##` + " cm"
- INCH: `0.##"` with fractions
- FOOT: `0'##"` etc.

Port the format patterns _literally_ and use `Intl.NumberFormat` with
`useGrouping:false` and matching min/max fraction digits, plus the unit
suffix logic. Add golden tests comparing formatted strings against Java output
for a grid of values (0.5, 1, 2.5, 12.34, -3.2, 1000.1) across all units.

## 5. UserPreferences & i18n bridge

`UserPreferences` wraps message bundles. Port with:

- `getLocalizedString(bundleName, key, args)` → resolves from a `Messages`
  registry built from ported `.properties` files (see
  [03-porting-strategy.md](03-porting-strategy.md#8-i18n)).
- `ResourceBundleTools` equivalent: language fallback chain
  (exact → language → default), which the app uses for catalog names too.

## 6. Tests to port first (from upstream `test/com/eteks/sweethome3d/junit/`)

- `RoomTest` — area/perimeter, point-in-room.
- `HomeCameraTest` — camera math (position from yaw/pitch, fov).
- `HomeFurnitureGroup` related logic (via `TestUtilities`).
- `LengthUnit` formatting (new).
- Model replay tests: deserialize fixture homes, dump all fields as JSON,
  compare to Java-produced dumps (fixture corpus in `test/fixtures/`).
- Event semantics tests: ADD/DELETE index order, property change old/new
  values, listener removal during notification (JavaBeans semantics).

## 7. Deliverable checklist

- [ ] `geom` shim green (P1 gate)
- [ ] All 64 model classes ported with 100% method-name parity
- [ ] `Property` string unions match Java enum names exactly
- [ ] float32 policy applied (lint rule + codegen marker)
- [ ] Model replay harness + fixture corpus
- [ ] Ported upstream model tests passing
- [ ] `Home.clone` deep-clone semantics verified
- [ ] Id-generation parity with Java verified

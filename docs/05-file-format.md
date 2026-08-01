# 05 — The `.sh3d` File Format and its TypeScript Codec

> Java classes: `io/HomeFileRecorder`, `io/DefaultHomeInputStream/OutputStream`,
> `io/HomeXMLHandler`, `io/HomeXMLExporter`, `io/XMLWriter`, `io/ObjectXMLExporter`
> Target: `packages/core/src/io/`

This is the compatibility moat of the whole project. Get this right and
everything else (plan, 3D, photo) can be validated against real user files.

## 1. Container format

`.sh3d` is a **ZIP archive** (`java.util.zip`). Entries (from
`DefaultHomeOutputStream.writeHome` / `DefaultHomeInputStream.readHome`):

| Entry name | Content | Written by Java 7.x | Read by Java 7.x |
|---|---|---|---|
| `Home` | Java-serialized object graph (`ObjectOutputStream` on the `Home`). Legacy format; contents referenced via `jar:file:temp!/<name>` URLs. | yes (unless XML-only mode) | yes (if `Home.xml` missing or damaged) |
| `Home.xml` | Canonical XML document (UTF-8), written second by the writer. Preferred on read. | yes | **preferred** |
| `ContentDigests` | Repair manifest (added in v4.4): `ContentDigests-Version: 1.0` then repeated `Name: <entry>` + `SHA-1-Digest: <base64>` pairs, one per content entry | yes (when content saved) | yes (repair) |
| `<index>` or `<index>/<file>` | Referenced content blobs. **Single-file** content (PNG/JPG textures, OBJ without dependencies) is written as a bare index entry `0`, `1`, `2`…; **multi-part** content (OBJ+MTL+textures, DAE+textures) is written as a directory `3/armchair.obj`, `3/armchair.mtl`, `3/armchair.png`, … (entry name = index + original path/name). Dedup: content with an identical SHA-1 digest reuses an existing entry name. | yes | yes |

Additional notes from source:

- `DefaultHomeInputStream.readHome()` also accepts a **non-zipped XML stream**
  (a bare `Home.xml`). Good for tests; keep the ability.
- The writer writes home data first (`Home`, then `Home.xml`), then
  `ContentDigests`, then the content entries themselves (deduplicated by
  SHA-1 digest via `ContentDigestManager`).
- The XML `Home.xml` references content by **saved content name**
  (`getExportedContentName` → `0/armchair.obj`, or the raw URL when the
  content wasn't saved); the reader resolves names through
  `HomeContentContext.lookupContent` (zip entry, or URL for URL-named
  content) and uses `ContentDigests` to **repair damaged entries** silently.
- `ContentRecording` modes: `INCLUDE_ALL_CONTENT`, `INCLUDE_TEMPORARY_CONTENT`,
  `INCLUDE_NO_CONTENT` — control whether temporary (user-added) content is
  embedded. For web, we always embed all content (that's what makes files
  portable), matching the default save behavior of the app UI.
- Zip compression level 0–9 (default in UI ~4).

### 1.1 The `Home.xml` schema (authoritative for our writer)

The schema is implemented by `HomeXMLHandler` (reader, SAX) and
`HomeXMLExporter` (writer) plus `ObjectXMLExporter` (shared element writers for
pieces of furniture, textures, materials…). Root element:

```xml
<home version="7400" name="..." camera="observerCamera|topCamera"
      selectedLevel="levelId?" wallHeight="250" basePlanLocked="false"
      furnitureSortedProperty="..." furnitureDescendingSorted="false">
  <property name="..." value="..."/>            <!-- arbitrary string props -->
  <furnitureVisibleProperty name="CATALOG_ID"/> <!-- which columns visible -->
  <environment .../>                             <!-- HomeEnvironment -->
  <backgroundImage .../>
  <print .../>
  <compass .../>
  <observerCamera .../> / <topCamera .../> / <storedCamera .../>
  <level id="..." ...>...</level>*
  <pieceOfFurniture id="..." ...>...</pieceOfFurniture>*
  <doorOrWindow .../>*  <light .../>*  <shelfUnit .../>*  <furnitureGroup>...</furnitureGroup>*
  <wall id="..." ...>...</wall>*
  <room ...>...</room>*
  <polyline ...>...</polyline>*
  <dimensionLine .../>*
  <label .../>*
</home>
```

Element/attribute details (from `HomeXMLHandler.endElement` and exporters):

- **furniture**: `<pieceOfFurniture>` with attributes for catalog id, name,
  x/y/z, angle (yaw), pitch, roll, width/depth/height, color, model content
  (`model` = content file name inside the zip), texture, materials
  (`<material>` elements with color + texture + shininess), movability,
  visibility, deformable, resizable, model mirrored, name label attributes,
  elevation, level id, light sources (`<lightSource>`), box, `homeTransform`
  (9 floats for groups with rotation), group contents as nested elements.
  `<doorOrWindow>` adds wall attachment attrs + `<sash>` elements.
  `<light>` adds power + light source/material names. `<shelfUnit>` adds
  shelf elevations + `<shelfBox>`.
- **walls**: `<wall>` with xStart/yStart/xEnd/yEnd, arcExtent, thickness,
  height, wallAtStart/End (ids of walls to attach), `<baseboard>` elements for
  left/right sides (height, thickness, color/texture), `id`.
- **rooms**: `<room>` with `<point x y>` children, floor/ceiling/trim colors,
  floor texture, area color, name + label style attrs, level.
- **polylines**: `<polyline>` with `<point>`s, thickness, cap/join/dash,
  arrows, closed, color, elevation, visibleIn3D, level.
- **dimensionLine / label**: straightforward attribute sets.
- **levels**: `<level>` with id, name, elevation, height, floorThickness,
  background image, visible, viewable.
- **cameras**: `<camera>`-style elements with x/y/z, yaw, pitch, fov, time,
  lens; `observerCamera` additionally has width/depth/height + fixedSize;
  camera-path cameras nested under `<environment>` as `<camera attribute="cameraPath">`.
- **environment**: sky/ground colors + textures, light color, walls alpha,
  drawing mode, ground/ceiling visibility, video camera path, subpart lights.
- **compass**: x/y, diameter, visible, northDirection, latitude, longitude,
  timeZone.
- **print**: paper format/size, orientation, margins, printed furniture flags,
  `<printedLevel>` children.
- **backgroundImage**: content + scale + offset + rotation.

The XML reader must tolerate **unknown/ignored elements and attributes** (files
created by newer versions must still open; upstream explicitly keeps backward
compatibility `KEEP_BACKWARD_COMPATIBLITY = true`).

## 2. Floating point policy

- Java model uses `float` (24-bit mantissa). JS `number` is double.
- Every XML float attribute was written from a `float` via
  `writer.writeFloatAttribute` — Java prints e.g. `250.0`, `3.1415927`.
- To make **our writer's output byte-identical** to Java's where possible, and
  to make our reader's values equal Java's parsed values:
  1. **On read**: parse with `parseFloat`, then `Math.fround` — same as Java
     `Float.parseFloat` (Java's `Float.parseFloat` returns a float; assigning
     to a `float` field rounds to float32).
  2. **On write**: format using the same rule as Java's `Float.toString`
     → shortest decimal that round-trips float32 (`String.valueOf(float)`).
     JS lacks `Float.toString`; implement: `f32(x).toString()` differs for
     some values because JS prints doubles. Need a helper
     `formatFloat(f: number): string` that applies Java's algorithm
     (shortest decimal that parses back to the same float32 — basically
     `f32` + printing with enough digits; simplest correct approach:
     `String(f32(x))` then round-trip check against `parseFloat`→`fround`,
     trimming digits, like Java's float toString). Unit-test against Java
     output for a large sample of floats.
  3. **In geometry**: apply `fround` at the same points Java narrows
     (method args/results typed `float`). A `f32()` helper + review markers.
- Round-trip guarantee: `Home.xml → our reader → our writer → our reader` is
  identity; `Java writer → our reader` equals `Java reader` output field by
  field (verified by fixture tests).

## 3. Reading the legacy serialized `Home` entry

Old `.sh3d` files (pre-7.x and many 7.x files) contain a Java-serialized
`Home`. Options:

1. **Do not support** — unacceptable; there are millions of these files.
2. **Implement a Java-serialization reader in TS.** The format is documented
   (magic `0xAC ED`, `0x00 0x05`; TC_* tags; class descriptors; UTF
   modified strings; arrays; object graphs with back-references). The `Home`
   graph is large but finite: `Home`, `ArrayList`, `HashMap`, `String`,
   `Float`, `Integer`, `Boolean`, `HomePieceOfFurniture`,
   `HomeDoorOrWindow`, `HomeLight`, `HomeFurnitureGroup`,
   `HomeEnvironment`, `Camera`, `ObserverCamera`, `HomeTexture`,
   `HomeMaterial`, `HomeRoom`, `Wall`, `Compass`, `BackgroundImage`,
   `HomePrint`, `LengthUnit`, enums, `java.net.URL` (for content), plus
   `com.eteks.sweethome3d.tools.*Content` classes. Each is a plain field
   reader. This is very tractable: a few hundred lines + one mapper class per
   serialized type.
3. **Use a JS/WASM Java-serialization library** (e.g., port of `JavaSerializer`
   or write our own). There are mature OSS readers for the wire format
   (used by pyserde/javaobj-py3 etc.) — a TS port of `javaobj` (python) is a
   good blueprint.

**Decision: implement a TS `JavaDeserializer`** that produces `Home` instances
directly (not raw maps), with a typed "serialized class descriptor" table.
Where Java object fields are transient, they're absent — the deserializer
must run the same post-read normalization the Java app runs
(`readObject` + `readResolve`). Version tolerance: fields added in newer
versions are simply absent (Java fields not present in the stream keep their
Java defaults — mirror those defaults).

We do **not** write the serialized `Home` entry (Java 7.x doesn't need it to
reopen our files, since it prefers `Home.xml`; the UI checkbox "save Home.xml
entry" defaults on). For maximum compatibility, write both entries optionally
via a setting; the writer is cheap once the reader exists — but serialization
of our own graph is a larger project, so **v1 writes only `Home.xml`** and we
verify Java 7.5 opens it.

## 4. Content management

- Every furniture `model` and every texture is a `Content` (file or URL).
  In the zip they live as index-named entries (`0`, `1`, … or `5/sofa.obj` +
  siblings) chosen by `ContentTracker` (`savedContentIndex++ + subEntryName`).
- `ContentDigestManager` computes SHA-1 digests; duplicate content reuses an
  existing entry name (dedup by digest), and the `ContentDigests` manifest
  records name→digest for **repair**: when an entry is damaged or missing,
  the reader substitutes equal-digest content from preferences/default
  catalog and flags the home `REPAIRED`.
- **Web impl**: compute digests with WebCrypto SHA-1; store blobs in a Map +
  zip via `fflate`; when reading a zip, materialize entries lazily into a
  `Content` registry (`Content.openStream()` → `Blob`); parse `ContentDigests`
  into a name→digest map to drive the same repair flow.
- **Entry-name parity**: when *writing* we must generate the same
  `<index>`/`<index>/<file>` names Java would (same index order = order of
  first encounter while serializing content) so XML bytes match for parity
  tests. Since v1 writes only `Home.xml` (no serialized `Home`), the index
  order is the order contents are encountered while writing the XML —
  deterministically replicate Java's traversal order (home fields, furniture
  in list order, walls, rooms, …).

## 5. Codec API design (TS)

```ts
// packages/core/src/io/
export class HomeFileRecorder {
  readHomeFromZip(zip: Uint8Array, opts?): Promise<ReadHomeResult>; // detects entry type
  readHomeFromXml(xml: string): Home;
  readHomeFromSerialized(bytes: Uint8Array): Home;       // JavaDeserializer path
  writeHome(home: Home, opts?: { includeXml?: boolean; compressLevel?: number }): Promise<Uint8Array>;
  readCatalogFromZip(...): FurnitureCatalog;              // .sh3f furniture libraries
  readTexturesCatalogFromZip(...): TexturesCatalog;      // .sh3t
}

export class HomeXMLHandler { /* SAX-style, but with DOMParser + iterative walk
                                 to avoid JS call-stack limits on huge files */ }
export class HomeXMLExporter { writeHome(writer: XMLWriter, home: Home): void; }
export class XMLWriter { /* DOM builder producing canonical output */ }
export class JavaDeserializer { /* legacy Home entry */ }
export class ContentDigestManager { sha1(blob): Promise<string>; }
```

Reading strategy: for large files (a 50 MB home with many models), do the zip
in a worker (`fflate` + `Comlink`), parse `Home.xml` with `DOMParser`
(saxes-style streaming if DOM is too memory-hungry), and resolve content
entries lazily (only fetch a model blob when the 3D view needs it).

## 6. Catalog / library files

- Furniture libraries (`.sh3f`) and textures libraries (`.sh3t`) are the **same
  zip format**: an XML entry (`FurnitureCatalog.xml` / `TexturesCatalog.xml`),
  content entries, and `Content.xml`.
- `ObjectXMLExporter`/handlers already generalize: `<catalog>`, `<category>`,
  `<pieceOfFurniture>`, `<texture>` with content references. The same codec
  classes handle them with a different root element — so library import is
  nearly free once the home codec exists.
- Default furniture/textures catalogs are themselves resource zips inside the
  Java jars (`io/resources` models + `DefaultFurnitureCatalog.properties`).
  On web: serve as static assets or an IndexedDB-backed default library;
  parsed by the same catalog reader (see [10-catalogs-and-content.md](10-catalogs-and-content.md)).

## 7. Export formats reused for import

- `ObjectXMLExporter` also writes individual furniture as XML (copy/paste and
  "export furniture"). Port alongside the home exporter.
- `XMLWriter` escaping rules must match Java (`&`, `<`, `>`, `"`, `'`, and
  non-ASCII as-is in UTF-8).

## 8. Parity test matrix (see [12-testing-and-parity.md](12-testing-and-parity.md))

1. **Round-trip identity**: for N fixture homes: `read(write(h)) ≈ h`
   (field-diff tolerant to float32 rounding).
2. **Java↔JS cross-read**: Java-written `.sh3d` → our reader → field-dump;
   compare with Java's own field-dump of the same file.
3. **XML byte parity**: our writer's `Home.xml` vs Java's for the same home
   (allow whitespace/attr-order diffs if XMLWriter ordering differs — but we
   should match ordering anyway; it's deterministic in Java). Content entry
   names (`0/…`, `1/…`) must also match Java's traversal order.
4. **Legacy entry**: Java files with only serialized `Home` (older versions
   generated by upstream, plus files produced with "XML entry" disabled) →
   our deserializer → field-dump parity.
5. **Schema tolerance**: mutate/remove attributes → still opens (or fails
   with the same error class as Java: `DamagedHomeIOException` vs
   `DamagedHomeRecorderException`).
6. **Content**: digest naming, dedup, damaged-content repair flow.

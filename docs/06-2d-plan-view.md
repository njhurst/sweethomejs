# 06 — The 2D Plan View

> Java: `swing/PlanComponent.java` (7.1K LOC), `swing/PlanRulerComponent`,
> icons (`PieceOfFurniturePlanIcon`, `PieceOfFurnitureModelIcon`)
> Target: `packages/render2d/` — a canvas engine + `packages/ui/` React wrapper

The plan editor is the heart of the product. Java's `PlanComponent` is an
**immediate-mode `Graphics2D` painter** with a big `paintComponent(Graphics2D)`
plus many smaller paint methods, driven by model events and a cursor/scale
state. Canvas 2D is the same model: stateful path + transform + clip API.
This is the most faithful port available.

## 1. Coordinate model

```
Plan coordinates (user space, cm)  ──►  viewport transform  ──►  component pixels

paintComponent:
  g2D.translate(insets.left + (MARGIN - planBounds.minX) * scale,
                insets.top + (MARGIN - planBounds.minY) * scale);
  g2D.scale(scale, scale);          // scale = getScale() * resolutionScale
```

- `scale` is in pixels-per-cm (default 0.5 → 1:200 print scale).
- `planBounds` is the union of the drawn plan content (walls, furniture,
  dimensions, levels…), recomputed when content changes; MARGIN pads it.
- The plan is **y-up** in user space; Java2D is y-down, so plan code does
  `y = -y` conversions via `yUpToYDown` (`AffineTransform.getScaleInstance(1,-1)`)
  at specific points. Canvas2D is also y-down — same conversion needed.
- `resolutionScale` accounts for HiDPI (devicePixelRatio); port as
  `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` base layer or use CSS scaling.
- Rubber-band zoom keeps the point under the cursor fixed: port
  `getZoomPoint`/`setZoomPoint` math exactly.

## 2. Rendering pipeline port (paint order matters)

From `paintComponent` and friends, the draw order is:

1. **Background** (plan background color / background image under the plan).
2. **Grid** (base grid + major grid lines), muted while tools active.
3. **Rulers** (`PlanRulerComponent` — separate component in Java; on web,
   a separate canvas or overlaid DOM elements; rendered in viewport space).
4. **Furniture catalog "current selection feedback"** etc. — tool overlays.
5. **Level-by-level drawing** (levels with elevation order):
   - background images per level
   - rooms (floor texture/color, outline)
   - walls (fill + outline, baseboards only in 3D)
   - dimension lines, labels, polylines
   - furniture: top-view icons (`PieceOfFurnitureTopViewIcon` family) or
     imported-model icons (3D previews rendered offscreen), with name labels
   - compass, scale bar
6. **Selection feedback** (highlighted outline, size grip rectangles,
   alignment/duplication dashed lines, rotation/elevation indicators,
   edited-property feedback for wall/room tools).
7. **Tool feedback** (tool tips, wall-under-construction preview, room fill
   preview, magnetic cursor, resize handles).

Porting note: `PieceOfFurnitureTopViewIcon` draws a **pre-rendered 3D image of
the model from the top** (created by `HomeComponent3D.startOffscreenImagesCreation`
→ `OffscreenImage`), falling back to a rectangle outline while loading.
On web we replicate: a `ModelIconRenderer` that renders the Three.js scene
top-down to an `OffscreenCanvas` per furniture item, cached by model digest;
until ready, draw the same placeholder (dashed rectangle + name). This icon
path is also used by the furniture catalog panel.

## 3. Interaction port

`PlanComponent` is both view and interaction surface. The Java class installs
`MouseListener/MouseMotionListener/MouseWheelListener/KeyListener` and
translates events into `PlanController` calls; `PlanController` owns all the
state machines and tool feedback. Porting rules:

| Java input                                       | Web input                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `MouseEvent` (click, press, drag, release, move) | `PointerEvent` (unify mouse + touch; `setPointerCapture`)                   |
| `MouseWheelEvent` (zoom/pan)                     | `wheel` event (with `ctrlKey` zoom semantics like the app)                  |
| `KeyEvent` / key bindings                        | `KeyboardEvent` on the canvas + document                                    |
| `MouseEvent.getButton`                           | `event.button` (0 left, 1 middle, 2 right)                                  |
| `isShiftDown/isControlDown/isAltDown`            | `event.shiftKey/ctrlKey/altKey`                                             |
| `SwingUtilities.isLeftMouseButton` etc.          | helpers                                                                     |
| Double-click detection                           | `detail` count on click                                                     |
| Tooltips (`setToolTipText`)                      | custom positioned tooltip div (plan draws its own tool-tip feedback anyway) |

**Cursor management**: Java sets named cursors (`CURSOR_MOVE`, resize cursors)
and draws a _custom plan cursor_ (the crosshair + tool icon). Port: hide the
DOM cursor over the canvas and draw the cursor ourselves in the plan canvas
(Java does exactly this via `setCustomCursor` + painted cursor), or set CSS
cursors — but note the Java app draws cursor _with tool feedback_, so painting
is more faithful.

**Magnetism**: plan snaps to grid and wall ends; the magnetic cursor feedback
(red line + crosshair) is painted — port `MAGNETISM` thresholds and feedback
painting.

## 4. Editing state machines (the PlanController port)

`PlanController` (15.9K LOC) is the largest single port. Structure:

```
PlanController (extends FurnitureController)
  └─ states: SelectionState, WallCreationState, RoomCreationState,
             PolylineCreationState, DimensionLineCreationState,
             LabelCreationState   (all extend AbstractModeChangeState)
  └─ tools instantiated per mode: selection tools (move, resize, rotate,
             align, duplicate), creation tools with their own
             mouse/keyboard handlers, panning/zoom tool
  └─ edit feedback: "tool tip feedback" (length/angle while drawing walls),
             "tool tip edited properties" (numeric entry fields drawn on the
             plan for X, Y, LENGTH, DIAGONAL, ANGLE, THICKNESS, OFFSET,
             ARC_EXTENT)
```

Porting guidance:

- Keep the exact state class structure; the unit tests upstream
  (`PlanControllerTest`, `PlanComponentTest`, `PlanComponentWithFurnitureTest`)
  simulate mouse events and assert model changes — port these tests with a
  `MockPlanView` and a synthetic event dispatcher. They are the spec.
- The **`EditableProperty` numeric-entry fields** (drawn on the plan, edited
  via keyboard, committed/escaped) are unusual UI; port as canvas-drawn text
  fields with a hidden `<input>` overlay for IME support.
- `PlanController` extends `FurnitureController` — port that hierarchy too.
- Menu actions (`PlanController` exposes `ActionType`-style actions) map to
  React menu items dispatching into the controller.

## 5. Rendering details to preserve

- **Anti-aliasing**: Java sets `RenderingHints.ANTIALIASING_ON`,
  `TEXT_ANTIALIASING_ON`, `STROKE_PURE`. Canvas2D: `ctx.imageSmoothingEnabled`,
  and draw paths with default AA; `STROKE_PURE` affects stroke geometry —
  the main visible difference is in hairline alignment; match via
  `ctx.lineWidth` and half-pixel alignment where Java uses PURE strokes.
- **Dashed lines**: Java `BasicStroke` dash patterns with `phase`; Canvas
  `setLineDash` + `lineDashOffset` — same semantics.
- **Text**: Java `Font` + `TextLayout`-ish metrics. Use Canvas `measureText`
  for `getStringBounds`-equivalent (note Java returns _logical_ bounds; the
  plan uses these for label centering — minor visual drift acceptable but
  keep an eye on label layout parity).
- **Hatches/textures**: plan floors use `TextureImage` patterns tiled via
  `TexturePaint`; port with `ctx.createPattern` from the pattern PNGs
  (the 8 patterns in `io/resources/patterns/`).
- **Icons**: furniture icons rendered from 3D previews (see above); catalog
  icons are pre-rendered PNGs in `io/resources/`.
- **SVG export**: `PlanComponent.SVGSupport` (inner class) writes plan to SVG
  via FreeHEP — port to direct `<path>` emission using the same paint
  functions parameterized by a "SVG painter" instead of Canvas2D. Design the
  painter as an interface from day one (`PlanPainter` with `moveTo/lineTo/
fillPath/strokePath/drawImage/drawText/setTransform`) with Canvas and SVG
  (and print-PDF) implementations.

## 6. Performance

- Java repaints on every model event (Swing coalesces). On web: subscribe to
  model events and request a **rAF-coalesced repaint** (same batching
  semantics; avoids redundant work in the same frame).
- Canvas is fast enough for typical homes (a few thousand items). Keep the
  paint order + culling (Java draws only items whose bounds intersect the
  clip — `paintComponent` clips, and individual paint methods check
  `g.getClipBounds().intersects`).
- Furniture icons: cache per model digest; evict least-recently-used.
- Levels: only visible/viewable levels drawn (same logic).
- HiDPI: draw at `devicePixelRatio` scale; crisp lines via integer pixel
  alignment for hairlines.

## 7. Keyboard navigation & accessibility

- Java plan supports arrow-key nudge (with Shift=10x), tab cycling, numeric
  entry. Port to the same key handling.
- Add a11y affordances the Java app lacks (ARIA on the canvas container,
  focus outline, keyboard-accessible furniture list) — a deliberate,
  documented improvement, kept out of the parity golden tests.

## 8. Deliverables checklist

- [ ] `PlanPainter` interface + Canvas2D + SVG implementations
- [ ] Viewport/transform module (scale, pan, zoom-at-point, HiDPI) with
      unit tests mirroring Java `paintComponent` transform math
- [ ] Paint-order pipeline ported with all layers
- [ ] Furniture top-view icons via offscreen 3D renders + placeholder
- [ ] Input translation layer (Pointer/Keyboard → controller events)
- [ ] `PlanController` state machines ported + upstream tests green
- [ ] Magnetic cursor, tool feedback, editable-property fields
- [ ] Golden-image parity vs Java (see [12-testing-and-parity.md](12-testing-and-parity.md))
- [ ] SVG export via `PlanPainter`

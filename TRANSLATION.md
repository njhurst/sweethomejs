# TRANSLATION.md — Java → TypeScript port mapping

Audit trail for GPL attribution and upstream bugfix mapping. Every translated
file gets a row here. Status values: `ported` (complete), `partial`, `planned`.

## Legend

- **Java** — upstream class in `src/SweetHome3D-7.5-src/src/com/eteks/sweethome3d/`
- **TS** — target file in `packages/`
- **Notes** — divergences, tricky semantics, float32 markers

## model → packages/core/src/model

| Java | TS | Status | Notes |
|---|---|---|---|
| `model/Home.java` | `model/Home.ts` | planned | CURRENT_VERSION=7400 |
| `model/Wall.java` | `model/Wall.ts` | planned | getPoints via GeneralPath shim |
| `model/Room.java` | `model/Room.ts` | planned | area/point-in-polygon |
| `model/HomePieceOfFurniture.java` | `model/HomePieceOfFurniture.ts` | planned | |
| `model/LengthUnit.java` | `model/LengthUnit.ts` | planned | formatting parity |
| … (64 model classes) | | planned | |

## viewcontroller → packages/core/src/controllers

| Java | TS | Status | Notes |
|---|---|---|---|
| `viewcontroller/PlanController.java` | `controllers/PlanController.ts` | planned | largest port |
| `viewcontroller/View.java` / `ViewFactory.java` | `controllers/View.ts` / `ViewFactory.ts` | planned | the seam |

## io → packages/core/src/io

| Java | TS | Status | Notes |
|---|---|---|---|
| `io/HomeXMLHandler.java` | `io/HomeXMLHandler.ts` | planned | |
| `io/HomeFileRecorder.java` | `io/HomeFileRecorder.ts` | planned | |
| `io/DefaultHomeInputStream.java` | `io/JavaDeserializer.ts` | planned | legacy `Home` entry |

## j3d → packages/render3d

| Java | TS | Status | Notes |
|---|---|---|---|
| `j3d/Object3DBranch.java` + subclasses | `render3d/object3d/*` | planned | Three.js builders |

## swing → packages/render2d + ui

| Java | TS | Status | Notes |
|---|---|---|---|
| `swing/PlanComponent.java` | `render2d/PlanRenderer.ts` | planned | PlanPainter seam |
| `swing/HomePane.java` | `ui/HomePane.tsx` | planned | React shell |

## Divergence ledger

*Append here any intentional behavioral divergence (see KNOWN_DIFFS.md for
visual differences).*

- **Area with self-intersecting rings**: `resolveSelfIntersecting` splits at
  crossings and face-traces; verified against the JDK for the bowtie case.
  Multi-ring non-zero paths with *reversed* inner rings (creating holes) are
  not yet distinguished from same-direction rings (a JDK divergence; the
  model only uses single-ring areas, so it is unreachable in practice).
- **(none yet)**

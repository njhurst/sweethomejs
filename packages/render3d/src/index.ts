/**
 * @sweethomejs/render3d — 3D view rendering (docs/07-3d-view.md).
 */
export { Object3DBase } from "./Object3DBase.js";
export type { Object3DContext } from "./Object3DBase.js";
export { MaterialCache, TextureCache, colorToThree, applyHomeTextureAttributes } from "./AttributeCaches.js";
export type { MaterialKey, LoadedTexture, TextureSource, HomeTextureAttributes } from "./AttributeCaches.js";
export { WallObject3D, buildPrismGeometry } from "./builders/WallObject3D.js";
export { RoomObject3D, FurnitureObject3D, DimensionLineObject3D, PolylineObject3D, LabelObject3D, GroundObject3D, buildPolygonGeometry } from "./builders/objectBuilders.js";
export { groundElevation, levelElevation } from "./builders/Elevations.js";
export { View3DCamera, applyModelCameraToThree } from "./View3DCamera.js";
export { SceneLights } from "./SceneLights.js";
export { SelectionBoxes3D, SELECTION_BOX_COLOR } from "./SelectionBoxes3D.js";

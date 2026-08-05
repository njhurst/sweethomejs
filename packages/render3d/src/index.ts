/**
 * @sweethomejs/render3d — 3D view rendering (docs/07-3d-view.md).
 */
export { Object3DBase } from "./Object3DBase.js";
export type { Object3DContext } from "./Object3DBase.js";
export {
  MaterialCache,
  TextureCache,
  colorToThree,
  applyHomeTextureAttributes,
} from "./AttributeCaches.js";
export type {
  MaterialKey,
  LoadedTexture,
  TextureSource,
  HomeTextureAttributes,
} from "./AttributeCaches.js";
export { WallObject3D, buildPrismGeometry } from "./builders/WallObject3D.js";
export {
  RoomObject3D,
  FurnitureObject3D,
  DimensionLineObject3D,
  PolylineObject3D,
  LabelObject3D,
  GroundObject3D,
  buildPolygonGeometry,
} from "./builders/objectBuilders.js";
export { groundElevation, levelElevation } from "./builders/Elevations.js";
export { View3DCamera, applyModelCameraToThree } from "./View3DCamera.js";
export { SceneLights } from "./SceneLights.js";
export { SelectionBoxes3D, SELECTION_BOX_COLOR } from "./SelectionBoxes3D.js";
export {
  ModelManager,
  detectModelFormat,
  computeModelBounds,
  normalizeModel,
} from "./ModelManager.js";
export type { LoadedModel, ModelSource, ModelLoader, ModelLoaderFactory } from "./ModelManager.js";
export { TopViewIconRenderer } from "./TopViewIconRenderer.js";
export type { TopViewIconRendererOptions } from "./TopViewIconRenderer.js";
export { InstancedFurniture } from "./InstancedFurniture.js";
export { createRoomEnvironment, createSceneEnvironment } from "./DesignEnvironment.js";
export type { DesignEnvironment, SceneEnvironmentOptions } from "./DesignEnvironment.js";
export { createDesignComposer } from "./DesignComposer.js";
export type { DesignComposer, DesignComposerOptions } from "./DesignComposer.js";
export { HomeScene3D } from "./HomeScene3D.js";
export type { HomeScene3DOptions } from "./HomeScene3D.js";
export { buildSceneIntermediate } from "./SceneIntermediate.js";
export type { SceneIntermediate, SceneIntermediateOptions } from "./SceneIntermediate.js";

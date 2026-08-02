/**
 * @sweethomejs/render2d — 2D plan rendering (docs/06-2d-plan-view.md).
 */
export type { Color, PaintStyle, StrokeStyle, FontStyle, PlanPainter } from "./PlanPainter.js";
export { Canvas2DPainter } from "./Canvas2DPainter.js";
export { PlanViewport } from "./PlanViewport.js";
export { PlanPainterPipeline, DEFAULT_PLAN_COLORS } from "./PlanPainterPipeline.js";
export type { PlanColors, PlanPaintOptions } from "./PlanPainterPipeline.js";
export { FurnitureIconCache, getModelIdentity, paintFurniturePlanIcon } from "./FurnitureIconCache.js";
export type { FurnitureIconRenderer } from "./FurnitureIconCache.js";
export { PlanInputAdapter } from "./PlanInputAdapter.js";
export { paintSelectionOutline, paintPointIndicators, paintItemGrips, paintSelectionFeedback, DEFAULT_SELECTION_COLOR } from "./SelectionFeedbackPainter.js";
export type { SelectionFeedbackColors } from "./SelectionFeedbackPainter.js";
export { emptyToolTip, paintToolTip, emptyAlignmentFeedback, paintAlignmentFeedback, EditablePropertyInput, commitEditableProperty } from "./ToolFeedback.js";
export type { ToolTipState, AlignmentFeedbackState, EditablePropertyInputOptions } from "./ToolFeedback.js";
export { SVGPainter } from "./SVGPainter.js";

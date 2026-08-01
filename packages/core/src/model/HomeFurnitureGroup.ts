/**
 * Port of com.eteks.sweethome3d.model.HomeFurnitureGroup (GPL v2+).
 *
 * A group of furniture pieces that move, rotate and resize together. The
 * group's location and size are recomputed from its children whenever a child
 * moves or resizes (via a property-change listener). The group declares its
 * own resizable/deformable/texturable/doorOrWindow flags (all-children AND),
 * like the Java implementation.
 */
import { AffineTransform } from "../geom/AffineTransform.js";
import { GeneralPath } from "../geom/GeneralPath.js";
import { Point2D } from "../geom/Point2D.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";
import type { Content } from "./Content.js";
import type { Level } from "./Level.js";

export class HomeFurnitureGroup extends HomePieceOfFurniture {
  private readonly furniture: HomePieceOfFurniture[];
  private resizableFlag = true;
  private deformableFlag = true;
  private texturableFlag = true;
  private doorOrWindowFlag = true;
  private fixedWidth = 0;
  private fixedDepth = 0;
  private fixedHeight = 0;
  private dropOnTopElevationValue = 0;
  private currencyValue: string | null = null;

  constructor(furniture: HomePieceOfFurniture[], name: string);
  constructor(furniture: HomePieceOfFurniture[], leadingPiece: HomePieceOfFurniture, name: string);
  constructor(furniture: HomePieceOfFurniture[], angle: number, modelMirrored: boolean, name: string);
  constructor(id: string, furniture: HomePieceOfFurniture[], angle: number, modelMirrored: boolean, name: string);
  constructor(
    idOrFurniture: string | HomePieceOfFurniture[],
    furnitureOrArg: HomePieceOfFurniture[] | HomePieceOfFurniture | number | string,
    arg2?: HomePieceOfFurniture | number | boolean | string,
    arg3?: boolean | string,
    arg4?: string,
  ) {
    let id: string | null;
    let furniture: HomePieceOfFurniture[];
    let angle: number;
    let modelMirrored: boolean;
    let name: string;
    let init = true;
    if (typeof idOrFurniture === "string") {
      id = idOrFurniture;
      furniture = furnitureOrArg as HomePieceOfFurniture[];
      angle = arg2 as number;
      modelMirrored = arg3 as boolean;
      name = arg4 as string;
    } else if (typeof furnitureOrArg === "number") {
      id = null;
      furniture = idOrFurniture;
      angle = furnitureOrArg;
      modelMirrored = arg2 as boolean;
      name = arg3 as string;
    } else if (furnitureOrArg instanceof HomePieceOfFurniture) {
      id = null;
      furniture = idOrFurniture;
      angle = furnitureOrArg.getAngle();
      modelMirrored = false;
      name = arg2 as string;
      init = false;
    } else {
      id = null;
      furniture = idOrFurniture;
      angle = furniture[0]!.getAngle();
      modelMirrored = false;
      name = furnitureOrArg as string;
    }
    super(id ?? HomeObject.createId("furnitureGroup"), furniture[0]!);
    this.furniture = [...furniture];

    this.resizableFlag = true;
    this.deformableFlag = true;
    this.texturableFlag = true;
    this.doorOrWindowFlag = true;

    let movable = true;
    let visible = false;
    this.currencyValue = furniture[0]!.getCurrency();
    for (const piece of furniture) {
      movable &&= piece.isMovable();
      visible ||= piece.isVisible();
      this.resizableFlag &&= piece.isResizable();
      this.deformableFlag &&= piece.isDeformable();
      this.texturableFlag &&= piece.isTexturable();
      this.doorOrWindowFlag &&= piece.isDoorOrWindow();
      if (this.currencyValue !== null) {
        if (piece.getCurrency() === null || piece.getCurrency() !== this.currencyValue) {
          this.currencyValue = null;
        }
      }
    }

    this.setName(name);
    this.setCatalogId(null);
    this.setDescription(null);
    this.setInformation(null);
    this.setCreator(null);
    this.setNameVisible(false);
    this.setNameXOffset(0);
    this.setNameYOffset(0);
    this.setNameAngle(0);
    this.setNameStyle(null);
    super.setIcon(null);
    super.setPlanIcon(null);
    super.setModel(null);
    super.setMovable(movable);
    super.setAngle(angle);
    super.setModelMirrored(modelMirrored);
    this.setVisible(visible);

    this.updateLocationAndSize(furniture, angle, init);
    this.addFurnitureListener();
  }

  private furnitureListener: ((evt: unknown) => void) | null = null;

  private addFurnitureListener(): void {
    this.furnitureListener = (evt) => {
      const property = (evt as { propertyName?: string }).propertyName ?? "";
      if (
        property === HomePieceOfFurniture.Property.X ||
        property === HomePieceOfFurniture.Property.Y ||
        property === HomePieceOfFurniture.Property.ELEVATION ||
        property === HomePieceOfFurniture.Property.ANGLE ||
        property === HomePieceOfFurniture.Property.WIDTH_IN_PLAN ||
        property === HomePieceOfFurniture.Property.DEPTH_IN_PLAN ||
        property === HomePieceOfFurniture.Property.HEIGHT_IN_PLAN
      ) {
        this.updateLocationAndSize(this.furniture, this.getAngle(), false);
      }
    };
    for (const piece of this.furniture) {
      for (const property of [
        HomePieceOfFurniture.Property.X,
        HomePieceOfFurniture.Property.Y,
        HomePieceOfFurniture.Property.ELEVATION,
        HomePieceOfFurniture.Property.ANGLE,
        HomePieceOfFurniture.Property.WIDTH_IN_PLAN,
        HomePieceOfFurniture.Property.DEPTH_IN_PLAN,
        HomePieceOfFurniture.Property.HEIGHT_IN_PLAN,
      ]) {
        piece.addPropertyChangeListenerFor(property, this.furnitureListener);
      }
    }
  }

  /** Recomputes the group's location and size from its furniture. */
  updateLocationAndSize(furniture: HomePieceOfFurniture[], angle: number, init: boolean): void {
    let elevation = Number.POSITIVE_INFINITY;
    if (init) {
      // Search the lowest level elevation among grouped furniture
      let minLevel: Level | null = null;
      for (const piece of furniture) {
        const level = piece.getLevel();
        if (level !== null && (minLevel === null || level.getElevation() < minLevel.getElevation())) {
          minLevel = level;
        }
      }
      for (const piece of furniture) {
        if (piece.getLevel() !== null) {
          elevation = Math.min(elevation, piece.getGroundElevation() - (minLevel?.getElevation() ?? 0));
          piece.setElevation(piece.getGroundElevation() - (minLevel?.getElevation() ?? 0));
          piece.setLevel(null);
        } else {
          elevation = Math.min(elevation, piece.getElevation());
        }
      }
    } else {
      for (const piece of furniture) {
        elevation = Math.min(elevation, piece.getElevation());
      }
    }

    let height = 0;
    let dropOnTopElevation = -1;
    for (const piece of furniture) {
      height = Math.max(height, piece.getElevation() + piece.getHeightInPlan());
      if (piece.getDropOnTopElevation() >= 0) {
        dropOnTopElevation = Math.max(dropOnTopElevation, piece.getElevation() + piece.getHeightInPlan() * piece.getDropOnTopElevation());
      }
    }
    height -= elevation;
    dropOnTopElevation -= elevation;

    const { width, depth, centerX, centerY } = computeGroupBounds(furniture, angle);
    this.fixedWidth = width;
    this.fixedDepth = depth;
    this.fixedHeight = height;
    this.dropOnTopElevationValue = height > 0 ? dropOnTopElevation / height : 0;
    super.setX(f32(centerX));
    super.setY(f32(centerY));
    super.setElevation(f32(elevation));
    super.setWidth(f32(width));
    super.setWidthInPlan(f32(width));
    super.setDepth(f32(depth));
    super.setDepthInPlan(f32(depth));
    super.setHeight(f32(height));
    super.setHeightInPlan(f32(height));
  }

  // ------------------------------------------------------------------- lists

  getFurniture(): HomePieceOfFurniture[] {
    return [...this.furniture];
  }

  getAllFurniture(): HomePieceOfFurniture[] {
    const pieces = [...this.furniture];
    for (const piece of this.furniture) {
      if (piece instanceof HomeFurnitureGroup) {
        pieces.push(...piece.getAllFurniture());
      }
    }
    return pieces;
  }

  private getFurnitureWithoutGroups(furniture: HomePieceOfFurniture[]): HomePieceOfFurniture[] {
    const pieces: HomePieceOfFurniture[] = [];
    for (const piece of furniture) {
      if (piece instanceof HomeFurnitureGroup) {
        pieces.push(...this.getFurnitureWithoutGroups(piece.getFurniture()));
      } else {
        pieces.push(piece);
      }
    }
    return pieces;
  }

  addPieceOfFurniture(piece: HomePieceOfFurniture, index: number): void {
    this.furniture.splice(index, 0, piece);
    if (this.furnitureListener !== null) {
      for (const property of [
        HomePieceOfFurniture.Property.X,
        HomePieceOfFurniture.Property.Y,
        HomePieceOfFurniture.Property.ELEVATION,
        HomePieceOfFurniture.Property.ANGLE,
        HomePieceOfFurniture.Property.WIDTH_IN_PLAN,
        HomePieceOfFurniture.Property.DEPTH_IN_PLAN,
        HomePieceOfFurniture.Property.HEIGHT_IN_PLAN,
      ]) {
        piece.addPropertyChangeListenerFor(property, this.furnitureListener);
      }
    }
    this.updateLocationAndSize(this.furniture, this.getAngle(), false);
  }

  deletePieceOfFurniture(piece: HomePieceOfFurniture): void {
    const index = this.furniture.indexOf(piece);
    if (index !== -1) {
      this.furniture.splice(index, 1);
      this.updateLocationAndSize(this.furniture, this.getAngle(), false);
    }
  }

  // --------------------------------------------------------------- overrides

  override isDoorOrWindow(): boolean {
    return this.doorOrWindowFlag;
  }

  override isResizable(): boolean {
    return this.resizableFlag;
  }

  override isDeformable(): boolean {
    return this.deformableFlag;
  }

  override isTexturable(): boolean {
    return this.texturableFlag;
  }

  override getDropOnTopElevation(): number {
    return this.dropOnTopElevationValue;
  }

  override getIcon(): Content | null {
    return null;
  }

  override setIcon(_icon: Content | null): void {
    throw new Error("Can't set icon of a group");
  }

  override getPlanIcon(): Content | null {
    return null;
  }

  override setPlanIcon(_planIcon: Content | null): void {
    throw new Error("Can't set plan icon of a group");
  }

  override getModel(): Content | null {
    return null;
  }

  override setModel(_model: Content | null): void {
    throw new Error("Can't set model of a group");
  }

  override getModelSize(): number | null {
    return null;
  }

  override setModelSize(_modelSize: number | null): void {
    throw new Error("Can't set model size of a group");
  }

  override getModelRotation(): number[][] {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  override setModelRotation(_modelRotation: number[][]): void {
    throw new Error("Can't set model rotation of a group");
  }

  override isModelCenteredAtOrigin(): boolean {
    return true;
  }

  override getModelFlags(): number {
    return 0;
  }

  override setModelFlags(_modelFlags: number): void {
    throw new Error("Can't set model flags of a group");
  }

  override getStaircaseCutOutShape(): string | null {
    return null;
  }

  override setStaircaseCutOutShape(_staircaseCutOutShape: string | null): void {
    throw new Error("Can't set staircase cut out shape of a group");
  }

  override getWidth(): number {
    return this.resizableFlag ? super.getWidth() : this.fixedWidth;
  }

  override getWidthInPlan(): number {
    return this.getWidth();
  }

  override getDepth(): number {
    return this.resizableFlag ? super.getDepth() : this.fixedDepth;
  }

  override getDepthInPlan(): number {
    return this.getDepth();
  }

  override getHeight(): number {
    return this.resizableFlag ? super.getHeight() : this.fixedHeight;
  }

  override getHeightInPlan(): number {
    return this.getHeight();
  }

  override getCurrency(): string | null {
    return this.currencyValue;
  }

  override getValueAddedTax(): number {
    let valueAddedTax: number | null = null;
    for (const piece of this.furniture) {
      const pieceValueAddedTax = piece.getValueAddedTax();
      if (pieceValueAddedTax !== null && pieceValueAddedTax !== 0) {
        valueAddedTax = (valueAddedTax ?? 0) + pieceValueAddedTax;
      }
    }
    return valueAddedTax ?? 0;
  }

  override getPriceValueAddedTaxIncluded(): number {
    let priceValueAddedTaxIncluded: number | null = null;
    for (const piece of this.furniture) {
      if (piece.getPrice() !== null) {
        priceValueAddedTaxIncluded = (priceValueAddedTaxIncluded ?? 0) + piece.getPriceValueAddedTaxIncluded();
      }
    }
    return priceValueAddedTaxIncluded ?? 0;
  }

  override setX(x: number): void {
    if (x !== this.getX()) {
      const dx = x - this.getX();
      for (const piece of this.furniture) {
        piece.setX(piece.getX() + dx);
      }
      super.setX(x);
    }
  }

  override setY(y: number): void {
    if (y !== this.getY()) {
      const dy = y - this.getY();
      for (const piece of this.furniture) {
        piece.setY(piece.getY() + dy);
      }
      super.setY(y);
    }
  }

  override setAngle(angle: number): void {
    if (angle !== this.getAngle()) {
      const angleDelta = angle - this.getAngle();
      const cosAngleDelta = Math.cos(angleDelta);
      const sinAngleDelta = Math.sin(angleDelta);
      const groupX = this.getX();
      const groupY = this.getY();
      for (const piece of this.furniture) {
        piece.setAngle(piece.getAngle() + angleDelta);
        const newX = groupX + (piece.getX() - groupX) * cosAngleDelta - (piece.getY() - groupY) * sinAngleDelta;
        const newY = groupY + (piece.getX() - groupX) * sinAngleDelta + (piece.getY() - groupY) * cosAngleDelta;
        piece.setX(f32(newX));
        piece.setY(f32(newY));
      }
      super.setAngle(angle);
    }
  }
}

/** Computes the group's unrotated bounding rectangle, its size and its center. */
function computeGroupBounds(furniture: HomePieceOfFurniture[], angle: number): { width: number; depth: number; centerX: number; centerY: number } {
  const rotation = AffineTransform.getRotateInstance(-angle);
  let unrotatedBoundingRectangle: Rect2D | null = null;
  for (const piece of furniture) {
    const pieceShape = new GeneralPath();
    const points = piece.getPoints();
    pieceShape.moveTo(points[0]![0]!, points[0]![1]!);
    for (let i = 1; i < points.length; i++) {
      pieceShape.lineTo(points[i]![0]!, points[i]![1]!);
    }
    pieceShape.closePath();
    const bounds = rotation.createTransformedShape(pieceShape).getBounds2D();
    if (unrotatedBoundingRectangle === null) {
      unrotatedBoundingRectangle = bounds;
    } else {
      unrotatedBoundingRectangle.addRect(bounds);
    }
  }
  if (unrotatedBoundingRectangle === null) {
    return { width: 0, depth: 0, centerX: 0, centerY: 0 };
  }
  const center = new Point2D(unrotatedBoundingRectangle.getCenterX(), unrotatedBoundingRectangle.getCenterY());
  const rotatedCenter = AffineTransform.getRotateInstance(angle).transformPoint(center.x, center.y);
  return {
    width: unrotatedBoundingRectangle.getWidth(),
    depth: unrotatedBoundingRectangle.getHeight(),
    centerX: rotatedCenter.x,
    centerY: rotatedCenter.y,
  };
}

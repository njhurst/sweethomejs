/**
 * Port of com.eteks.sweethome3d.model.HomePieceOfFurniture (GPL v2+).
 *
 * A piece of furniture placed in a home: 3D transform (x/y/angle/pitch/roll),
 * model content, materials, price and plan footprint (widthInPlan/depthInPlan
 * are the pitch/roll-projected dimensions used on the plan).
 */
import { AffineTransform } from "../geom/AffineTransform.js";
import { GeneralPath } from "../geom/GeneralPath.js";
import { Point2D } from "../geom/Point2D.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import type { Content } from "./Content.js";
import type { Elevatable } from "./Elevatable.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { PieceOfFurniture } from "./PieceOfFurniture.js";
import type { Selectable } from "./Selectable.js";
import type { HomeMaterial, HomeTexture, TextStyle, Transformation } from "./stubs.js";
import type { Wall } from "./Wall.js";

const STRAIGHT_WALL_ANGLE_MARGIN = (5 * Math.PI) / 180;
const ROUND_WALL_ANGLE_MARGIN = (15 * Math.PI) / 180;

export class HomePieceOfFurniture extends HomeObject implements PieceOfFurniture, Selectable, Elevatable {
  static readonly Property = {
    CATALOG_ID: "CATALOG_ID",
    NAME: "NAME",
    NAME_VISIBLE: "NAME_VISIBLE",
    NAME_X_OFFSET: "NAME_X_OFFSET",
    NAME_Y_OFFSET: "NAME_Y_OFFSET",
    NAME_STYLE: "NAME_STYLE",
    NAME_ANGLE: "NAME_ANGLE",
    DESCRIPTION: "DESCRIPTION",
    INFORMATION: "INFORMATION",
    CREATOR: "CREATOR",
    LICENSE: "LICENSE",
    ICON: "ICON",
    PLAN_ICON: "PLAN_ICON",
    MODEL: "MODEL",
    MODEL_SIZE: "MODEL_SIZE",
    MODEL_MATERIALS: "MODEL_MATERIALS",
    MODEL_ROTATION: "MODEL_ROTATION",
    MODEL_FLAGS: "MODEL_FLAGS",
    MODEL_CENTERED_AT_ORIGIN: "MODEL_CENTERED_AT_ORIGIN",
    MODEL_TRANSFORMATIONS: "MODEL_TRANSFORMATIONS",
    STAIRCASE_CUT_OUT_SHAPE: "STAIRCASE_CUT_OUT_SHAPE",
    WIDTH: "WIDTH",
    WIDTH_IN_PLAN: "WIDTH_IN_PLAN",
    DEPTH: "DEPTH",
    DEPTH_IN_PLAN: "DEPTH_IN_PLAN",
    HEIGHT: "HEIGHT",
    HEIGHT_IN_PLAN: "HEIGHT_IN_PLAN",
    ELEVATION: "ELEVATION",
    DROP_ON_TOP_ELEVATION: "DROP_ON_TOP_ELEVATION",
    MOVABLE: "MOVABLE",
    COLOR: "COLOR",
    TEXTURE: "TEXTURE",
    SHININESS: "SHININESS",
    RESIZABLE: "RESIZABLE",
    DEFORMABLE: "DEFORMABLE",
    TEXTURABLE: "TEXTURABLE",
    HORIZONTALLY_ROTATABLE: "HORIZONTALLY_ROTATABLE",
    PRICE: "PRICE",
    VALUE_ADDED_TAX_PERCENTAGE: "VALUE_ADDED_TAX_PERCENTAGE",
    CURRENCY: "CURRENCY",
    VISIBLE: "VISIBLE",
    X: "X",
    Y: "Y",
    ANGLE: "ANGLE",
    PITCH: "PITCH",
    ROLL: "ROLL",
    MODEL_MIRRORED: "MODEL_MIRRORED",
    LEVEL: "LEVEL",
  } as const;

  static readonly SortableProperty = {
    CATALOG_ID: "CATALOG_ID",
    NAME: "NAME",
    DESCRIPTION: "DESCRIPTION",
    CREATOR: "CREATOR",
    LICENSE: "LICENSE",
    WIDTH: "WIDTH",
    DEPTH: "DEPTH",
    HEIGHT: "HEIGHT",
    MOVABLE: "MOVABLE",
    COLOR: "COLOR",
    TEXTURE: "TEXTURE",
    PRICE: "PRICE",
    VALUE_ADDED_TAX: "VALUE_ADDED_TAX",
    VALUE_ADDED_TAX_PERCENTAGE: "VALUE_ADDED_TAX_PERCENTAGE",
    X: "X",
    Y: "Y",
    ELEVATION: "ELEVATION",
    ANGLE: "ANGLE",
    LEVEL: "LEVEL",
  } as const;

  protected static readonly EMPTY_PROPERTY_ARRAY: string[] = [];

  private catalogId: string | null = null;
  private name: string | null = null;
  private nameVisible = true;
  private nameXOffset = 0;
  private nameYOffset = 0;
  private nameStyle: TextStyle | null = null;
  private nameAngle = 0;
  private description: string | null = null;
  private information: string | null = null;
  private creator: string | null = null;
  private license: string | null = null;
  private icon: Content | null = null;
  private planIcon: Content | null = null;
  private model: Content | null = null;
  private modelSize: number | null = null;
  private width: number;
  private widthInPlan: number;
  private depth: number;
  private depthInPlan: number;
  private height: number;
  private heightInPlan: number;
  private elevation: number;
  private dropOnTopElevation: number;
  private movable: boolean;
  private doorOrWindow = false;
  private modelMaterials: HomeMaterial[] | null = null;
  private color: number | null = null;
  private texture: HomeTexture | null = null;
  private shininess: number | null = null;
  private modelRotation: number[][];
  private modelFlags = 0;
  private modelCenteredAtOrigin: boolean;
  private modelTransformations: Transformation[] | null = null;
  private staircaseCutOutShape: string | null = null;
  private backFaceShown = false;
  private resizable: boolean;
  private deformable: boolean;
  private texturable: boolean;
  private horizontallyRotatable: boolean;
  private price: number | null = null;
  private valueAddedTaxPercentage: number | null = null;
  private currency: string | null = null;
  private visible = true;
  private x: number;
  private y: number;
  private angle = 0;
  private pitch = 0;
  private roll = 0;
  private modelMirrored = false;
  private level: Level | null = null;

  private shapeCache: GeneralPath | null = null;

  constructor(piece: PieceOfFurniture, copiedProperties?: string[] | null);
  constructor(id: string | undefined, piece: PieceOfFurniture, copiedProperties?: string[] | null);
  constructor(idOrPiece: string | PieceOfFurniture | undefined, pieceOrProps?: PieceOfFurniture | string[] | null, props?: string[] | null) {
    let id: string | null = null;
    let piece: PieceOfFurniture;
    let copiedProperties: string[] | null;
    if (typeof idOrPiece === "string") {
      id = idOrPiece;
      if (pieceOrProps === null || pieceOrProps === undefined) {
        throw new Error("Missing piece for furniture constructor");
      }
      piece = pieceOrProps as PieceOfFurniture;
      copiedProperties = props ?? null;
    } else {
      id = null;
      piece = idOrPiece as PieceOfFurniture;
      copiedProperties = (pieceOrProps as string[] | null | undefined) ?? [];
    }
    super(id ?? HomeObject.createId("pieceOfFurniture"));

    this.name = piece.getName();
    this.description = piece.getDescription();
    this.information = piece.getInformation();
    this.creator = piece.getCreator();
    this.license = piece.getLicense();
    this.icon = piece.getIcon();
    this.planIcon = piece.getPlanIcon();
    this.model = piece.getModel();
    this.modelSize = piece.getModelSize();
    this.width = f32(piece.getWidth());
    this.depth = f32(piece.getDepth());
    this.height = f32(piece.getHeight());
    this.elevation = f32(piece.getElevation());
    this.dropOnTopElevation = f32(piece.getDropOnTopElevation());
    this.movable = piece.isMovable();
    this.doorOrWindow = piece.isDoorOrWindow();
    this.color = piece.getColor();
    this.modelRotation = piece.getModelRotation().map((row) => [f32(row[0]!), f32(row[1]!), f32(row[2]!)]);
    this.staircaseCutOutShape = piece.getStaircaseCutOutShape();
    this.modelFlags = piece.getModelFlags();
    this.resizable = piece.isResizable();
    this.deformable = piece.isDeformable();
    this.texturable = piece.isTexturable();
    this.horizontallyRotatable = piece.isHorizontallyRotatable();
    this.price = piece.getPrice();
    this.valueAddedTaxPercentage = piece.getValueAddedTaxPercentage();
    this.currency = piece.getCurrency();

    if (piece instanceof HomePieceOfFurniture) {
      const homePiece = piece;
      this.catalogId = homePiece.getCatalogId();
      this.nameVisible = homePiece.isNameVisible();
      this.nameXOffset = f32(homePiece.getNameXOffset());
      this.nameYOffset = f32(homePiece.getNameYOffset());
      this.nameAngle = f32(homePiece.getNameAngle());
      this.nameStyle = homePiece.getNameStyle();
      this.visible = homePiece.isVisible();
      this.widthInPlan = f32(homePiece.getWidthInPlan());
      this.depthInPlan = f32(homePiece.getDepthInPlan());
      this.heightInPlan = f32(homePiece.getHeightInPlan());
      this.modelCenteredAtOrigin = homePiece.isModelCenteredAtOrigin();
      this.modelTransformations = homePiece.getModelTransformations();
      this.angle = f32(homePiece.getAngle());
      this.pitch = f32(homePiece.getPitch());
      this.roll = f32(homePiece.getRoll());
      this.x = f32(homePiece.getX());
      this.y = f32(homePiece.getY());
      this.modelMirrored = homePiece.isModelMirrored();
      this.texture = homePiece.getTexture();
      this.shininess = homePiece.getShininess();
      this.modelMaterials = homePiece.getModelMaterials();
      const propertyNames = copiedProperties !== null ? copiedProperties : homePiece.getPropertyNames();
      for (const property of propertyNames) {
        const value = homePiece.isContentProperty(property)
          ? homePiece.getContentProperty(property)
          : homePiece.getProperty(property);
        if (value !== null) {
          this.setProperty(property, value);
        }
      }
    } else {
      const catalogPiece = piece as PieceOfFurniture & { getId?: () => string };
      if (catalogPiece.getId !== undefined) {
        this.catalogId = catalogPiece.getId();
        const propertyNames = copiedProperties !== null ? copiedProperties : catalogPiece.getPropertyNames();
        for (const property of propertyNames) {
          const value = catalogPiece.isContentProperty(property)
            ? catalogPiece.getContentProperty(property)
            : catalogPiece.getProperty(property);
          if (value !== null) {
            this.setProperty(property, value);
          }
        }
      }
      this.visible = true;
      this.widthInPlan = this.width;
      this.depthInPlan = this.depth;
      this.heightInPlan = this.height;
      this.modelCenteredAtOrigin = true;
      this.x = this.width / 2;
      this.y = this.depth / 2;
    }
    this.widthInPlan = f32(this.widthInPlan);
    this.depthInPlan = f32(this.depthInPlan);
    this.heightInPlan = f32(this.heightInPlan);
  }

  // ---------------------------------------------------------------- basic

  getCatalogId(): string | null {
    return this.catalogId;
  }

  setCatalogId(catalogId: string | null): void {
    if (catalogId !== this.catalogId) {
      const oldCatalogId = this.catalogId;
      this.catalogId = catalogId;
      this.firePropertyChange(HomePieceOfFurniture.Property.CATALOG_ID, oldCatalogId, catalogId);
    }
  }

  getName(): string | null {
    return this.name;
  }

  setName(name: string | null): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME, oldName, name);
    }
  }

  isNameVisible(): boolean {
    return this.nameVisible;
  }

  setNameVisible(nameVisible: boolean): void {
    if (nameVisible !== this.nameVisible) {
      const oldNameVisible = this.nameVisible;
      this.nameVisible = nameVisible;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME_VISIBLE, oldNameVisible, nameVisible);
    }
  }

  getNameXOffset(): number {
    return this.nameXOffset;
  }

  setNameXOffset(nameXOffset: number): void {
    const narrowed = f32(nameXOffset);
    if (narrowed !== this.nameXOffset) {
      const oldNameXOffset = this.nameXOffset;
      this.nameXOffset = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME_X_OFFSET, oldNameXOffset, narrowed);
    }
  }

  getNameYOffset(): number {
    return this.nameYOffset;
  }

  setNameYOffset(nameYOffset: number): void {
    const narrowed = f32(nameYOffset);
    if (narrowed !== this.nameYOffset) {
      const oldNameYOffset = this.nameYOffset;
      this.nameYOffset = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME_Y_OFFSET, oldNameYOffset, narrowed);
    }
  }

  getNameStyle(): TextStyle | null {
    return this.nameStyle;
  }

  setNameStyle(nameStyle: TextStyle | null): void {
    if (nameStyle !== this.nameStyle) {
      const oldNameStyle = this.nameStyle;
      this.nameStyle = nameStyle;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME_STYLE, oldNameStyle, nameStyle);
    }
  }

  getNameAngle(): number {
    return this.nameAngle;
  }

  setNameAngle(nameAngle: number): void {
    const narrowed = f32(nameAngle);
    if (narrowed !== this.nameAngle) {
      const oldNameAngle = this.nameAngle;
      this.nameAngle = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.NAME_ANGLE, oldNameAngle, narrowed);
    }
  }

  getDescription(): string | null {
    return this.description;
  }

  setDescription(description: string | null): void {
    if (description !== this.description) {
      const oldDescription = this.description;
      this.description = description;
      this.firePropertyChange(HomePieceOfFurniture.Property.DESCRIPTION, oldDescription, description);
    }
  }

  getInformation(): string | null {
    return this.information;
  }

  setInformation(information: string | null): void {
    if (information !== this.information) {
      const oldInformation = this.information;
      this.information = information;
      this.firePropertyChange(HomePieceOfFurniture.Property.INFORMATION, oldInformation, information);
    }
  }

  getCreator(): string | null {
    return this.creator;
  }

  setCreator(creator: string | null): void {
    if (creator !== this.creator) {
      const oldCreator = this.creator;
      this.creator = creator;
      this.firePropertyChange(HomePieceOfFurniture.Property.CREATOR, oldCreator, creator);
    }
  }

  getLicense(): string | null {
    return this.license;
  }

  setLicense(license: string | null): void {
    if (license !== this.license) {
      const oldLicense = this.license;
      this.license = license;
      this.firePropertyChange(HomePieceOfFurniture.Property.LICENSE, oldLicense, license);
    }
  }

  // ------------------------------------------------------------- dimensions

  getDepth(): number {
    return this.depth;
  }

  setDepth(depth: number): void {
    if (this.isDeformable()) {
      const narrowed = f32(depth);
      if (narrowed !== this.depth) {
        const oldDepth = this.depth;
        this.depth = narrowed;
        this.shapeCache = null;
        this.firePropertyChange(HomePieceOfFurniture.Property.DEPTH, oldDepth, narrowed);
      }
    } else {
      throw new Error("Piece isn't deformable");
    }
  }

  getDepthInPlan(): number {
    return this.depthInPlan;
  }

  setDepthInPlan(depthInPlan: number): void {
    const narrowed = f32(depthInPlan);
    if (narrowed !== this.depthInPlan) {
      const oldDepthInPlan = this.depthInPlan;
      this.depthInPlan = narrowed;
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.DEPTH_IN_PLAN, oldDepthInPlan, narrowed);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    if (this.isDeformable()) {
      const narrowed = f32(height);
      if (narrowed !== this.height) {
        const oldHeight = this.height;
        this.height = narrowed;
        this.firePropertyChange(HomePieceOfFurniture.Property.HEIGHT, oldHeight, narrowed);
      }
    } else {
      throw new Error("Piece isn't deformable");
    }
  }

  getHeightInPlan(): number {
    return this.heightInPlan;
  }

  setHeightInPlan(heightInPlan: number): void {
    const narrowed = f32(heightInPlan);
    if (narrowed !== this.heightInPlan) {
      const oldHeightInPlan = this.heightInPlan;
      this.heightInPlan = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.HEIGHT_IN_PLAN, oldHeightInPlan, narrowed);
    }
  }

  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): void {
    if (this.isResizable()) {
      const narrowed = f32(width);
      if (narrowed !== this.width) {
        const oldWidth = this.width;
        this.width = narrowed;
        this.shapeCache = null;
        this.firePropertyChange(HomePieceOfFurniture.Property.WIDTH, oldWidth, narrowed);
      }
    } else {
      throw new Error("Piece isn't resizable");
    }
  }

  getWidthInPlan(): number {
    return this.widthInPlan;
  }

  setWidthInPlan(widthInPlan: number): void {
    const narrowed = f32(widthInPlan);
    if (narrowed !== this.widthInPlan) {
      const oldWidthInPlan = this.widthInPlan;
      this.widthInPlan = narrowed;
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.WIDTH_IN_PLAN, oldWidthInPlan, narrowed);
    }
  }

  scale(scale: number): void {
    if (this.isResizable()) {
      const oldWidth = this.width;
      const oldDepth = this.depth;
      this.width = f32(this.width * scale);
      this.depth = f32(this.depth * scale);
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.WIDTH, oldWidth, this.width);
      this.firePropertyChange(HomePieceOfFurniture.Property.DEPTH, oldDepth, this.depth);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  getDropOnTopElevation(): number {
    return this.dropOnTopElevation;
  }

  getGroundElevation(): number {
    if (this.level !== null) {
      return this.level.getElevation();
    }
    return 0;
  }

  setElevation(elevation: number): void {
    const narrowed = f32(elevation);
    if (narrowed !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.ELEVATION, oldElevation, narrowed);
    }
  }

  isMovable(): boolean {
    return this.movable;
  }

  setMovable(movable: boolean): void {
    if (movable !== this.movable) {
      const oldMovable = this.movable;
      this.movable = movable;
      this.firePropertyChange(HomePieceOfFurniture.Property.MOVABLE, oldMovable, movable);
    }
  }

  isDoorOrWindow(): boolean {
    return this.doorOrWindow;
  }

  // -------------------------------------------------------------- content

  getIcon(): Content | null {
    return this.icon;
  }

  setIcon(icon: Content | null): void {
    if (icon !== this.icon) {
      const oldIcon = this.icon;
      this.icon = icon;
      this.firePropertyChange(HomePieceOfFurniture.Property.ICON, oldIcon, icon);
    }
  }

  getPlanIcon(): Content | null {
    return this.planIcon;
  }

  setPlanIcon(planIcon: Content | null): void {
    if (planIcon !== this.planIcon) {
      const oldPlanIcon = this.planIcon;
      this.planIcon = planIcon;
      this.firePropertyChange(HomePieceOfFurniture.Property.PLAN_ICON, oldPlanIcon, planIcon);
    }
  }

  getModel(): Content | null {
    return this.model;
  }

  setModel(model: Content | null): void {
    if (model !== this.model) {
      const oldModel = this.model;
      this.model = model;
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL, oldModel, model);
    }
  }

  getModelSize(): number | null {
    return this.modelSize;
  }

  setModelSize(modelSize: number | null): void {
    if (modelSize !== this.modelSize) {
      const oldModelSize = this.modelSize;
      this.modelSize = modelSize;
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL_SIZE, oldModelSize, modelSize);
    }
  }

  getModelMaterials(): HomeMaterial[] | null {
    return this.modelMaterials;
  }

  setModelMaterials(modelMaterials: HomeMaterial[] | null): void {
    if (modelMaterials !== this.modelMaterials) {
      const oldModelMaterials = this.modelMaterials;
      this.modelMaterials = modelMaterials;
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL_MATERIALS, oldModelMaterials, modelMaterials);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.firePropertyChange(HomePieceOfFurniture.Property.COLOR, oldColor, color);
    }
  }

  getTexture(): HomeTexture | null {
    return this.texture;
  }

  setTexture(texture: HomeTexture | null): void {
    if (texture !== this.texture) {
      const oldTexture = this.texture;
      this.texture = texture;
      this.firePropertyChange(HomePieceOfFurniture.Property.TEXTURE, oldTexture, texture);
    }
  }

  getShininess(): number | null {
    return this.shininess;
  }

  setShininess(shininess: number | null): void {
    const narrowed = shininess === null ? null : f32(shininess);
    if (narrowed !== this.shininess) {
      const oldShininess = this.shininess;
      this.shininess = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.SHININESS, oldShininess, narrowed);
    }
  }

  isResizable(): boolean {
    return this.resizable;
  }

  isDeformable(): boolean {
    return this.deformable;
  }

  isWidthDepthDeformable(): boolean {
    return this.deformable;
  }

  isTexturable(): boolean {
    return this.texturable;
  }

  isHorizontallyRotatable(): boolean {
    return this.horizontallyRotatable;
  }

  getPrice(): number | null {
    return this.price;
  }

  setPrice(price: number | null): void {
    if (price !== this.price) {
      const oldPrice = this.price;
      this.price = price;
      this.firePropertyChange(HomePieceOfFurniture.Property.PRICE, oldPrice, price);
    }
  }

  getValueAddedTaxPercentage(): number | null {
    return this.valueAddedTaxPercentage;
  }

  setValueAddedTaxPercentage(valueAddedTaxPercentage: number | null): void {
    if (valueAddedTaxPercentage !== this.valueAddedTaxPercentage) {
      const oldValueAddedTaxPercentage = this.valueAddedTaxPercentage;
      this.valueAddedTaxPercentage = valueAddedTaxPercentage;
      this.firePropertyChange(HomePieceOfFurniture.Property.VALUE_ADDED_TAX_PERCENTAGE, oldValueAddedTaxPercentage, valueAddedTaxPercentage);
    }
  }

  getValueAddedTax(): number {
    if (this.price !== null && this.valueAddedTaxPercentage !== null) {
      return this.price * this.valueAddedTaxPercentage;
    }
    return 0;
  }

  getPriceValueAddedTaxIncluded(): number {
    return this.price !== null && this.valueAddedTaxPercentage !== null ? this.price * (1 + this.valueAddedTaxPercentage) : this.price ?? 0;
  }

  getCurrency(): string | null {
    return this.currency;
  }

  setCurrency(currency: string | null): void {
    if (currency !== this.currency) {
      const oldCurrency = this.currency;
      this.currency = currency;
      this.firePropertyChange(HomePieceOfFurniture.Property.CURRENCY, oldCurrency, currency);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    if (visible !== this.visible) {
      const oldVisible = this.visible;
      this.visible = visible;
      this.firePropertyChange(HomePieceOfFurniture.Property.VISIBLE, oldVisible, visible);
    }
  }

  // ------------------------------------------------------------- transform

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    const narrowed = f32(x);
    if (narrowed !== this.x) {
      const oldX = this.x;
      this.x = narrowed;
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.X, oldX, narrowed);
    }
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): void {
    const narrowed = f32(y);
    if (narrowed !== this.y) {
      const oldY = this.y;
      this.y = narrowed;
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.Y, oldY, narrowed);
    }
  }

  getAngle(): number {
    return this.angle;
  }

  setAngle(angle: number): void {
    const narrowed = f32(angle);
    if (narrowed !== this.angle) {
      const oldAngle = this.angle;
      this.angle = narrowed;
      this.shapeCache = null;
      this.firePropertyChange(HomePieceOfFurniture.Property.ANGLE, oldAngle, narrowed);
    }
  }

  getPitch(): number {
    return this.pitch;
  }

  setPitch(pitch: number): void {
    const narrowed = f32(pitch);
    if (narrowed !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.PITCH, oldPitch, narrowed);
    }
  }

  getRoll(): number {
    return this.roll;
  }

  setRoll(roll: number): void {
    const narrowed = f32(roll);
    if (narrowed !== this.roll) {
      const oldRoll = this.roll;
      this.roll = narrowed;
      this.firePropertyChange(HomePieceOfFurniture.Property.ROLL, oldRoll, narrowed);
    }
  }

  isHorizontallyRotated(): boolean {
    return Math.abs(this.angle) > Math.PI / 4;
  }

  getModelRotation(): number[][] {
    return this.modelRotation.map((row) => [...row]);
  }

  setModelRotation(modelRotation: number[][]): void {
    if (modelRotation !== this.modelRotation) {
      const oldModelRotation = this.modelRotation;
      this.modelRotation = modelRotation.map((row) => [f32(row[0]!), f32(row[1]!), f32(row[2]!)]);
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL_ROTATION, oldModelRotation, this.modelRotation);
    }
  }

  isModelMirrored(): boolean {
    return this.modelMirrored;
  }

  setModelMirrored(modelMirrored: boolean): void {
    if (modelMirrored !== this.modelMirrored) {
      const oldModelMirrored = this.modelMirrored;
      this.modelMirrored = modelMirrored;
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL_MIRRORED, oldModelMirrored, modelMirrored);
    }
  }

  isModelCenteredAtOrigin(): boolean {
    return this.modelCenteredAtOrigin;
  }

  setModelCenteredAtOrigin(modelCenteredAtOrigin: boolean): void {
    this.modelCenteredAtOrigin = modelCenteredAtOrigin;
  }

  isBackFaceShown(): boolean {
    return this.backFaceShown;
  }

  setBackFaceShown(backFaceShown: boolean): void {
    this.backFaceShown = backFaceShown;
  }

  getModelFlags(): number {
    return this.modelFlags;
  }

  setModelFlags(modelFlags: number): void {
    this.modelFlags = modelFlags;
  }

  getModelTransformations(): Transformation[] | null {
    return this.modelTransformations;
  }

  setModelTransformations(modelTransformations: Transformation[] | null): void {
    if (modelTransformations !== this.modelTransformations) {
      const oldModelTransformations = this.modelTransformations;
      this.modelTransformations = modelTransformations;
      this.firePropertyChange(HomePieceOfFurniture.Property.MODEL_TRANSFORMATIONS, oldModelTransformations, modelTransformations);
    }
  }

  getStaircaseCutOutShape(): string | null {
    return this.staircaseCutOutShape;
  }

  setStaircaseCutOutShape(staircaseCutOutShape: string | null): void {
    if (staircaseCutOutShape !== this.staircaseCutOutShape) {
      const oldStaircaseCutOutShape = this.staircaseCutOutShape;
      this.staircaseCutOutShape = staircaseCutOutShape;
      this.firePropertyChange(HomePieceOfFurniture.Property.STAIRCASE_CUT_OUT_SHAPE, oldStaircaseCutOutShape, staircaseCutOutShape);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(HomePieceOfFurniture.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  private isTopAtLevel(level: Level): boolean {
    return this.level === level && this.elevation + this.height + this.getGroundElevation() < level.getElevation() + level.getHeight();
  }

  // -------------------------------------------------------------- geometry

  getPoints(): number[][] {
    const piecePoints: number[][] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const iterator = this.getShape().getPathIterator(null);
    for (let i = 0; i < piecePoints.length; i++) {
      const coords = new Array<number>(6).fill(0);
      iterator.currentSegment(coords);
      piecePoints[i] = [coords[0]!, coords[1]!];
      iterator.next();
    }
    return piecePoints;
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const rectangle = new Rect2D(x0, y0, 0, 0);
    rectangle.add(x1, y1);
    return this.getShape().intersects(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    if (margin === 0) {
      return this.getShape().contains(x, y);
    }
    return this.getShape().intersects(x - margin, y - margin, 2 * margin, 2 * margin);
  }

  isPointAt(x: number, y: number, margin: number): boolean {
    for (const point of this.getPoints()) {
      if (Math.abs(x - point[0]!) <= margin && Math.abs(y - point[1]!) <= margin) {
        return true;
      }
    }
    return false;
  }

  isTopLeftPointAt(x: number, y: number, margin: number): boolean {
    const points = this.getPoints();
    const distanceSquareToTopLeftPoint = Point2D.distanceSq(x, y, points[0]![0]!, points[0]![1]!);
    return (
      distanceSquareToTopLeftPoint <= margin * margin &&
      distanceSquareToTopLeftPoint < Point2D.distanceSq(x, y, points[1]![0]!, points[1]![1]!) &&
      distanceSquareToTopLeftPoint < Point2D.distanceSq(x, y, points[3]![0]!, points[3]![1]!)
    );
  }

  isTopRightPointAt(x: number, y: number, margin: number): boolean {
    const points = this.getPoints();
    const distanceSquareToTopRightPoint = Point2D.distanceSq(x, y, points[1]![0]!, points[1]![1]!);
    return (
      distanceSquareToTopRightPoint <= margin * margin &&
      distanceSquareToTopRightPoint < Point2D.distanceSq(x, y, points[0]![0]!, points[0]![1]!) &&
      distanceSquareToTopRightPoint < Point2D.distanceSq(x, y, points[2]![0]!, points[2]![1]!)
    );
  }

  isBottomLeftPointAt(x: number, y: number, margin: number): boolean {
    const points = this.getPoints();
    const distanceSquareToBottomLeftPoint = Point2D.distanceSq(x, y, points[3]![0]!, points[3]![1]!);
    return (
      distanceSquareToBottomLeftPoint <= margin * margin &&
      distanceSquareToBottomLeftPoint < Point2D.distanceSq(x, y, points[0]![0]!, points[0]![1]!) &&
      distanceSquareToBottomLeftPoint < Point2D.distanceSq(x, y, points[2]![0]!, points[2]![1]!)
    );
  }

  isBottomRightPointAt(x: number, y: number, margin: number): boolean {
    const points = this.getPoints();
    const distanceSquareToBottomRightPoint = Point2D.distanceSq(x, y, points[2]![0]!, points[2]![1]!);
    return (
      distanceSquareToBottomRightPoint <= margin * margin &&
      distanceSquareToBottomRightPoint < Point2D.distanceSq(x, y, points[1]![0]!, points[1]![1]!) &&
      distanceSquareToBottomRightPoint < Point2D.distanceSq(x, y, points[3]![0]!, points[3]![1]!)
    );
  }

  isNameCenterPointAt(x: number, y: number, margin: number): boolean {
    return Math.abs(x - this.getX() - this.nameXOffset) <= margin && Math.abs(y - this.getY() - this.nameYOffset) <= margin;
  }

  isParallelToWall(wall: Wall): boolean {
    if (wall.getArcExtent() === null) {
      const deltaY = wall.getYEnd() - wall.getYStart();
      const deltaX = wall.getXEnd() - wall.getXStart();
      if (deltaX === 0 && deltaY === 0) {
        return false;
      }
      const wallAngle = Math.atan2(deltaY, deltaX);
      const pieceWallAngle = Math.abs(wallAngle - this.getAngle()) % Math.PI;
      return pieceWallAngle <= STRAIGHT_WALL_ANGLE_MARGIN || Math.PI - pieceWallAngle <= STRAIGHT_WALL_ANGLE_MARGIN;
    }
    const tangentAngle = Math.PI / 2 + Math.atan2(wall.getYArcCircleCenter() - this.getY(), wall.getXArcCircleCenter() - this.getX());
    const pieceWallAngle = Math.abs(tangentAngle - this.getAngle()) % Math.PI;
    return pieceWallAngle <= ROUND_WALL_ANGLE_MARGIN || Math.PI - pieceWallAngle <= ROUND_WALL_ANGLE_MARGIN;
  }

  private getShape(): GeneralPath {
    if (this.shapeCache === null) {
      const pieceRectangle = new Rect2D(
        f32(this.getX() - f32(this.getWidthInPlan() / 2)),
        f32(this.getY() - f32(this.getDepthInPlan() / 2)),
        this.getWidthInPlan(),
        this.getDepthInPlan(),
      );
      const rotation = AffineTransform.getRotateInstance(this.getAngle(), this.getX(), this.getY());
      const iterator = pieceRectangle.getPathIterator(rotation);
      const pieceShape = new GeneralPath();
      pieceShape.append({ getPathIterator: () => iterator }, false);
      this.shapeCache = pieceShape;
    }
    return this.shapeCache;
  }

  move(dx: number, dy: number): void {
    this.setX(this.getX() + dx);
    this.setY(this.getY() + dy);
  }

  override clone(): HomePieceOfFurniture {
    const copy = Object.create(HomePieceOfFurniture.prototype) as HomePieceOfFurniture;
    this.copyBaseTo(copy);
    copy.catalogId = this.catalogId;
    copy.name = this.name;
    copy.nameVisible = this.nameVisible;
    copy.nameXOffset = this.nameXOffset;
    copy.nameYOffset = this.nameYOffset;
    copy.nameStyle = this.nameStyle;
    copy.nameAngle = this.nameAngle;
    copy.description = this.description;
    copy.information = this.information;
    copy.creator = this.creator;
    copy.license = this.license;
    copy.icon = this.icon;
    copy.planIcon = this.planIcon;
    copy.model = this.model;
    copy.modelSize = this.modelSize;
    copy.width = this.width;
    copy.widthInPlan = this.widthInPlan;
    copy.depth = this.depth;
    copy.depthInPlan = this.depthInPlan;
    copy.height = this.height;
    copy.heightInPlan = this.heightInPlan;
    copy.elevation = this.elevation;
    copy.dropOnTopElevation = this.dropOnTopElevation;
    copy.movable = this.movable;
    copy.doorOrWindow = this.doorOrWindow;
    copy.modelMaterials = this.modelMaterials;
    copy.color = this.color;
    copy.texture = this.texture;
    copy.shininess = this.shininess;
    copy.modelRotation = this.modelRotation.map((row) => [...row]);
    copy.modelFlags = this.modelFlags;
    copy.modelCenteredAtOrigin = this.modelCenteredAtOrigin;
    copy.modelTransformations = this.modelTransformations;
    copy.staircaseCutOutShape = this.staircaseCutOutShape;
    copy.backFaceShown = this.backFaceShown;
    copy.resizable = this.resizable;
    copy.deformable = this.deformable;
    copy.texturable = this.texturable;
    copy.horizontallyRotatable = this.horizontallyRotatable;
    copy.price = this.price;
    copy.valueAddedTaxPercentage = this.valueAddedTaxPercentage;
    copy.currency = this.currency;
    copy.visible = this.visible;
    copy.x = this.x;
    copy.y = this.y;
    copy.angle = this.angle;
    copy.pitch = this.pitch;
    copy.roll = this.roll;
    copy.modelMirrored = this.modelMirrored;
    copy.level = null;
    return copy;
  }

  /** Returns a comparator comparing furniture on a given sortable property. */
  static getFurnitureComparator(property: string): (a: HomePieceOfFurniture, b: HomePieceOfFurniture) => number {
    return (a, b) => {
      let result = 0;
      switch (property) {
        case HomePieceOfFurniture.SortableProperty.CATALOG_ID:
          result = compareNullable(a.getCatalogId(), b.getCatalogId());
          break;
        case HomePieceOfFurniture.SortableProperty.NAME:
          result = compareNullable(a.getName(), b.getName());
          break;
        case HomePieceOfFurniture.SortableProperty.DESCRIPTION:
          result = compareNullable(a.getDescription(), b.getDescription());
          break;
        case HomePieceOfFurniture.SortableProperty.CREATOR:
          result = compareNullable(a.getCreator(), b.getCreator());
          break;
        case HomePieceOfFurniture.SortableProperty.LICENSE:
          result = compareNullable(a.getLicense(), b.getLicense());
          break;
        case HomePieceOfFurniture.SortableProperty.WIDTH:
          result = a.getWidth() - b.getWidth();
          break;
        case HomePieceOfFurniture.SortableProperty.DEPTH:
          result = a.getDepth() - b.getDepth();
          break;
        case HomePieceOfFurniture.SortableProperty.HEIGHT:
          result = a.getHeight() - b.getHeight();
          break;
        case HomePieceOfFurniture.SortableProperty.MOVABLE:
          result = Number(a.isMovable()) - Number(b.isMovable());
          break;
        case HomePieceOfFurniture.SortableProperty.COLOR:
          result = compareNullable(a.getColor(), b.getColor());
          break;
        case HomePieceOfFurniture.SortableProperty.PRICE:
          result = compareNullable(a.getPrice(), b.getPrice());
          break;
        case HomePieceOfFurniture.SortableProperty.VALUE_ADDED_TAX:
          result = a.getValueAddedTax() - b.getValueAddedTax();
          break;
        case HomePieceOfFurniture.SortableProperty.X:
          result = a.getX() - b.getX();
          break;
        case HomePieceOfFurniture.SortableProperty.Y:
          result = a.getY() - b.getY();
          break;
        case HomePieceOfFurniture.SortableProperty.ELEVATION:
          result = a.getElevation() - b.getElevation();
          break;
        case HomePieceOfFurniture.SortableProperty.ANGLE:
          result = a.getAngle() - b.getAngle();
          break;
        default:
          result = 0;
      }
      if (result === 0) {
        // Keep a stable order for equal pieces
        result = a.getId().localeCompare(b.getId());
      }
      return result;
    };
  }
}

function compareNullable(a: string | number | null, b: string | number | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Catalog data classes (task 3.2/3.6): immutable pieces/textures read from
 * furniture libraries and used to construct home furniture during XML
 * parsing. Ports of com.eteks.sweethome3d.model.Catalog*.
 */
import { f32 } from "../util/f32.js";
import type { Content } from "../model/Content.js";
import type { PieceOfFurniture } from "../model/PieceOfFurniture.js";
import type { DoorOrWindow, Light, ShelfUnit } from "../model/Interfaces.js";
import type { LightSource, Sash } from "../model/ValueClasses.js";

function parseTags(tags: string | null): string[] {
  return tags !== null ? tags.split(" ") : [];
}

export class CatalogPieceOfFurniture implements PieceOfFurniture {
  protected readonly idValue: string | null;
  protected readonly name: string | null;
  protected readonly description: string | null;
  protected readonly information: string | null;
  protected readonly license: string | null;
  protected readonly tags: string[];
  protected readonly creationDate: number | null;
  protected readonly grade: number | null;
  protected readonly icon: Content | null;
  protected readonly planIcon: Content | null;
  protected readonly model: Content | null;
  protected readonly width: number;
  protected readonly depth: number;
  protected readonly height: number;
  protected readonly elevation: number;
  protected readonly dropOnTopElevation: number;
  protected readonly movable: boolean;
  protected readonly staircaseCutOutShape: string | null;
  protected readonly modelRotation: number[][];
  protected readonly modelFlags: number;
  protected readonly modelSize: number | null;
  protected readonly creator: string | null;
  protected readonly resizable: boolean;
  protected readonly deformable: boolean;
  protected readonly texturable: boolean;
  protected readonly horizontallyRotatable: boolean;
  protected readonly price: number | null;
  protected readonly valueAddedTaxPercentage: number | null;
  protected readonly currency: string | null;

  constructor(
    id: string | null,
    name: string | null,
    description: string | null,
    information: string | null,
    license: string | null,
    tags: string | null,
    creationDate: number | null,
    grade: number | null,
    icon: Content | null,
    planIcon: Content | null,
    model: Content | null,
    width: number,
    depth: number,
    height: number,
    elevation: number,
    dropOnTopElevation: number,
    movable: boolean,
    staircaseCutOutShape: string | null,
    modelRotation: number[][] | null,
    modelFlags: number,
    modelSize: number | null,
    creator: string | null,
    resizable: boolean,
    deformable: boolean,
    texturable: boolean,
    horizontallyRotatable: boolean,
    price: number | null,
    valueAddedTaxPercentage: number | null,
    currency: string | null,
    properties?: Map<string, string | Content> | null,
    contents?: Map<string, Content> | null,
  ) {
    this.idValue = id;
    this.name = name;
    this.description = description;
    this.information = information;
    this.license = license;
    this.tags = parseTags(tags);
    this.creationDate = creationDate;
    this.grade = grade;
    this.icon = icon;
    this.planIcon = planIcon;
    this.model = model;
    this.width = f32(width);
    this.depth = f32(depth);
    this.height = f32(height);
    this.elevation = f32(elevation);
    this.dropOnTopElevation = f32(dropOnTopElevation);
    this.movable = movable;
    this.staircaseCutOutShape = staircaseCutOutShape;
    this.modelRotation = modelRotation ?? [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    this.modelFlags = modelFlags;
    this.modelSize = modelSize;
    this.creator = creator;
    this.resizable = resizable;
    this.deformable = deformable;
    this.texturable = texturable;
    this.horizontallyRotatable = horizontallyRotatable;
    this.price = price;
    this.valueAddedTaxPercentage = valueAddedTaxPercentage;
    this.currency = currency;
  }

  getId(): string | null {
    return this.idValue;
  }

  getName(): string | null {
    return this.name;
  }

  getCreationDate(): number | null {
    return this.creationDate;
  }

  getGrade(): number | null {
    return this.grade;
  }

  getTags(): string[] {
    return this.tags;
  }

  getDescription(): string | null {
    return this.description;
  }

  getInformation(): string | null {
    return this.information;
  }

  getLicense(): string | null {
    return this.license;
  }

  getDepth(): number {
    return this.depth;
  }

  getHeight(): number {
    return this.height;
  }

  getWidth(): number {
    return this.width;
  }

  getElevation(): number {
    return this.elevation;
  }

  getDropOnTopElevation(): number {
    return this.dropOnTopElevation;
  }

  isMovable(): boolean {
    return this.movable;
  }

  isDoorOrWindow(): boolean {
    return false;
  }

  getIcon(): Content | null {
    return this.icon;
  }

  getPlanIcon(): Content | null {
    return this.planIcon;
  }

  getModel(): Content | null {
    return this.model;
  }

  getModelFlags(): number {
    return this.modelFlags;
  }

  getModelSize(): number | null {
    return this.modelSize;
  }

  getModelRotation(): number[][] {
    return this.modelRotation.map((row) => [...row]);
  }

  getStaircaseCutOutShape(): string | null {
    return this.staircaseCutOutShape;
  }

  getCreator(): string | null {
    return this.creator;
  }

  isBackFaceShown(): boolean {
    return (this.modelFlags & 0x01) !== 0;
  }

  getColor(): number | null {
    return null;
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

  getValueAddedTaxPercentage(): number | null {
    return this.valueAddedTaxPercentage;
  }

  getCurrency(): string | null {
    return this.currency;
  }

  getProperty(_name: string): string | null {
    return null;
  }

  getPropertyNames(): string[] {
    return [];
  }

  getContentProperty(_name: string): Content | null {
    return null;
  }

  isContentProperty(_name: string): boolean {
    return false;
  }

  getLevel(): null {
    return null;
  }
}

export class CatalogDoorOrWindow extends CatalogPieceOfFurniture implements DoorOrWindow {
  private readonly wallThickness: number;
  private readonly wallDistance: number;
  private readonly wallCutOutOnBothSides: boolean;
  private readonly widthDepthDeformable: boolean;
  private readonly sashes: Sash[];
  private readonly cutOutShape: string;

  constructor(
    id: string | null,
    name: string | null,
    description: string | null,
    information: string | null,
    license: string | null,
    tags: string | null,
    creationDate: number | null,
    grade: number | null,
    icon: Content | null,
    planIcon: Content | null,
    model: Content | null,
    width: number,
    depth: number,
    height: number,
    elevation: number,
    dropOnTopElevation: number,
    movable: boolean,
    cutOutShape: string | null,
    wallThickness: number,
    wallDistance: number,
    wallCutOutOnBothSides: boolean,
    widthDepthDeformable: boolean,
    sashes: Sash[],
    modelRotation: number[][] | null,
    modelFlags: number,
    modelSize: number | null,
    creator: string | null,
    resizable: boolean,
    deformable: boolean,
    texturable: boolean,
    price: number | null,
    valueAddedTaxPercentage: number | null,
    currency: string | null,
    properties?: Map<string, string | Content> | null,
    contents?: Map<string, Content> | null,
  ) {
    super(
      id, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
      width, depth, height, elevation, dropOnTopElevation, movable, null, modelRotation, modelFlags,
      modelSize, creator, resizable, deformable, texturable, false, price, valueAddedTaxPercentage, currency,
      properties, contents,
    );
    this.cutOutShape = cutOutShape ?? "M0,0 v1 h1 v-1 z";
    this.wallThickness = f32(wallThickness);
    this.wallDistance = f32(wallDistance);
    this.wallCutOutOnBothSides = wallCutOutOnBothSides;
    this.widthDepthDeformable = widthDepthDeformable;
    this.sashes = sashes;
  }

  override isDoorOrWindow(): boolean {
    return true;
  }

  getWallThickness(): number {
    return this.wallThickness;
  }

  getWallDistance(): number {
    return this.wallDistance;
  }

  getSashes(): Sash[] {
    return this.sashes;
  }

  getCutOutShape(): string {
    return this.cutOutShape;
  }

  isWallCutOutOnBothSides(): boolean {
    return this.wallCutOutOnBothSides;
  }

  override isWidthDepthDeformable(): boolean {
    return this.widthDepthDeformable;
  }
}

export class CatalogLight extends CatalogPieceOfFurniture implements Light {
  private readonly lightSources: LightSource[];
  private readonly lightSourceMaterialNames: string[];
  private readonly power: number;

  constructor(
    id: string | null,
    name: string | null,
    description: string | null,
    information: string | null,
    license: string | null,
    tags: string | null,
    creationDate: number | null,
    grade: number | null,
    icon: Content | null,
    planIcon: Content | null,
    model: Content | null,
    width: number,
    depth: number,
    height: number,
    elevation: number,
    dropOnTopElevation: number,
    movable: boolean,
    lightSources: LightSource[],
    lightSourceMaterialNames: string[],
    staircaseCutOutShape: string | null,
    modelRotation: number[][] | null,
    modelFlags: number,
    modelSize: number | null,
    creator: string | null,
    resizable: boolean,
    deformable: boolean,
    texturable: boolean,
    horizontallyRotatable: boolean,
    price: number | null,
    valueAddedTaxPercentage: number | null,
    currency: string | null,
    properties?: Map<string, string | Content> | null,
    contents?: Map<string, Content> | null,
  ) {
    super(
      id, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
      width, depth, height, elevation, dropOnTopElevation, movable, staircaseCutOutShape, modelRotation,
      modelFlags, modelSize, creator, resizable, deformable, texturable, horizontallyRotatable,
      price, valueAddedTaxPercentage, currency, properties, contents,
    );
    this.lightSources = lightSources;
    this.lightSourceMaterialNames = lightSourceMaterialNames;
    this.power = 0;
  }

  getLightSources(): LightSource[] {
    return this.lightSources;
  }

  getLightSourceMaterialNames(): string[] {
    return this.lightSourceMaterialNames;
  }

  getPower(): number {
    return this.power;
  }
}

export class CatalogShelfUnit extends CatalogPieceOfFurniture implements ShelfUnit {
  private readonly shelfElevations: number[];
  private readonly shelfBoxes: unknown[];

  constructor(
    id: string | null,
    name: string | null,
    description: string | null,
    information: string | null,
    license: string | null,
    tags: string | null,
    creationDate: number | null,
    grade: number | null,
    icon: Content | null,
    planIcon: Content | null,
    model: Content | null,
    width: number,
    depth: number,
    height: number,
    elevation: number,
    dropOnTopElevation: number,
    shelfElevations: number[],
    shelfBoxes: unknown[],
    movable: boolean,
    staircaseCutOutShape: string | null,
    modelRotation: number[][] | null,
    modelFlags: number,
    modelSize: number | null,
    creator: string | null,
    resizable: boolean,
    deformable: boolean,
    texturable: boolean,
    horizontallyRotatable: boolean,
    price: number | null,
    valueAddedTaxPercentage: number | null,
    currency: string | null,
    properties?: Map<string, string | Content> | null,
    contents?: Map<string, Content> | null,
  ) {
    super(
      id, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
      width, depth, height, elevation, dropOnTopElevation, movable, staircaseCutOutShape, modelRotation,
      modelFlags, modelSize, creator, resizable, deformable, texturable, horizontallyRotatable,
      price, valueAddedTaxPercentage, currency, properties, contents,
    );
    this.shelfElevations = shelfElevations;
    this.shelfBoxes = shelfBoxes;
  }

  getShelfElevations(): number[] {
    return this.shelfElevations;
  }

  getShelfBoxes(): unknown[] {
    return this.shelfBoxes;
  }
}

export class CatalogTexture {
  private readonly idValue: string | null;
  private readonly name: string | null;
  private readonly image: Content;
  private readonly width: number;
  private readonly height: number;
  private readonly creator: string | null;

  constructor(id: string | null, name: string | null, image: Content | null, width: number, height: number, creator: string | null) {
    this.idValue = id;
    this.name = name;
    this.image = image ?? { openStream: async () => new Blob([]).stream(), getURL: () => "" };
    this.width = f32(width);
    this.height = f32(height);
    this.creator = creator;
  }

  getId(): string | null {
    return this.idValue;
  }

  getName(): string | null {
    return this.name;
  }

  getImage(): Content {
    return this.image;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getCreator(): string | null {
    return this.creator;
  }
}

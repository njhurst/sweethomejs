/**
 * Port of com.eteks.sweethome3d.model.Home (GPL v2+).
 *
 * The document root: furniture, walls, rooms, polylines, dimension lines,
 * labels, levels, cameras, environment, compass, print settings, background
 * image, selection state and arbitrary properties. Every mutation fires
 * JavaBeans-style events synchronously.
 */
import { CollectionChangeSupport, CollectionEvent, type CollectionListener } from "../events/CollectionChangeSupport.js";
import { PropertyChangeEvent, PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { BackgroundImage } from "./BackgroundImage.js";
import { Camera } from "./Camera.js";
import type { Content } from "./Content.js";
import { HomeObject } from "./HomeObject.js";
import { HomePrint } from "./HomePrint.js";
import { Level } from "./Level.js";
import { ObserverCamera } from "./ObserverCamera.js";
import type { Selectable } from "./Selectable.js";
import {
  Compass,
  DimensionLine,
  HomeEnvironment,
  HomeFurnitureGroup,
  HomePieceOfFurniture,
  Label,
  ObjectProperty,
  Polyline,
  Room,
  Wall,
  type Elevatable,
} from "./stubs.js";

export class Home {
  static readonly CURRENT_VERSION = 7400;

  static readonly Property = {
    NAME: "NAME",
    MODIFIED: "MODIFIED",
    FURNITURE_SORTED_PROPERTY: "FURNITURE_SORTED_PROPERTY",
    FURNITURE_DESCENDING_SORTED: "FURNITURE_DESCENDING_SORTED",
    FURNITURE_VISIBLE_PROPERTIES: "FURNITURE_VISIBLE_PROPERTIES",
    BACKGROUND_IMAGE: "BACKGROUND_IMAGE",
    CAMERA: "CAMERA",
    PRINT: "PRINT",
    BASE_PLAN_LOCKED: "BASE_PLAN_LOCKED",
    STORED_CAMERAS: "STORED_CAMERAS",
    RECOVERED: "RECOVERED",
    REPAIRED: "REPAIRED",
    SELECTED_LEVEL: "SELECTED_LEVEL",
    ALL_LEVELS_SELECTION: "ALL_LEVELS_SELECTION",
    FURNITURE_ADDITIONAL_PROPERTIES: "FURNITURE_ADDITIONAL_PROPERTIES",
  } as const;

  private static readonly HOME_TOP_CAMERA_ID = "camera-homeTopCamera";
  private static readonly HOME_OBSERVER_CAMERA_ID = "observerCamera-homeObserverCamera";
  private static readonly HOME_ENVIRONMENT_ID = "environment-homeEnvironment";
  private static readonly HOME_COMPASS_ID = "compass-homeCompass";

  // Transient state (Java `transient` fields)
  private furnitureChangeSupportValue: CollectionChangeSupport<HomePieceOfFurniture> | null = null;
  private selectedItems: Selectable[] = [];
  private selectionListenersValue: Array<(evt: unknown) => void> | null = null;
  private allLevelsSelection = false;
  private levelsChangeSupportValue: CollectionChangeSupport<Level> | null = null;
  private wallsChangeSupportValue: CollectionChangeSupport<Wall> | null = null;
  private roomsChangeSupportValue: CollectionChangeSupport<Room> | null = null;
  private polylinesChangeSupportValue: CollectionChangeSupport<Polyline> | null = null;
  private dimensionLinesChangeSupportValue: CollectionChangeSupport<DimensionLine> | null = null;
  private labelsChangeSupportValue: CollectionChangeSupport<Label> | null = null;
  private propertyChangeSupportValue: PropertyChangeSupport | null = null;
  private modified = false;
  private recovered = false;
  private repaired = false;

  // Serialized state
  private furnitureValue: HomePieceOfFurniture[];
  private levelsValue: Level[] = [];
  private selectedLevel: Level | null = null;
  private wallsValue: Wall[] = [];
  private roomsValue: Room[] = [];
  private polylinesValue: Polyline[] = [];
  private dimensionLinesValue: DimensionLine[] = [];
  private labelsValue: Label[] = [];
  private camera: Camera;
  private name: string | null = null;
  private readonly wallHeight: number;
  private backgroundImage: BackgroundImage | null = null;
  private observerCamera: ObserverCamera;
  private topCamera: Camera;
  private storedCamerasValue: Camera[] = [];
  private environment: HomeEnvironment;
  private print: HomePrint | null = null;
  private furnitureSortedPropertyName: string | null = null;
  private furnitureVisiblePropertyNames: string[] = [];
  private furnitureDescendingSorted = false;
  private visualProperties: Map<string, unknown> | null = null;
  private properties: Map<string, string> | null = null;
  private version = Home.CURRENT_VERSION;
  private basePlanLocked = false;
  private compass: Compass;
  private furnitureAdditionalPropertiesValue: ObjectProperty[] | null = null;

  constructor(wallHeight: number);
  constructor(furniture: HomePieceOfFurniture[]);
  constructor(wallHeightOrFurniture: number | HomePieceOfFurniture[] = 250) {
    if (typeof wallHeightOrFurniture === "number") {
      this.furnitureValue = [];
      this.wallHeight = wallHeightOrFurniture;
    } else {
      this.furnitureValue = [...wallHeightOrFurniture];
      this.wallHeight = 250;
    }
    this.camera = new ObserverCamera(0, 0, 175, 0, 0, Math.PI * 63 / 180);
    this.observerCamera = new ObserverCamera(this.camera.getX(), this.camera.getY(), this.camera.getZ(),
      this.camera.getYaw(), this.camera.getPitch(), this.camera.getFieldOfView());
    this.observerCamera.setId(Home.HOME_OBSERVER_CAMERA_ID);
    this.topCamera = new Camera(0, 0, 0, 0, 0, Math.PI * 63 / 180);
    this.topCamera.setId(Home.HOME_TOP_CAMERA_ID);
    this.environment = new HomeEnvironment();
    this.environment.setId(Home.HOME_ENVIRONMENT_ID);
    this.compass = new Compass(0, 0, 100);
    this.compass.setId(Home.HOME_COMPASS_ID);
  }

  // ---------------------------------------------------------------- events

  private get furnitureChangeSupport(): CollectionChangeSupport<HomePieceOfFurniture> {
    if (this.furnitureChangeSupportValue === null) {
      this.furnitureChangeSupportValue = new CollectionChangeSupport<HomePieceOfFurniture>(this);
    }
    return this.furnitureChangeSupportValue;
  }

  private get levelsChangeSupport(): CollectionChangeSupport<Level> {
    if (this.levelsChangeSupportValue === null) {
      this.levelsChangeSupportValue = new CollectionChangeSupport<Level>(this);
    }
    return this.levelsChangeSupportValue;
  }

  private get wallsChangeSupport(): CollectionChangeSupport<Wall> {
    if (this.wallsChangeSupportValue === null) {
      this.wallsChangeSupportValue = new CollectionChangeSupport<Wall>(this);
    }
    return this.wallsChangeSupportValue;
  }

  private get roomsChangeSupport(): CollectionChangeSupport<Room> {
    if (this.roomsChangeSupportValue === null) {
      this.roomsChangeSupportValue = new CollectionChangeSupport<Room>(this);
    }
    return this.roomsChangeSupportValue;
  }

  private get polylinesChangeSupport(): CollectionChangeSupport<Polyline> {
    if (this.polylinesChangeSupportValue === null) {
      this.polylinesChangeSupportValue = new CollectionChangeSupport<Polyline>(this);
    }
    return this.polylinesChangeSupportValue;
  }

  private get dimensionLinesChangeSupport(): CollectionChangeSupport<DimensionLine> {
    if (this.dimensionLinesChangeSupportValue === null) {
      this.dimensionLinesChangeSupportValue = new CollectionChangeSupport<DimensionLine>(this);
    }
    return this.dimensionLinesChangeSupportValue;
  }

  private get labelsChangeSupport(): CollectionChangeSupport<Label> {
    if (this.labelsChangeSupportValue === null) {
      this.labelsChangeSupportValue = new CollectionChangeSupport<Label>(this);
    }
    return this.labelsChangeSupportValue;
  }

  private get propertyChangeSupport(): PropertyChangeSupport {
    if (this.propertyChangeSupportValue === null) {
      this.propertyChangeSupportValue = new PropertyChangeSupport(this);
    }
    return this.propertyChangeSupportValue;
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  private firePropertyChange(property: string, oldValue: unknown, newValue: unknown): void {
    this.propertyChangeSupport.firePropertyChange(property, oldValue, newValue);
  }

  // ----------------------------------------------------------------- levels

  addLevelsListener(listener: CollectionListener<Level>): void {
    this.levelsChangeSupport.addCollectionListener(listener);
  }

  removeLevelsListener(listener: CollectionListener<Level>): void {
    this.levelsChangeSupport.removeCollectionListener(listener);
  }

  getLevels(): Level[] {
    return this.levelsValue;
  }

  addLevel(level: Level): void {
    if (level.getElevationIndex() < 0) {
      // Search elevation index of the added level
      let elevationIndex = 0;
      for (const homeLevel of this.levelsValue) {
        if (homeLevel.getElevation() === level.getElevation()) {
          elevationIndex = homeLevel.getElevationIndex() + 1;
        } else if (homeLevel.getElevation() > level.getElevation()) {
          break;
        }
      }
      level.setElevationIndex(elevationIndex);
    }
    // Copy-on-write, then binary search insertion by (elevation, elevationIndex)
    const levels = [...this.levelsValue];
    let levelIndex = lowerBound(levels, level);
    levels.splice(levelIndex, 0, level);
    this.levelsValue = levels;
    this.levelsChangeSupport.fireCollectionChangedAt(level, levelIndex, CollectionEvent.Type.ADD);
  }

  deleteLevel(level: Level): void {
    const index = this.levelsValue.indexOf(level);
    if (index !== -1) {
      for (const piece of [...this.furnitureValue]) {
        if (piece.getLevel() === level) {
          this.deletePieceOfFurniture(piece);
        }
      }
      for (const wall of [...this.wallsValue]) {
        if (wall.getLevel() === level) {
          this.deleteWall(wall);
        }
      }
      for (const room of [...this.roomsValue]) {
        if (room.getLevel() === level) {
          this.deleteRoom(room);
        }
      }
      for (const polyline of [...this.polylinesValue]) {
        if (polyline.getLevel() === level) {
          this.deletePolyline(polyline);
        }
      }
      for (const dimensionLine of [...this.dimensionLinesValue]) {
        if (dimensionLine.getLevel() === level) {
          this.deleteDimensionLine(dimensionLine);
        }
      }
      for (const label of [...this.labelsValue]) {
        if (label.getLevel() === level) {
          this.deleteLabel(label);
        }
      }
      if (this.selectedLevel === level) {
        this.setSelectedLevel(null);
      }
      const levels = [...this.levelsValue];
      levels.splice(index, 1);
      this.levelsValue = levels;
      // Reset elevation indices
      this.levelsValue.sort(Home.levelComparator);
      this.levelsValue.forEach((l, i) => l.setElevationIndex(i));
      this.levelsChangeSupport.fireCollectionChangedAt(level, index, CollectionEvent.Type.DELETE);
    }
  }

  static levelComparator(a: Level, b: Level): number {
    if (a.getElevation() !== b.getElevation()) {
      return a.getElevation() - b.getElevation();
    }
    return a.getElevationIndex() - b.getElevationIndex();
  }

  getSelectedLevel(): Level | null {
    return this.selectedLevel;
  }

  setSelectedLevel(selectedLevel: Level | null): void {
    if (selectedLevel !== this.selectedLevel) {
      const oldSelectedLevel = this.selectedLevel;
      this.selectedLevel = selectedLevel;
      this.firePropertyChange(Home.Property.SELECTED_LEVEL, oldSelectedLevel, selectedLevel);
    }
  }

  isAllLevelsSelection(): boolean {
    return this.allLevelsSelection;
  }

  setAllLevelsSelection(selectionAtAllLevels: boolean): void {
    if (selectionAtAllLevels !== this.allLevelsSelection) {
      const oldAllLevelsSelection = this.allLevelsSelection;
      this.allLevelsSelection = selectionAtAllLevels;
      this.firePropertyChange(Home.Property.ALL_LEVELS_SELECTION, oldAllLevelsSelection, selectionAtAllLevels);
    }
  }

  // -------------------------------------------------------------- furniture

  addFurnitureListener(listener: CollectionListener<HomePieceOfFurniture>): void {
    this.furnitureChangeSupport.addCollectionListener(listener);
  }

  removeFurnitureListener(listener: CollectionListener<HomePieceOfFurniture>): void {
    this.furnitureChangeSupport.removeCollectionListener(listener);
  }

  getFurniture(): HomePieceOfFurniture[] {
    return this.furnitureValue;
  }

  addPieceOfFurniture(piece: HomePieceOfFurniture): void {
    this.addPieceOfFurnitureAt(piece, this.furnitureValue.length);
  }

  addPieceOfFurnitureAt(piece: HomePieceOfFurniture, index: number): void {
    const furniture = [...this.furnitureValue];
    furniture.splice(index, 0, piece);
    this.furnitureValue = furniture;
    this.furnitureChangeSupport.fireCollectionChangedAt(piece, index, CollectionEvent.Type.ADD);
  }

  addPieceOfFurnitureToGroup(piece: HomePieceOfFurniture, group: HomeFurnitureGroup, index: number): void {
    // Grouping moves the piece into the group (the group's own list).
    const furniture = [...this.furnitureValue];
    furniture.splice(index, 0, group);
    this.furnitureValue = furniture;
    this.furnitureChangeSupport.fireCollectionChangedAt(group, index, CollectionEvent.Type.ADD);
  }

  deletePieceOfFurniture(piece: HomePieceOfFurniture): void {
    const index = this.furnitureValue.indexOf(piece);
    if (index !== -1) {
      const furniture = [...this.furnitureValue];
      furniture.splice(index, 1);
      this.furnitureValue = furniture;
      this.furnitureChangeSupport.fireCollectionChangedAt(piece, index, CollectionEvent.Type.DELETE);
    }
  }

  /** Returns the furniture list including the pieces inside groups. */
  getFurnitureWithSubGroups(): HomePieceOfFurniture[] {
    const furniture = [];
    for (const piece of this.furnitureValue) {
      furniture.push(piece);
      if (piece instanceof HomeFurnitureGroup) {
        furniture.push(...piece.getAllFurniture());
      }
    }
    return furniture;
  }

  // -------------------------------------------------------------- selection

  addSelectionListener(listener: (evt: { selectedItems: Selectable[] }) => void): void {
    if (this.selectionListenersValue === null) {
      this.selectionListenersValue = [];
    }
    this.selectionListenersValue.push(listener as never);
  }

  removeSelectionListener(listener: (evt: { selectedItems: Selectable[] }) => void): void {
    if (this.selectionListenersValue !== null) {
      const index = this.selectionListenersValue.indexOf(listener as never);
      if (index >= 0) {
        this.selectionListenersValue.splice(index, 1);
      }
    }
  }

  getSelectedItems(): Selectable[] {
    return [...this.selectedItems];
  }

  isItemSelected(item: Selectable): boolean {
    return this.selectedItems.includes(item);
  }

  setSelectedItems(selectedItems: Selectable[]): void {
    this.selectedItems = [...selectedItems];
    this.fireSelectionChange();
  }

  deselectItem(item: Selectable): void {
    const index = this.selectedItems.indexOf(item);
    if (index !== -1) {
      this.selectedItems.splice(index, 1);
      this.fireSelectionChange();
    }
  }

  private fireSelectionChange(): void {
    if (this.selectionListenersValue !== null) {
      const listeners = [...this.selectionListenersValue];
      for (const listener of listeners) {
        listener({ selectedItems: this.getSelectedItems() } as never);
      }
    }
  }

  // ---------------------------------------------------------------- rooms

  addRoomsListener(listener: CollectionListener<Room>): void {
    this.roomsChangeSupport.addCollectionListener(listener);
  }

  removeRoomsListener(listener: CollectionListener<Room>): void {
    this.roomsChangeSupport.removeCollectionListener(listener);
  }

  getRooms(): Room[] {
    return this.roomsValue;
  }

  addRoom(room: Room): void {
    this.addRoomAt(room, this.roomsValue.length);
  }

  addRoomAt(room: Room, index: number): void {
    const rooms = [...this.roomsValue];
    rooms.splice(index, 0, room);
    this.roomsValue = rooms;
    this.roomsChangeSupport.fireCollectionChangedAt(room, index, CollectionEvent.Type.ADD);
  }

  deleteRoom(room: Room): void {
    const index = this.roomsValue.indexOf(room);
    if (index !== -1) {
      const rooms = [...this.roomsValue];
      rooms.splice(index, 1);
      this.roomsValue = rooms;
      this.roomsChangeSupport.fireCollectionChangedAt(room, index, CollectionEvent.Type.DELETE);
    }
  }

  // ---------------------------------------------------------------- walls

  addWallsListener(listener: CollectionListener<Wall>): void {
    this.wallsChangeSupport.addCollectionListener(listener);
  }

  removeWallsListener(listener: CollectionListener<Wall>): void {
    this.wallsChangeSupport.removeCollectionListener(listener);
  }

  getWalls(): Wall[] {
    return this.wallsValue;
  }

  addWall(wall: Wall): void {
    this.addWallAt(wall, this.wallsValue.length);
  }

  addWallAt(wall: Wall, index: number): void {
    const walls = [...this.wallsValue];
    walls.splice(index, 0, wall);
    this.wallsValue = walls;
    this.wallsChangeSupport.fireCollectionChangedAt(wall, index, CollectionEvent.Type.ADD);
  }

  deleteWall(wall: Wall): void {
    const index = this.wallsValue.indexOf(wall);
    if (index !== -1) {
      const walls = [...this.wallsValue];
      walls.splice(index, 1);
      this.wallsValue = walls;
      this.wallsChangeSupport.fireCollectionChangedAt(wall, index, CollectionEvent.Type.DELETE);
    }
  }

  // ------------------------------------------------------------- polylines

  addPolylinesListener(listener: CollectionListener<Polyline>): void {
    this.polylinesChangeSupport.addCollectionListener(listener);
  }

  removePolylinesListener(listener: CollectionListener<Polyline>): void {
    this.polylinesChangeSupport.removeCollectionListener(listener);
  }

  getPolylines(): Polyline[] {
    return this.polylinesValue;
  }

  addPolyline(polyline: Polyline): void {
    this.addPolylineAt(polyline, this.polylinesValue.length);
  }

  addPolylineAt(polyline: Polyline, index: number): void {
    const polylines = [...this.polylinesValue];
    polylines.splice(index, 0, polyline);
    this.polylinesValue = polylines;
    this.polylinesChangeSupport.fireCollectionChangedAt(polyline, index, CollectionEvent.Type.ADD);
  }

  deletePolyline(polyline: Polyline): void {
    const index = this.polylinesValue.indexOf(polyline);
    if (index !== -1) {
      const polylines = [...this.polylinesValue];
      polylines.splice(index, 1);
      this.polylinesValue = polylines;
      this.polylinesChangeSupport.fireCollectionChangedAt(polyline, index, CollectionEvent.Type.DELETE);
    }
  }

  // -------------------------------------------------------- dimension lines

  addDimensionLinesListener(listener: CollectionListener<DimensionLine>): void {
    this.dimensionLinesChangeSupport.addCollectionListener(listener);
  }

  removeDimensionLinesListener(listener: CollectionListener<DimensionLine>): void {
    this.dimensionLinesChangeSupport.removeCollectionListener(listener);
  }

  getDimensionLines(): DimensionLine[] {
    return this.dimensionLinesValue;
  }

  addDimensionLine(dimensionLine: DimensionLine): void {
    this.addDimensionLineAt(dimensionLine, this.dimensionLinesValue.length);
  }

  addDimensionLineAt(dimensionLine: DimensionLine, index: number): void {
    const dimensionLines = [...this.dimensionLinesValue];
    dimensionLines.splice(index, 0, dimensionLine);
    this.dimensionLinesValue = dimensionLines;
    this.dimensionLinesChangeSupport.fireCollectionChangedAt(dimensionLine, index, CollectionEvent.Type.ADD);
  }

  deleteDimensionLine(dimensionLine: DimensionLine): void {
    const index = this.dimensionLinesValue.indexOf(dimensionLine);
    if (index !== -1) {
      const dimensionLines = [...this.dimensionLinesValue];
      dimensionLines.splice(index, 1);
      this.dimensionLinesValue = dimensionLines;
      this.dimensionLinesChangeSupport.fireCollectionChangedAt(dimensionLine, index, CollectionEvent.Type.DELETE);
    }
  }

  // ---------------------------------------------------------------- labels

  addLabelsListener(listener: CollectionListener<Label>): void {
    this.labelsChangeSupport.addCollectionListener(listener);
  }

  removeLabelsListener(listener: CollectionListener<Label>): void {
    this.labelsChangeSupport.removeCollectionListener(listener);
  }

  getLabels(): Label[] {
    return this.labelsValue;
  }

  addLabel(label: Label): void {
    this.addLabelAt(label, this.labelsValue.length);
  }

  addLabelAt(label: Label, index: number): void {
    const labels = [...this.labelsValue];
    labels.splice(index, 0, label);
    this.labelsValue = labels;
    this.labelsChangeSupport.fireCollectionChangedAt(label, index, CollectionEvent.Type.ADD);
  }

  deleteLabel(label: Label): void {
    const index = this.labelsValue.indexOf(label);
    if (index !== -1) {
      const labels = [...this.labelsValue];
      labels.splice(index, 1);
      this.labelsValue = labels;
      this.labelsChangeSupport.fireCollectionChangedAt(label, index, CollectionEvent.Type.DELETE);
    }
  }

  // ------------------------------------------------------- viewable / misc

  getSelectableViewableItems(): Selectable[] {
    const items: Selectable[] = [];
    const addViewable = (list: Elevatable[]): void => {
      for (const item of list) {
        const level = item.getLevel();
        if (level === null || level.isViewable()) {
          items.push(item as unknown as Selectable);
        }
      }
    };
    addViewable(this.wallsValue);
    addViewable(this.roomsValue);
    addViewable(this.dimensionLinesValue);
    addViewable(this.polylinesValue);
    addViewable(this.labelsValue);
    for (const piece of this.getFurniture()) {
      if (piece.isVisible() && (piece.getLevel() === null || piece.getLevel()!.isViewable())) {
        items.push(piece as unknown as Selectable);
      }
    }
    if (this.compass.isVisible()) {
      items.push(this.compass as unknown as Selectable);
    }
    return items;
  }

  /** Returns all the mutable objects handled by this home (like getHomeObjects). */
  getHomeObjects(): HomeObject[] {
    const homeItems: HomeObject[] = [];
    homeItems.push(this.environment as unknown as HomeObject);
    homeItems.push(this.compass as unknown as HomeObject);
    homeItems.push(...this.levelsValue);
    homeItems.push(...this.wallsValue as unknown as HomeObject[]);
    homeItems.push(...this.roomsValue as unknown as HomeObject[]);
    homeItems.push(...this.dimensionLinesValue as unknown as HomeObject[]);
    homeItems.push(...this.polylinesValue as unknown as HomeObject[]);
    homeItems.push(...this.labelsValue as unknown as HomeObject[]);
    for (const piece of this.getFurniture()) {
      homeItems.push(piece as unknown as HomeObject);
      if (piece instanceof HomeFurnitureGroup) {
        homeItems.push(...piece.getAllFurniture() as unknown as HomeObject[]);
      }
    }
    homeItems.push(this.topCamera);
    homeItems.push(this.observerCamera);
    homeItems.push(...this.storedCamerasValue);
    homeItems.push(...this.environment.getVideoCameraPath());
    return homeItems;
  }

  isEmpty(): boolean {
    return (
      this.furnitureValue.length === 0 &&
      this.wallsValue.length === 0 &&
      this.roomsValue.length === 0 &&
      this.dimensionLinesValue.length === 0 &&
      this.polylinesValue.length === 0 &&
      this.labelsValue.length === 0
    );
  }

  // ----------------------------------------------------------- basic fields

  getWallHeight(): number {
    return this.wallHeight;
  }

  getName(): string | null {
    return this.name;
  }

  setName(name: string | null): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.firePropertyChange(Home.Property.NAME, oldName, name);
    }
  }

  isModified(): boolean {
    return this.modified;
  }

  setModified(modified: boolean): void {
    if (modified !== this.modified) {
      const oldModified = this.modified;
      this.modified = modified;
      this.firePropertyChange(Home.Property.MODIFIED, oldModified, modified);
    }
  }

  isRecovered(): boolean {
    return this.recovered;
  }

  setRecovered(recovered: boolean): void {
    if (recovered !== this.recovered) {
      const oldRecovered = this.recovered;
      this.recovered = recovered;
      this.firePropertyChange(Home.Property.RECOVERED, oldRecovered, recovered);
    }
  }

  isRepaired(): boolean {
    return this.repaired;
  }

  setRepaired(repaired: boolean): void {
    if (repaired !== this.repaired) {
      const oldRepaired = this.repaired;
      this.repaired = repaired;
      this.firePropertyChange(Home.Property.REPAIRED, oldRepaired, repaired);
    }
  }

  getFurnitureSortedPropertyName(): string | null {
    return this.furnitureSortedPropertyName;
  }

  setFurnitureSortedPropertyName(furnitureSortedPropertyName: string | null): void {
    if (furnitureSortedPropertyName !== this.furnitureSortedPropertyName) {
      const oldName = this.furnitureSortedPropertyName;
      this.furnitureSortedPropertyName = furnitureSortedPropertyName;
      this.firePropertyChange(Home.Property.FURNITURE_SORTED_PROPERTY, oldName, furnitureSortedPropertyName);
    }
  }

  isFurnitureDescendingSorted(): boolean {
    return this.furnitureDescendingSorted;
  }

  setFurnitureDescendingSorted(furnitureDescendingSorted: boolean): void {
    if (furnitureDescendingSorted !== this.furnitureDescendingSorted) {
      const oldValue = this.furnitureDescendingSorted;
      this.furnitureDescendingSorted = furnitureDescendingSorted;
      this.firePropertyChange(Home.Property.FURNITURE_DESCENDING_SORTED, oldValue, furnitureDescendingSorted);
    }
  }

  getFurnitureVisiblePropertyNames(): string[] {
    return this.furnitureVisiblePropertyNames;
  }

  setFurnitureVisiblePropertyNames(furnitureVisiblePropertyNames: string[]): void {
    if (furnitureVisiblePropertyNames !== this.furnitureVisiblePropertyNames) {
      const oldNames = this.furnitureVisiblePropertyNames;
      this.furnitureVisiblePropertyNames = [...furnitureVisiblePropertyNames];
      this.firePropertyChange(Home.Property.FURNITURE_VISIBLE_PROPERTIES, oldNames, furnitureVisiblePropertyNames);
    }
  }

  getFurnitureAdditionalProperties(): ObjectProperty[] | null {
    return this.furnitureAdditionalPropertiesValue;
  }

  setFurnitureAdditionalProperties(furnitureAdditionalProperties: ObjectProperty[] | null): void {
    if (furnitureAdditionalProperties !== this.furnitureAdditionalPropertiesValue) {
      const oldProperties = this.furnitureAdditionalPropertiesValue;
      this.furnitureAdditionalPropertiesValue = furnitureAdditionalProperties === null ? null : [...furnitureAdditionalProperties];
      this.firePropertyChange(Home.Property.FURNITURE_ADDITIONAL_PROPERTIES, oldProperties, furnitureAdditionalProperties);
    }
  }

  getBackgroundImage(): BackgroundImage | null {
    return this.backgroundImage;
  }

  setBackgroundImage(backgroundImage: BackgroundImage | null): void {
    if (backgroundImage !== this.backgroundImage) {
      const oldBackgroundImage = this.backgroundImage;
      this.backgroundImage = backgroundImage;
      this.firePropertyChange(Home.Property.BACKGROUND_IMAGE, oldBackgroundImage, backgroundImage);
    }
  }

  // ---------------------------------------------------------------- cameras

  getTopCamera(): Camera {
    return this.topCamera;
  }

  getObserverCamera(): ObserverCamera {
    return this.observerCamera;
  }

  getCamera(): Camera {
    return this.camera;
  }

  setCamera(camera: Camera): void {
    if (camera !== this.camera) {
      const oldCamera = this.camera;
      this.camera = camera;
      this.firePropertyChange(Home.Property.CAMERA, oldCamera, camera);
    }
  }

  getStoredCameras(): Camera[] {
    return this.storedCamerasValue;
  }

  setStoredCameras(storedCameras: Camera[]): void {
    if (storedCameras !== this.storedCamerasValue) {
      const oldStoredCameras = this.storedCamerasValue;
      this.storedCamerasValue = [...storedCameras];
      this.firePropertyChange(Home.Property.STORED_CAMERAS, oldStoredCameras, storedCameras);
    }
  }

  // ------------------------------------------------------- environment etc.

  getEnvironment(): HomeEnvironment {
    return this.environment;
  }

  getCompass(): Compass {
    return this.compass;
  }

  getPrint(): HomePrint | null {
    return this.print;
  }

  setPrint(print: HomePrint | null): void {
    if (print !== this.print) {
      const oldPrint = this.print;
      this.print = print;
      this.firePropertyChange(Home.Property.PRINT, oldPrint, print);
    }
  }

  // ---------------------------------------------------- properties / visuals

  getVisualProperty(name: string): unknown {
    return this.visualProperties !== null ? this.visualProperties.get(name) : undefined;
  }

  setVisualProperty(name: string, value: unknown): void {
    if (this.visualProperties === null) {
      this.visualProperties = new Map();
    }
    this.visualProperties.set(name, value);
  }

  getProperty(name: string): string | null {
    return this.properties !== null ? (this.properties.get(name) ?? null) : null;
  }

  getNumericProperty(name: string): number | null {
    const value = this.getProperty(name);
    if (value !== null && value !== undefined) {
      try {
        return Number.parseFloat(value);
      } catch {
        return null;
      }
    }
    return null;
  }

  setProperty(name: string, value: string): void {
    if (this.properties === null) {
      this.properties = new Map();
    }
    this.properties.set(name, value);
  }

  getPropertyNames(): string[] {
    return this.properties !== null ? [...this.properties.keys()] : [];
  }

  isBasePlanLocked(): boolean {
    return this.basePlanLocked;
  }

  setBasePlanLocked(basePlanLocked: boolean): void {
    if (basePlanLocked !== this.basePlanLocked) {
      const oldValue = this.basePlanLocked;
      this.basePlanLocked = basePlanLocked;
      this.firePropertyChange(Home.Property.BASE_PLAN_LOCKED, oldValue, basePlanLocked);
    }
  }

  getVersion(): number {
    return this.version;
  }

  setVersion(version: number): void {
    this.version = version;
  }

  // ------------------------------------------------------------------ clone

  clone(): Home {
    const copy = new Home(this.wallHeight);
    copy.furnitureValue = this.furnitureValue.map((piece) => (piece as unknown as { clone?: () => HomePieceOfFurniture }).clone?.() ?? piece);
    copy.levelsValue = this.levelsValue.map((level) => level.clone());
    copy.wallsValue = this.wallsValue;
    copy.roomsValue = this.roomsValue;
    copy.polylinesValue = this.polylinesValue;
    copy.dimensionLinesValue = this.dimensionLinesValue;
    copy.labelsValue = this.labelsValue;
    copy.camera = this.camera.clone();
    copy.name = this.name;
    copy.backgroundImage = this.backgroundImage;
    copy.observerCamera = this.observerCamera.clone();
    copy.topCamera = this.topCamera.clone();
    copy.storedCamerasValue = this.storedCamerasValue.map((camera) => camera.clone());
    copy.environment = this.environment;
    copy.print = this.print;
    copy.furnitureSortedPropertyName = this.furnitureSortedPropertyName;
    copy.furnitureVisiblePropertyNames = [...this.furnitureVisiblePropertyNames];
    copy.furnitureDescendingSorted = this.furnitureDescendingSorted;
    copy.visualProperties = this.visualProperties !== null ? new Map(this.visualProperties) : null;
    copy.properties = this.properties !== null ? new Map(this.properties) : null;
    copy.version = this.version;
    copy.basePlanLocked = this.basePlanLocked;
    copy.compass = this.compass;
    return copy;
  }

  // ------------------------------------------------------------ static utils

  /** Returns the items in `items` that are instances of the given class. */
  static getSubList<T>(items: Selectable[], type: new (...args: never[]) => T): T[] {
    return items.filter((item) => item instanceof type) as T[];
  }
}

/** Binary search lower bound by the level elevation comparator. */
function lowerBound(levels: Level[], level: Level): number {
  let low = 0;
  let high = levels.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    const comparison = Home.levelComparator(levels[mid]!, level);
    if (comparison < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

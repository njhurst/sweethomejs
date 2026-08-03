/**
 * Port of com.eteks.sweethome3d.model.UserPreferences (GPL v2+).
 *
 * Abstract user preferences: units, language, catalogues, wall/room defaults,
 * 3D view attributes, auto-completion strings, recent colors and homes.
 * The localized-string lookup reads from a Messages registry (populated from
 * the ported .properties bundles in phase P6/i18n).
 */
import { PropertyChangeSupport } from "../events/PropertyChangeSupport.js";
import { f32 } from "../util/f32.js";
import { FurnitureCatalog } from "./Catalogs.js";
import { PatternsCatalog } from "./Catalogs.js";
import { TexturesCatalog } from "./Catalogs.js";
import { LengthUnit } from "./LengthUnit.js";
import type { HomeDescriptor, Library, TextureImage } from "./stubs.js";
import { TextStyle } from "./TextStyle.js";

/** A registry of localized messages keyed by bundle name (filled by the i18n pipeline). */
export interface MessageRegistry {
  getString(bundleName: string, key: string): string | null;
}

let messageRegistry: MessageRegistry | null = null;

export function setMessageRegistry(registry: MessageRegistry | null): void {
  messageRegistry = registry;
}

export class UserPreferences {
  static readonly Property = {
    LANGUAGE: "LANGUAGE",
    SUPPORTED_LANGUAGES: "SUPPORTED_LANGUAGES",
    UNIT: "UNIT",
    CURRENCY: "CURRENCY",
    VALUE_ADDED_TAX_ENABLED: "VALUE_ADDED_TAX_ENABLED",
    DEFAULT_VALUE_ADDED_TAX_PERCENTAGE: "DEFAULT_VALUE_ADDED_TAX_PERCENTAGE",
    FURNITURE_CATALOG_VIEWED_IN_TREE: "FURNITURE_CATALOG_VIEWED_IN_TREE",
    NAVIGATION_PANEL_VISIBLE: "NAVIGATION_PANEL_VISIBLE",
    AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED: "AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED",
    OBSERVER_CAMERA_SELECTED_AT_CHANGE: "OBSERVER_CAMERA_SELECTED_AT_CHANGE",
    MAGNETISM_ENABLED: "MAGNETISM_ENABLED",
    RULERS_VISIBLE: "RULERS_VISIBLE",
    GRID_VISIBLE: "GRID_VISIBLE",
    DRAWING_MODE_ENABLED: "DRAWING_MODE_ENABLED",
    DEFAULT_FONT_NAME: "DEFAULT_FONT_NAME",
    FURNITURE_VIEWED_FROM_TOP: "FURNITURE_VIEWED_FROM_TOP",
    FURNITURE_MODEL_ICON_SIZE: "FURNITURE_MODEL_ICON_SIZE",
    ROOM_FLOOR_COLORED_OR_TEXTURED: "ROOM_FLOOR_COLORED_OR_TEXTURED",
    WALL_PATTERN: "WALL_PATTERN",
    NEW_WALL_PATTERN: "NEW_WALL_PATTERN",
    NEW_WALL_THICKNESS: "NEW_WALL_THICKNESS",
    NEW_WALL_HEIGHT: "NEW_WALL_HEIGHT",
    NEW_WALL_BASEBOARD_THICKNESS: "NEW_WALL_BASEBOARD_THICKNESS",
    NEW_WALL_BASEBOARD_HEIGHT: "NEW_WALL_BASEBOARD_HEIGHT",
    NEW_ROOM_FLOOR_COLOR: "NEW_ROOM_FLOOR_COLOR",
    NEW_FLOOR_THICKNESS: "NEW_FLOOR_THICKNESS",
    RECENT_HOMES: "RECENT_HOMES",
    RECENT_COLORS: "RECENT_COLORS",
    RECENT_TEXTURES: "RECENT_TEXTURES",
    CHECK_UPDATES_ENABLED: "CHECK_UPDATES_ENABLED",
    UPDATES_MINIMUM_DATE: "UPDATES_MINIMUM_DATE",
    AUTO_SAVE_DELAY_FOR_RECOVERY: "AUTO_SAVE_DELAY_FOR_RECOVERY",
  } as const;

  static readonly FURNITURE_LIBRARY_TYPE = "Furniture library";
  static readonly TEXTURES_LIBRARY_TYPE = "Textures library";
  static readonly LANGUAGE_LIBRARY_TYPE = "Language library";

  private readonly furnitureCatalog: FurnitureCatalog;
  private readonly texturesCatalog: TexturesCatalog;
  private readonly patternsCatalog: PatternsCatalog;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);

  private unit: LengthUnit = new LengthUnit(LengthUnit.CENTIMETER);
  private language: string;
  private supportedLanguages: string[] = [];
  private currency: string | null = null;
  private valueAddedTaxEnabled = false;
  private defaultValueAddedTaxPercentage = 0;
  private furnitureCatalogViewedInTree = false;
  private navigationPanelVisible = false;
  private editingIn3DViewEnabled = true;
  private aerialViewCenteredOnSelectionEnabled = false;
  private observerCameraSelectedAtChange = false;
  private magnetismEnabled = true;
  private rulersVisible = true;
  private gridVisible = true;
  private drawingModeEnabled = false;
  private defaultFontName = TextStyle.DEFAULT_FONT_NAME;
  private furnitureViewedFromTop = false;
  private furnitureModelIconSize = 128;
  private roomFloorColoredOrTextured = true;
  private wallPattern: TextureImage | null = null;
  private newWallPattern: TextureImage | null = null;
  private newWallThickness = 12;
  private newWallHeight = 250;
  private newWallBaseboardThickness = 1;
  private newWallBaseboardHeight = 8;
  private newRoomFloorColor: number | null = null;
  private newFloorThickness = 20;
  private recentHomes: string[] = [];
  private recentColors: number[] = [];
  private recentTextures: TextureImage[] = [];
  private checkUpdatesEnabled = true;
  private updatesMinimumDate: number | null = null;
  private autoSaveDelayForRecovery = 300;
  private actionTipsIgnored: string[] = [];
  private autoCompletionStrings = new Map<string, string[]>();
  private recentCamerasCount = 10;

  constructor(language = "en") {
    this.furnitureCatalog = new FurnitureCatalog();
    this.texturesCatalog = new TexturesCatalog();
    this.patternsCatalog = new PatternsCatalog();
    this.language = language;
  }

  /** Must be implemented by concrete preferences (persistence). */
  write(): void {
    // no-op in the abstract base
  }

  addPropertyChangeListener(listener: (evt: unknown) => void): void;
  addPropertyChangeListener(property: string, listener: (evt: unknown) => void): void;
  addPropertyChangeListener(propertyOrListener: string | ((evt: unknown) => void), listener?: (evt: unknown) => void): void {
    if (typeof propertyOrListener === "string") {
      this.propertyChangeSupport.addPropertyChangeListener(propertyOrListener, listener as never);
    } else {
      this.propertyChangeSupport.addPropertyChangeListener(propertyOrListener as never);
    }
  }

  removePropertyChangeListener(listener: (evt: unknown) => void): void;
  removePropertyChangeListener(property: string, listener: (evt: unknown) => void): void;
  removePropertyChangeListener(propertyOrListener: string | ((evt: unknown) => void), listener?: (evt: unknown) => void): void {
    if (typeof propertyOrListener === "string") {
      this.propertyChangeSupport.removePropertyChangeListener(propertyOrListener, listener as never);
    } else {
      this.propertyChangeSupport.removePropertyChangeListener(propertyOrListener as never);
    }
  }

  private fire(property: string, oldValue: unknown, newValue: unknown): void {
    this.propertyChangeSupport.firePropertyChange(property, oldValue, newValue);
  }

  getFurnitureCatalog(): FurnitureCatalog {
    return this.furnitureCatalog;
  }

  getTexturesCatalog(): TexturesCatalog {
    return this.texturesCatalog;
  }

  getPatternsCatalog(): PatternsCatalog {
    return this.patternsCatalog;
  }

  getLengthUnit(): LengthUnit {
    return this.unit;
  }

  setUnit(unit: LengthUnit): void {
    if (unit !== this.unit) {
      const oldUnit = this.unit;
      this.unit = unit;
      this.fire(UserPreferences.Property.UNIT, oldUnit, unit);
    }
  }

  getLanguage(): string {
    return this.language;
  }

  setLanguage(language: string): void {
    if (language !== this.language) {
      const oldLanguage = this.language;
      this.language = language;
      this.fire(UserPreferences.Property.LANGUAGE, oldLanguage, language);
    }
  }

  isLanguageEditable(): boolean {
    return true;
  }

  getDefaultSupportedLanguages(): string[] {
    return ["en", "fr", "de", "es", "it", "pt", "nl", "sv", "pl", "cs", "ru", "ja", "zh_CN", "zh_TW", "tr", "el", "hu", "ro", "bg", "uk", "hr", "fi", "nb", "da", "ko", "vi", "ar"];
  }

  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  setSupportedLanguages(supportedLanguages: string[]): void {
    if (supportedLanguages !== this.supportedLanguages) {
      const oldSupportedLanguages = this.supportedLanguages;
      this.supportedLanguages = [...supportedLanguages];
      this.fire(UserPreferences.Property.SUPPORTED_LANGUAGES, oldSupportedLanguages, supportedLanguages);
    }
  }

  /** Looks up a localized string; falls back to the key when unregistered. */
  getLocalizedString(resourceClassOrFamily: unknown, key: string, ...args: unknown[]): string {
    let bundleName = "";
    if (typeof resourceClassOrFamily === "string") {
      bundleName = resourceClassOrFamily;
    } else if (typeof resourceClassOrFamily === "function") {
      bundleName = (resourceClassOrFamily as { name?: string }).name ?? "";
    }
    return this.getLocalizedStringFromBundle(bundleName, key, args);
  }

  private getLocalizedStringFromBundle(bundleName: string, key: string, args: unknown[]): string {
    const value = messageRegistry !== null ? messageRegistry.getString(bundleName, key) : null;
    let message = value ?? key;
    if (args.length > 0) {
      // Java MessageFormat-style {0}, {1} substitution
      message = message.replace(/\{(\d+)\}/g, (match, index) => {
        const arg = args[Number.parseInt(index, 10)];
        return arg === undefined ? match : String(arg);
      });
    }
    return message;
  }

  getCurrency(): string | null {
    return this.currency;
  }

  setCurrency(currency: string | null): void {
    if (currency !== this.currency) {
      const oldCurrency = this.currency;
      this.currency = currency;
      this.fire(UserPreferences.Property.CURRENCY, oldCurrency, currency);
    }
  }

  isValueAddedTaxEnabled(): boolean {
    return this.valueAddedTaxEnabled;
  }

  setValueAddedTaxEnabled(valueAddedTaxEnabled: boolean): void {
    if (valueAddedTaxEnabled !== this.valueAddedTaxEnabled) {
      const oldValue = this.valueAddedTaxEnabled;
      this.valueAddedTaxEnabled = valueAddedTaxEnabled;
      this.fire(UserPreferences.Property.VALUE_ADDED_TAX_ENABLED, oldValue, valueAddedTaxEnabled);
    }
  }

  getDefaultValueAddedTaxPercentage(): number {
    return this.defaultValueAddedTaxPercentage;
  }

  setDefaultValueAddedTaxPercentage(valueAddedTaxPercentage: number): void {
    if (valueAddedTaxPercentage !== this.defaultValueAddedTaxPercentage) {
      const oldValue = this.defaultValueAddedTaxPercentage;
      this.defaultValueAddedTaxPercentage = valueAddedTaxPercentage;
      this.fire(UserPreferences.Property.DEFAULT_VALUE_ADDED_TAX_PERCENTAGE, oldValue, valueAddedTaxPercentage);
    }
  }

  isFurnitureCatalogViewedInTree(): boolean {
    return this.furnitureCatalogViewedInTree;
  }

  setFurnitureCatalogViewedInTree(furnitureCatalogViewedInTree: boolean): void {
    if (furnitureCatalogViewedInTree !== this.furnitureCatalogViewedInTree) {
      const oldValue = this.furnitureCatalogViewedInTree;
      this.furnitureCatalogViewedInTree = furnitureCatalogViewedInTree;
      this.fire(UserPreferences.Property.FURNITURE_CATALOG_VIEWED_IN_TREE, oldValue, furnitureCatalogViewedInTree);
    }
  }

  isNavigationPanelVisible(): boolean {
    return this.navigationPanelVisible;
  }

  setNavigationPanelVisible(navigationPanelVisible: boolean): void {
    if (navigationPanelVisible !== this.navigationPanelVisible) {
      const oldValue = this.navigationPanelVisible;
      this.navigationPanelVisible = navigationPanelVisible;
      this.fire(UserPreferences.Property.NAVIGATION_PANEL_VISIBLE, oldValue, navigationPanelVisible);
    }
  }

  isEditingIn3DViewEnabled(): boolean {
    return this.editingIn3DViewEnabled;
  }

  setEditingIn3DViewEnabled(editingIn3DViewEnabled: boolean): void {
    this.editingIn3DViewEnabled = editingIn3DViewEnabled;
  }

  isAerialViewCenteredOnSelectionEnabled(): boolean {
    return this.aerialViewCenteredOnSelectionEnabled;
  }

  setAerialViewCenteredOnSelectionEnabled(enabled: boolean): void {
    if (enabled !== this.aerialViewCenteredOnSelectionEnabled) {
      const oldValue = this.aerialViewCenteredOnSelectionEnabled;
      this.aerialViewCenteredOnSelectionEnabled = enabled;
      this.fire(UserPreferences.Property.AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED, oldValue, enabled);
    }
  }

  isObserverCameraSelectedAtChange(): boolean {
    return this.observerCameraSelectedAtChange;
  }

  setObserverCameraSelectedAtChange(enabled: boolean): void {
    if (enabled !== this.observerCameraSelectedAtChange) {
      const oldValue = this.observerCameraSelectedAtChange;
      this.observerCameraSelectedAtChange = enabled;
      this.fire(UserPreferences.Property.OBSERVER_CAMERA_SELECTED_AT_CHANGE, oldValue, enabled);
    }
  }

  isMagnetismEnabled(): boolean {
    return this.magnetismEnabled;
  }

  setMagnetismEnabled(magnetismEnabled: boolean): void {
    if (magnetismEnabled !== this.magnetismEnabled) {
      const oldValue = this.magnetismEnabled;
      this.magnetismEnabled = magnetismEnabled;
      this.fire(UserPreferences.Property.MAGNETISM_ENABLED, oldValue, magnetismEnabled);
    }
  }

  isRulersVisible(): boolean {
    return this.rulersVisible;
  }

  setRulersVisible(rulersVisible: boolean): void {
    if (rulersVisible !== this.rulersVisible) {
      const oldValue = this.rulersVisible;
      this.rulersVisible = rulersVisible;
      this.fire(UserPreferences.Property.RULERS_VISIBLE, oldValue, rulersVisible);
    }
  }

  isGridVisible(): boolean {
    return this.gridVisible;
  }

  setGridVisible(gridVisible: boolean): void {
    if (gridVisible !== this.gridVisible) {
      const oldValue = this.gridVisible;
      this.gridVisible = gridVisible;
      this.fire(UserPreferences.Property.GRID_VISIBLE, oldValue, gridVisible);
    }
  }

  isDrawingModeEnabled(): boolean {
    return this.drawingModeEnabled;
  }

  getDefaultFontName(): string {
    return this.defaultFontName;
  }

  setDefaultFontName(defaultFontName: string): void {
    this.defaultFontName = defaultFontName;
  }

  isFurnitureViewedFromTop(): boolean {
    return this.furnitureViewedFromTop;
  }

  setFurnitureViewedFromTop(furnitureViewedFromTop: boolean): void {
    this.furnitureViewedFromTop = furnitureViewedFromTop;
  }

  getFurnitureModelIconSize(): number {
    return this.furnitureModelIconSize;
  }

  setFurnitureModelIconSize(furnitureModelIconSize: number): void {
    this.furnitureModelIconSize = furnitureModelIconSize;
  }

  isRoomFloorColoredOrTextured(): boolean {
    return this.roomFloorColoredOrTextured;
  }

  setFloorColoredOrTextured(roomFloorColoredOrTextured: boolean): void {
    this.roomFloorColoredOrTextured = roomFloorColoredOrTextured;
  }

  getWallPattern(): TextureImage | null {
    return this.wallPattern;
  }

  setWallPattern(wallPattern: TextureImage | null): void {
    this.wallPattern = wallPattern;
  }

  getNewWallPattern(): TextureImage | null {
    return this.newWallPattern;
  }

  setNewWallPattern(newWallPattern: TextureImage | null): void {
    this.newWallPattern = newWallPattern;
  }

  getNewWallThickness(): number {
    return this.newWallThickness;
  }

  setNewWallThickness(newWallThickness: number): void {
    this.newWallThickness = f32(newWallThickness);
  }

  getNewWallHeight(): number {
    return this.newWallHeight;
  }

  setNewWallHeight(newWallHeight: number): void {
    this.newWallHeight = f32(newWallHeight);
  }

  getNewWallBaseboardThickness(): number {
    return this.newWallBaseboardThickness;
  }

  setNewWallBaseboardThickness(newWallBaseboardThickness: number): void {
    this.newWallBaseboardThickness = f32(newWallBaseboardThickness);
  }

  getNewWallBaseboardHeight(): number {
    return this.newWallBaseboardHeight;
  }

  setNewWallBaseboardHeight(newWallBaseboardHeight: number): void {
    this.newWallBaseboardHeight = f32(newWallBaseboardHeight);
  }

  getNewRoomFloorColor(): number | null {
    return this.newRoomFloorColor;
  }

  setNewRoomFloorColor(newRoomFloorColor: number | null): void {
    this.newRoomFloorColor = newRoomFloorColor;
  }

  getNewFloorThickness(): number {
    return this.newFloorThickness;
  }

  setNewFloorThickness(newFloorThickness: number): void {
    this.newFloorThickness = f32(newFloorThickness);
  }

  isCheckUpdatesEnabled(): boolean {
    return this.checkUpdatesEnabled;
  }

  setCheckUpdatesEnabled(updatesChecked: boolean): void {
    this.checkUpdatesEnabled = updatesChecked;
  }

  getUpdatesMinimumDate(): number | null {
    return this.updatesMinimumDate;
  }

  setUpdatesMinimumDate(updatesMinimumDate: number | null): void {
    this.updatesMinimumDate = updatesMinimumDate;
  }

  getAutoSaveDelayForRecovery(): number {
    return this.autoSaveDelayForRecovery;
  }

  setAutoSaveDelayForRecovery(autoSaveDelayForRecovery: number): void {
    this.autoSaveDelayForRecovery = autoSaveDelayForRecovery;
  }

  getRecentHomes(): string[] {
    return this.recentHomes;
  }

  setRecentHomes(recentHomes: string[]): void {
    if (recentHomes !== this.recentHomes) {
      const oldRecentHomes = this.recentHomes;
      this.recentHomes = [...recentHomes];
      this.fire(UserPreferences.Property.RECENT_HOMES, oldRecentHomes, recentHomes);
    }
  }

  getRecentHomesMaxCount(): number {
    return 8;
  }

  getStoredCamerasMaxCount(): number {
    return this.recentCamerasCount;
  }

  setActionTipIgnored(actionKey: string): void {
    if (this.actionTipsIgnored.indexOf(actionKey) === -1) {
      this.actionTipsIgnored.push(actionKey);
    }
  }

  isActionTipIgnored(actionKey: string): boolean {
    return this.actionTipsIgnored.indexOf(actionKey) !== -1;
  }

  resetIgnoredActionTips(): void {
    this.actionTipsIgnored = [];
  }

  getDefaultTextStyle(_selectableClass: unknown): TextStyle {
    return TextStyle.getDefaultTextStyle();
  }

  getAutoCompletionStrings(property: string): string[] {
    return this.autoCompletionStrings.get(property) ?? [];
  }

  addAutoCompletionString(property: string, autoCompletionString: string): void {
    const strings = this.autoCompletionStrings.get(property) ?? [];
    if (strings.indexOf(autoCompletionString) === -1) {
      strings.push(autoCompletionString);
      this.autoCompletionStrings.set(property, strings);
    }
  }

  setAutoCompletionStrings(property: string, autoCompletionStrings: string[]): void {
    this.autoCompletionStrings.set(property, [...autoCompletionStrings]);
  }

  getAutoCompletedProperties(): string[] {
    return [...this.autoCompletionStrings.keys()];
  }

  getRecentColors(): number[] {
    return this.recentColors;
  }

  setRecentColors(recentColors: number[]): void {
    if (recentColors !== this.recentColors) {
      const oldRecentColors = this.recentColors;
      this.recentColors = [...recentColors];
      this.fire(UserPreferences.Property.RECENT_COLORS, oldRecentColors, recentColors);
    }
  }

  getRecentTextures(): TextureImage[] {
    return this.recentTextures;
  }

  setRecentTextures(recentTextures: TextureImage[]): void {
    if (recentTextures !== this.recentTextures) {
      const oldRecentTextures = this.recentTextures;
      this.recentTextures = [...recentTextures];
      this.fire(UserPreferences.Property.RECENT_TEXTURES, oldRecentTextures, recentTextures);
    }
  }

  getHomeExamples(): HomeDescriptor[] {
    return [];
  }

  setPhotoRenderer(_photoRenderer: string): void {
    // stored in the concrete preferences
  }

  getPhotoRenderer(): string {
    return "com.eteks.sweethome3d.j3d.PhotoRenderer";
  }

  getLibraries(): Library[] {
    return [];
  }
}

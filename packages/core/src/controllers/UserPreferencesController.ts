/*
 * UserPreferencesController.ts.ts
 *
 * Translated from Sweet Home 3D UserPreferencesController.java.java
 * Sweet Home 3D, Copyright (c) 2024 Space Mushrooms <info@sweethome3d.com>
 * TypeScript translation Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * Porting notes:
 *   - Keep method names identical to the Java source so upstream fixes map 1:1.
 *   - Mark every float-narrowing point with f32() (see docs/05-file-format.md).
 *   - Update this file's row in TRANSLATION.md when porting status changes.
 */

/**
 * UserPreferencesController (port of
 * com.eteks.sweethome3d.viewcontroller.UserPreferencesController, GPL v2+).
 * Edits user preferences (language, unit, furniture view options, ...).
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import type { HomeController } from "./HomeController.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { LengthUnit } from "../model/LengthUnit.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { TextureImage } from "../model/stubs.js";

export class UserPreferencesController {
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly homeController: HomeController | null;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private userPreferencesView: DialogView | null = null;
  private language!: string;
  private unit!: LengthUnit;
  private currency!: string | null;
  private valueAddedTaxEnabled!: boolean;
  private furnitureCatalogViewedInTree!: boolean;
  private navigationPanelVisible!: boolean;
  private editingIn3DViewEnabled!: boolean;
  private aerialViewCenteredOnSelectionEnabled!: boolean;
  private observerCameraSelectedAtChange!: boolean;
  private magnetismEnabled!: boolean;
  private rulersVisible!: boolean;
  private gridVisible!: boolean;
  private defaultFontName!: string | null;
  private furnitureViewedFromTop!: boolean;
  private furnitureModelIconSize!: number;
  private roomFloorColoredOrTextured!: boolean;
  private wallPattern!: TextureImage | null;
  private newWallPattern!: TextureImage | null;
  private newWallThickness!: number;
  private newWallHeight!: number;
  private newFloorThickness!: number;
  private checkUpdatesEnabled!: boolean;
  private autoSaveDelayForRecovery!: number;
  private autoSaveForRecoveryEnabled!: boolean;

  constructor(preferences: UserPreferences, viewFactory: ViewFactory, contentManager: ContentManager | null = null, homeController: HomeController | null = null) {
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.homeController = homeController;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.userPreferencesView === null) {
      this.userPreferencesView = this.viewFactory.createUserPreferencesView(this.preferences, this);
    }
    return this.userPreferencesView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: UserPreferencesController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: UserPreferencesController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  private updateProperties(): void {
    this.setLanguage(this.preferences.getLanguage());
    this.setUnit(this.preferences.getLengthUnit());
    this.setCurrency(this.preferences.getCurrency());
    this.setValueAddedTaxEnabled(this.preferences.isValueAddedTaxEnabled());
    this.setFurnitureCatalogViewedInTree(this.preferences.isFurnitureCatalogViewedInTree());
    this.setNavigationPanelVisible(this.preferences.isNavigationPanelVisible());
    this.setEditingIn3DViewEnabled(this.preferences.isEditingIn3DViewEnabled());
    this.setAerialViewCenteredOnSelectionEnabled(this.preferences.isAerialViewCenteredOnSelectionEnabled());
    this.setObserverCameraSelectedAtChange(this.preferences.isObserverCameraSelectedAtChange());
    this.setMagnetismEnabled(this.preferences.isMagnetismEnabled());
    this.setRulersVisible(this.preferences.isRulersVisible());
    this.setGridVisible(this.preferences.isGridVisible());
    this.setDefaultFontName(this.preferences.getDefaultFontName());
    this.setFurnitureViewedFromTop(this.preferences.isFurnitureViewedFromTop());
    this.setFurnitureModelIconSize(this.preferences.getFurnitureModelIconSize());
    this.setRoomFloorColoredOrTextured(this.preferences.isRoomFloorColoredOrTextured());
    this.setWallPattern(this.preferences.getWallPattern());
    this.setNewWallPattern(this.preferences.getNewWallPattern());
    this.setNewWallThickness(this.preferences.getNewWallThickness());
    this.setNewWallHeight(this.preferences.getNewWallHeight());
    this.setNewFloorThickness(this.preferences.getNewFloorThickness());
    this.setCheckUpdatesEnabled(this.preferences.isCheckUpdatesEnabled());
    this.setAutoSaveDelayForRecovery(this.preferences.getAutoSaveDelayForRecovery());
    this.setAutoSaveForRecoveryEnabled(false);
  }

  isPropertyEditable(property: UserPreferencesController.Property): boolean {
    return this.homeController === null || this.homeController !== null;
  }

  setLanguage(language: string): void {
    if (language !== this.language) {
      const oldLanguage = this.language;
      this.language = language;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.LANGUAGE, oldLanguage, language);
    }
  }

  getLanguage(): string {
    return this.language;
  }

  setUnit(unit: LengthUnit): void {
    if (unit !== this.unit) {
      const oldUnit = this.unit;
      this.unit = unit;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.UNIT, oldUnit, unit);
    }
  }

  getUnit(): LengthUnit {
    return this.unit;
  }

  setCurrency(currency: string | null): void {
    if (currency !== this.currency) {
      const oldCurrency = this.currency;
      this.currency = currency;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.CURRENCY, oldCurrency, currency);
      if (currency === null) {
        this.setValueAddedTaxEnabled(false);
      }
    }
  }

  getCurrency(): string | null {
    return this.currency;
  }

  setValueAddedTaxEnabled(valueAddedTaxEnabled: boolean): void {
    if (valueAddedTaxEnabled !== this.valueAddedTaxEnabled) {
      this.valueAddedTaxEnabled = valueAddedTaxEnabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.VALUE_ADDED_TAX_ENABLED, !valueAddedTaxEnabled, valueAddedTaxEnabled);
    }
  }

  isValueAddedTaxEnabled(): boolean {
    return this.valueAddedTaxEnabled;
  }

  setFurnitureCatalogViewedInTree(furnitureCatalogViewedInTree: boolean): void {
    if (furnitureCatalogViewedInTree !== this.furnitureCatalogViewedInTree) {
      this.furnitureCatalogViewedInTree = furnitureCatalogViewedInTree;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.FURNITURE_CATALOG_VIEWED_IN_TREE, !furnitureCatalogViewedInTree, furnitureCatalogViewedInTree);
    }
  }

  isFurnitureCatalogViewedInTree(): boolean {
    return this.furnitureCatalogViewedInTree;
  }

  setNavigationPanelVisible(navigationPanelVisible: boolean): void {
    if (navigationPanelVisible !== this.navigationPanelVisible) {
      this.navigationPanelVisible = navigationPanelVisible;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.NAVIGATION_PANEL_VISIBLE, !navigationPanelVisible, navigationPanelVisible);
    }
  }

  isNavigationPanelVisible(): boolean {
    return this.navigationPanelVisible;
  }

  setEditingIn3DViewEnabled(editingIn3DViewEnabled: boolean): void {
    if (editingIn3DViewEnabled !== this.editingIn3DViewEnabled) {
      this.editingIn3DViewEnabled = editingIn3DViewEnabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.EDITING_IN_3D_VIEW_ENABLED, !editingIn3DViewEnabled, editingIn3DViewEnabled);
    }
  }

  isEditingIn3DViewEnabled(): boolean {
    return this.editingIn3DViewEnabled;
  }

  setAerialViewCenteredOnSelectionEnabled(enabled: boolean): void {
    if (enabled !== this.aerialViewCenteredOnSelectionEnabled) {
      this.aerialViewCenteredOnSelectionEnabled = enabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED, !enabled, enabled);
    }
  }

  isAerialViewCenteredOnSelectionEnabled(): boolean {
    return this.aerialViewCenteredOnSelectionEnabled;
  }

  setObserverCameraSelectedAtChange(observerCameraSelectedAtChange: boolean): void {
    if (observerCameraSelectedAtChange !== this.observerCameraSelectedAtChange) {
      this.observerCameraSelectedAtChange = observerCameraSelectedAtChange;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.OBSERVER_CAMERA_SELECTED_AT_CHANGE, !observerCameraSelectedAtChange, observerCameraSelectedAtChange);
    }
  }

  isObserverCameraSelectedAtChange(): boolean {
    return this.observerCameraSelectedAtChange;
  }

  setMagnetismEnabled(magnetismEnabled: boolean): void {
    if (magnetismEnabled !== this.magnetismEnabled) {
      this.magnetismEnabled = magnetismEnabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.MAGNETISM_ENABLED, !magnetismEnabled, magnetismEnabled);
    }
  }

  isMagnetismEnabled(): boolean {
    return this.magnetismEnabled;
  }

  setRulersVisible(rulersVisible: boolean): void {
    if (rulersVisible !== this.rulersVisible) {
      this.rulersVisible = rulersVisible;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.RULERS_VISIBLE, !rulersVisible, rulersVisible);
    }
  }

  isRulersVisible(): boolean {
    return this.rulersVisible;
  }

  setGridVisible(gridVisible: boolean): void {
    if (gridVisible !== this.gridVisible) {
      this.gridVisible = gridVisible;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.GRID_VISIBLE, !gridVisible, gridVisible);
    }
  }

  isGridVisible(): boolean {
    return this.gridVisible;
  }

  setDefaultFontName(defaultFontName: string | null): void {
    if (defaultFontName !== this.defaultFontName) {
      const oldDefaultFontName = this.defaultFontName;
      this.defaultFontName = defaultFontName;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.DEFAULT_FONT_NAME, oldDefaultFontName, defaultFontName);
    }
  }

  getDefaultFontName(): string | null {
    return this.defaultFontName;
  }

  setFurnitureViewedFromTop(furnitureViewedFromTop: boolean): void {
    if (furnitureViewedFromTop !== this.furnitureViewedFromTop) {
      this.furnitureViewedFromTop = furnitureViewedFromTop;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.FURNITURE_VIEWED_FROM_TOP, !furnitureViewedFromTop, furnitureViewedFromTop);
    }
  }

  isFurnitureViewedFromTop(): boolean {
    return this.furnitureViewedFromTop;
  }

  setFurnitureModelIconSize(furnitureModelIconSize: number): void {
    if (furnitureModelIconSize !== this.furnitureModelIconSize) {
      const oldFurnitureModelIconSize = this.furnitureModelIconSize;
      this.furnitureModelIconSize = furnitureModelIconSize;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.FURNITURE_MODEL_ICON_SIZE, oldFurnitureModelIconSize, furnitureModelIconSize);
    }
  }

  getFurnitureModelIconSize(): number {
    return this.furnitureModelIconSize;
  }

  setRoomFloorColoredOrTextured(floorTextureVisible: boolean): void {
    if (floorTextureVisible !== this.roomFloorColoredOrTextured) {
      this.roomFloorColoredOrTextured = floorTextureVisible;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.ROOM_FLOOR_COLORED_OR_TEXTURED, !floorTextureVisible, floorTextureVisible);
    }
  }

  isRoomFloorColoredOrTextured(): boolean {
    return this.roomFloorColoredOrTextured;
  }

  setWallPattern(wallPattern: TextureImage | null): void {
    if (wallPattern !== this.wallPattern) {
      const oldWallPattern = this.wallPattern;
      this.wallPattern = wallPattern;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.WALL_PATTERN, oldWallPattern, wallPattern);
    }
  }

  getWallPattern(): TextureImage | null {
    return this.wallPattern;
  }

  setNewWallPattern(newWallPattern: TextureImage | null): void {
    if (newWallPattern !== this.newWallPattern) {
      const oldNewWallPattern = this.newWallPattern;
      this.newWallPattern = newWallPattern;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.NEW_WALL_PATTERN, oldNewWallPattern, newWallPattern);
    }
  }

  getNewWallPattern(): TextureImage | null {
    return this.newWallPattern;
  }

  setNewWallThickness(newWallThickness: number): void {
    if (newWallThickness !== this.newWallThickness) {
      const oldNewWallThickness = this.newWallThickness;
      this.newWallThickness = newWallThickness;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.NEW_WALL_THICKNESS, oldNewWallThickness, newWallThickness);
    }
  }

  getNewWallThickness(): number {
    return this.newWallThickness;
  }

  setNewWallHeight(newWallHeight: number): void {
    if (newWallHeight !== this.newWallHeight) {
      const oldNewWallHeight = this.newWallHeight;
      this.newWallHeight = newWallHeight;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.NEW_WALL_HEIGHT, oldNewWallHeight, newWallHeight);
    }
  }

  getNewWallHeight(): number {
    return this.newWallHeight;
  }

  setNewFloorThickness(newFloorThickness: number): void {
    if (newFloorThickness !== this.newFloorThickness) {
      const oldNewFloorThickness = this.newFloorThickness;
      this.newFloorThickness = newFloorThickness;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.NEW_FLOOR_THICKNESS, oldNewFloorThickness, newFloorThickness);
    }
  }

  getNewFloorThickness(): number {
    return this.newFloorThickness;
  }

  setCheckUpdatesEnabled(checkUpdatesEnabled: boolean): void {
    if (checkUpdatesEnabled !== this.checkUpdatesEnabled) {
      this.checkUpdatesEnabled = checkUpdatesEnabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.CHECK_UPDATES_ENABLED, !checkUpdatesEnabled, checkUpdatesEnabled);
    }
  }

  isCheckUpdatesEnabled(): boolean {
    return this.checkUpdatesEnabled;
  }

  setAutoSaveDelayForRecovery(autoSaveDelayForRecovery: number): void {
    if (autoSaveDelayForRecovery !== this.autoSaveDelayForRecovery) {
      const oldAutoSaveDelayForRecovery = this.autoSaveDelayForRecovery;
      this.autoSaveDelayForRecovery = autoSaveDelayForRecovery;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.AUTO_SAVE_DELAY_FOR_RECOVERY, oldAutoSaveDelayForRecovery, autoSaveDelayForRecovery);
    }
  }

  getAutoSaveDelayForRecovery(): number {
    return this.autoSaveDelayForRecovery;
  }

  setAutoSaveForRecoveryEnabled(autoSaveForRecoveryEnabled: boolean): void {
    if (autoSaveForRecoveryEnabled !== this.autoSaveForRecoveryEnabled) {
      this.autoSaveForRecoveryEnabled = autoSaveForRecoveryEnabled;
      this.propertyChangeSupport.firePropertyChange(UserPreferencesController.Property.AUTO_SAVE_FOR_RECOVERY_ENABLED, !autoSaveForRecoveryEnabled, autoSaveForRecoveryEnabled);
    }
  }

  isAutoSaveForRecoveryEnabled(): boolean {
    return this.autoSaveForRecoveryEnabled;
  }

  checkUpdates(): void {
    // Deferred to the UI layer
  }

  mayImportLanguageLibrary(): boolean {
    return this.homeController !== null;
  }

  importLanguageLibrary(): void {
    if (this.homeController !== null) {
      // HomeController.importLanguageLibrary ported in a later task
      throw new Error("HomeController.importLanguageLibrary not ported yet");
    }
  }
}

export namespace UserPreferencesController {
  export enum Property {
    LANGUAGE = "LANGUAGE",
    UNIT = "UNIT",
    CURRENCY = "CURRENCY",
    VALUE_ADDED_TAX_ENABLED = "VALUE_ADDED_TAX_ENABLED",
    MAGNETISM_ENABLED = "MAGNETISM_ENABLED",
    RULERS_VISIBLE = "RULERS_VISIBLE",
    GRID_VISIBLE = "GRID_VISIBLE",
    DEFAULT_FONT_NAME = "DEFAULT_FONT_NAME",
    FURNITURE_VIEWED_FROM_TOP = "FURNITURE_VIEWED_FROM_TOP",
    FURNITURE_MODEL_ICON_SIZE = "FURNITURE_MODEL_ICON_SIZE",
    ROOM_FLOOR_COLORED_OR_TEXTURED = "ROOM_FLOOR_COLORED_OR_TEXTURED",
    WALL_PATTERN = "WALL_PATTERN",
    NEW_WALL_PATTERN = "NEW_WALL_PATTERN",
    NEW_WALL_THICKNESS = "NEW_WALL_THICKNESS",
    NEW_WALL_HEIGHT = "NEW_WALL_HEIGHT",
    NEW_FLOOR_THICKNESS = "NEW_FLOOR_THICKNESS",
    FURNITURE_CATALOG_VIEWED_IN_TREE = "FURNITURE_CATALOG_VIEWED_IN_TREE",
    NAVIGATION_PANEL_VISIBLE = "NAVIGATION_PANEL_VISIBLE",
    EDITING_IN_3D_VIEW_ENABLED = "EDITING_IN_3D_VIEW_ENABLED",
    AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED = "AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED",
    OBSERVER_CAMERA_SELECTED_AT_CHANGE = "OBSERVER_CAMERA_SELECTED_AT_CHANGE",
    CHECK_UPDATES_ENABLED = "CHECK_UPDATES_ENABLED",
    AUTO_SAVE_DELAY_FOR_RECOVERY = "AUTO_SAVE_DELAY_FOR_RECOVERY",
    AUTO_SAVE_FOR_RECOVERY_ENABLED = "AUTO_SAVE_FOR_RECOVERY_ENABLED",
  }
}


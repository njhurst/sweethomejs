/*
 * FurnitureController.ts.ts
 *
 * Translated from Sweet Home 3D FurnitureController.java.java
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
 * FurnitureController (port of
 * com.eteks.sweethome3d.viewcontroller.FurnitureController, GPL v2+).
 * Controls the furniture list view and the furniture-related actions
 * (add/delete/group/ungroup/align/distribute/reset elevation/sort).
 */
import { LocalizedUndoableEdit } from "./LocalizedUndoableEdit.js";
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { UndoableEditSupport, type UndoableEditListener } from "./undo/UndoableEditSupport.js";
import type { UndoableEdit } from "./undo/UndoableEdit.js";
import { Home } from "../model/Home.js";
import { HomeFurnitureGroup } from "../model/HomeFurnitureGroup.js";
import { HomeDoorOrWindow } from "../model/HomeDoorOrWindow.js";
import { HomeLight } from "../model/HomeLight.js";
import { HomeShelfUnit } from "../model/HomeShelfUnit.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Level } from "../model/Level.js";
import type { Selectable } from "../model/Selectable.js";
import type { PieceOfFurniture } from "../model/PieceOfFurniture.js";
import type { DoorOrWindow, Light, ShelfUnit } from "../model/Interfaces.js";

export class FurnitureController implements Controller {
  protected readonly home: Home;
  protected readonly preferences: UserPreferences;
  protected readonly viewFactory: ViewFactory;
  protected readonly contentManager: ContentManager | null;
  protected readonly undoSupport: UndoableEditSupport | null;
  private furnitureView: View | null = null;
  private leadSelectedPieceOfFurniture: HomePieceOfFurniture | null = null;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory);
  constructor(
    home: Home,
    preferences: UserPreferences,
    viewFactory: ViewFactory,
    contentManager: ContentManager | null,
    undoSupport: UndoableEditSupport | null,
  );
  constructor(
    readonly home_: Home,
    readonly preferences_: UserPreferences,
    readonly viewFactory_: ViewFactory,
    readonly contentManager_: ContentManager | null = null,
    readonly undoSupport_: UndoableEditSupport | null = null,
  ) {
    this.home = home_;
    this.preferences = preferences_;
    this.viewFactory = viewFactory_;
    this.contentManager = contentManager_;
    this.undoSupport = undoSupport_;
    this.addModelListeners();
  }

  getView(): View {
    if (this.furnitureView === null) {
      this.furnitureView = this.viewFactory.createFurnitureView(this.home, this.preferences, this);
    }
    return this.furnitureView;
  }

  private addModelListeners(): void {
    // Selection listener tracking the lead selected piece
    this.home.addSelectionListener((ev) => {
      const selectedFurniture = Home.getFurnitureSubList(this.home.getSelectedItems());
      if (selectedFurniture.length === 0) {
        this.leadSelectedPieceOfFurniture = null;
      } else if (
        this.leadSelectedPieceOfFurniture === null ||
        selectedFurniture.length === 1 ||
        selectedFurniture.indexOf(this.leadSelectedPieceOfFurniture) === -1
      ) {
        this.leadSelectedPieceOfFurniture = selectedFurniture[0]!;
      }
    });

    // Listener updating base plan lock when furniture movability changes
    const furnitureChangeListener: (evt: unknown) => void = (evt) => {
      const propertyName = (evt as { propertyName?: string }).propertyName;
      if (propertyName === HomePieceOfFurniture.Property.MOVABLE) {
        const piece = evt as unknown as { source?: unknown };
        const pieceObj = piece.source as HomePieceOfFurniture;
        if (this.home.isBasePlanLocked() && this.isPieceOfFurniturePartOfBasePlan(pieceObj)) {
          const selectedItems = this.home.getSelectedItems();
          if (selectedItems.includes(pieceObj)) {
            this.home.setSelectedItems(selectedItems.filter((item) => item !== pieceObj));
          }
        }
      }
    };
    for (const piece of this.home.getFurniture()) {
      piece.addPropertyChangeListener(furnitureChangeListener);
      if (piece instanceof HomeFurnitureGroup) {
        for (const childPiece of piece.getAllFurniture()) {
          childPiece.addPropertyChangeListener(furnitureChangeListener);
        }
      }
    }
    this.home.addFurnitureListener({
      collectionChanged: (event) => {
        const type = event.type as string;
        if (type === "ADD") {
          const piece = event.item;
          piece.addPropertyChangeListener(furnitureChangeListener);
          if (piece instanceof HomeFurnitureGroup) {
            for (const childPiece of piece.getAllFurniture()) {
              childPiece.addPropertyChangeListener(furnitureChangeListener);
            }
          }
        } else if (type === "DELETE") {
          const piece = event.item;
          piece.removePropertyChangeListener(furnitureChangeListener);
        }
      },
    });
  }

  /** Adds furniture to the home, selects it and posts an undoable edit. */
  addFurniture(furniture: HomePieceOfFurniture[]): void {
    this.addFurnitureAt(furniture, null, null, null);
  }

  addFurnitureBefore(furniture: HomePieceOfFurniture[], beforePiece: HomePieceOfFurniture): void {
    this.addFurnitureAt(furniture, null, null, beforePiece);
  }

  addFurnitureToGroup(furniture: HomePieceOfFurniture[], group: HomeFurnitureGroup): void {
    if (group === null) {
      throw new Error("Group shouldn't be null");
    }
    this.addFurnitureAt(furniture, null, group, null);
  }

  private addFurnitureAt(
    furniture: HomePieceOfFurniture[],
    furnitureLevels: (Level | null)[] | null,
    group: HomeFurnitureGroup | null,
    beforePiece: HomePieceOfFurniture | null,
  ): void {
    const oldBasePlanLocked = this.home.isBasePlanLocked();
    const allLevelsSelection = this.home.isAllLevelsSelection();
    const oldSelection = this.home.getSelectedItems();
    const newFurniture = [...furniture];
    const newFurnitureIndex: number[] = [];
    let insertIndex = group === null ? this.home.getFurniture().length : group.getFurniture().length;
    let resolvedGroup = group;
    if (beforePiece !== null) {
      const parentFurniture = this.home.getFurniture();
      resolvedGroup = getPieceOfFurnitureGroup(beforePiece, null, parentFurniture);
      const parent = resolvedGroup !== null ? resolvedGroup.getFurniture() : parentFurniture;
      insertIndex = parent.indexOf(beforePiece);
    }
    const newFurnitureGroups: (HomeFurnitureGroup | null)[] | null =
      resolvedGroup !== null ? new Array(furniture.length).fill(resolvedGroup) : null;
    let basePlanLocked = oldBasePlanLocked;
    let levelUpdated = resolvedGroup !== null || furnitureLevels === null;
    for (let i = 0; i < newFurniture.length; i++) {
      newFurnitureIndex.push(insertIndex++);
      basePlanLocked = basePlanLocked && !this.isPieceOfFurniturePartOfBasePlan(newFurniture[i]!);
      if (furnitureLevels !== null) {
        levelUpdated = levelUpdated || furnitureLevels[i] === null;
      }
    }
    const newFurnitureLevels = levelUpdated ? null : furnitureLevels;
    const newBasePlanLocked = basePlanLocked;
    const furnitureLevel =
      resolvedGroup !== null ? resolvedGroup.getLevel() : this.home.getSelectedLevel();

    doAddFurniture(this.home, newFurniture, newFurnitureGroups, newFurnitureIndex, furnitureLevel, newFurnitureLevels, newBasePlanLocked, false);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new FurnitureAdditionUndoableEdit(
          this.home, this.preferences, oldSelection, oldBasePlanLocked, allLevelsSelection,
          newFurniture, newFurnitureIndex, newFurnitureGroups, newFurnitureLevels, furnitureLevel, newBasePlanLocked,
        ),
      );
    }
  }

  /** Controls the deletion of the current selected furniture. */
  deleteSelection(): void {
    this.deleteFurniture(Home.getFurnitureSubList(this.home.getSelectedItems()));
  }

  /** Deletes the given furniture from home (grouping whole-group deletions). */
  deleteFurniture(deletedFurniture: HomePieceOfFurniture[]): void {
    const basePlanLocked = this.home.isBasePlanLocked();
    const allLevelsSelection = this.home.isAllLevelsSelection();
    const oldSelection = this.home.getSelectedItems();
    const homeFurniture = this.home.getFurniture();

    deletedFurniture = [...deletedFurniture];
    const homeGroups: HomeFurnitureGroup[] = [];
    searchGroups(homeFurniture, homeGroups);
    let updated: boolean;
    do {
      updated = false;
      for (const group of homeGroups) {
        const groupFurniture = group.getFurniture();
        if (groupFurniture.every((piece) => deletedFurniture.includes(piece))) {
          deletedFurniture = deletedFurniture.filter((piece) => !groupFurniture.includes(piece));
          deletedFurniture.push(group);
          updated = true;
        }
      }
    } while (updated);

    // Sort deletable furniture by index within home or group
    const deletedFurnitureMap = new Map<HomeFurnitureGroup | null, Map<number, HomePieceOfFurniture>>();
    let deletedFurnitureCount = 0;
    for (const piece of deletedFurniture) {
      if (this.isPieceOfFurnitureDeletable(piece)) {
        const group = getPieceOfFurnitureGroup(piece, null, homeFurniture);
        let sortedMap = deletedFurnitureMap.get(group);
        if (sortedMap === undefined) {
          sortedMap = new Map<number, HomePieceOfFurniture>();
          deletedFurnitureMap.set(group, sortedMap);
        }
        if (group === null) {
          sortedMap.set(homeFurniture.indexOf(piece), piece);
        } else {
          sortedMap.set(group.getFurniture().indexOf(piece), piece);
        }
        deletedFurnitureCount++;
      }
    }
    const furniture: HomePieceOfFurniture[] = [];
    const furnitureIndex: number[] = [];
    const furnitureLevels: (Level | null)[] = [];
    const furnitureGroups: (HomeFurnitureGroup | null)[] = [];
    for (const sortedMap of deletedFurnitureMap.values()) {
      for (const [index, piece] of [...sortedMap.entries()].sort((a, b) => a[0] - b[0])) {
        furniture.push(piece);
        furnitureIndex.push(index);
        furnitureLevels.push(piece.getLevel());
        furnitureGroups.push(sortedMap.get(index) !== undefined ? null : null);
      }
    }
    // Rebuild groups array aligned with furniture (sorted map keys are the groups)
    furnitureGroups.length = 0;
    for (const [group, sortedMap] of deletedFurnitureMap.entries()) {
      for (let i = 0; i < sortedMap.size; i++) {
        furnitureGroups.push(group);
      }
    }
    doDeleteFurniture(this.home, furniture, basePlanLocked, false);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new FurnitureDeletionUndoableEdit(
          this.home, this.preferences, oldSelection, basePlanLocked, allLevelsSelection,
          furniture, furnitureIndex, furnitureGroups, furnitureLevels,
        ),
      );
    }
  }

  /** Reorders the selected furniture before the given piece. */
  moveSelectedFurnitureBefore(beforePiece: HomePieceOfFurniture): void {
    const movedFurniture = Home.getFurnitureSubList(this.home.getSelectedItems());
    if (movedFurniture.length > 0) {
      const furnitureLevels = movedFurniture.map((piece) => piece.getLevel());
      this.undoSupport?.beginUpdate();
      this.deleteFurniture(movedFurniture);
      this.addFurnitureAt(movedFurniture, furnitureLevels, null, beforePiece);
      this.undoSupport?.postEdit(new LocalizedUndoableEdit(this.preferences, FurnitureController, "undoReorderName"));
      this.undoSupport?.endUpdate();
    }
  }

  /** Updates the selected furniture in home (selection-only variant). */
  setSelectedFurniture(selectedFurniture: HomePieceOfFurniture[]): void {
    this.setSelectedFurnitureEx(selectedFurniture, true);
  }

  setSelectedFurnitureEx(selectedFurniture: HomePieceOfFurniture[], resetSelection: boolean): void {
    let filtered = selectedFurniture;
    if (this.home.isBasePlanLocked()) {
      filtered = this.getFurnitureNotPartOfBasePlan(filtered);
    }
    if (resetSelection) {
      this.home.setSelectedItems(filtered);
      this.home.setAllLevelsSelection(false);
    } else {
      const selectedItems = [...this.home.getSelectedItems()];
      const remaining = [...filtered];
      for (let i = selectedItems.length - 1; i >= 0; i--) {
        const item = selectedItems[i]!;
        if (item instanceof HomePieceOfFurniture) {
          const index = remaining.indexOf(item);
          if (index >= 0) {
            remaining.splice(index, 1);
          } else {
            selectedItems.splice(i, 1);
          }
        }
      }
      this.home.setSelectedItems(selectedItems.concat(remaining));
    }
  }

  selectAll(): void {
    this.setSelectedFurniture(this.home.getFurniture());
  }

  protected isPieceOfFurniturePartOfBasePlan(piece: HomePieceOfFurniture): boolean {
    return !piece.isMovable() || piece.isDoorOrWindow();
  }

  protected isPieceOfFurnitureMovable(piece: HomePieceOfFurniture): boolean {
    return true;
  }

  protected isPieceOfFurnitureDeletable(piece: HomePieceOfFurniture): boolean {
    return true;
  }

  /** Creates a home piece of furniture from a catalog piece (without model preset deformations). */
  createHomePieceOfFurniture(piece: PieceOfFurniture): HomePieceOfFurniture {
    const properties = piece.getPropertyNames().filter(
      (property) => !property.startsWith("modelPresetTransformationsName_") && !property.startsWith("modelPresetTransformations_"),
    );
    if (piece instanceof HomeDoorOrWindow) {
      return new HomeDoorOrWindow(piece as unknown as DoorOrWindow, properties);
    } else if (piece instanceof HomeLight) {
      return new HomeLight(piece as unknown as Light, properties);
    } else if (piece instanceof HomeShelfUnit) {
      return new HomeShelfUnit(piece as unknown as ShelfUnit, properties);
    } else {
      return new HomePieceOfFurniture(piece as unknown as HomePieceOfFurniture, properties);
    }
  }

  private getFurnitureNotPartOfBasePlan(furniture: HomePieceOfFurniture[]): HomePieceOfFurniture[] {
    return furniture.filter((piece) => !this.isPieceOfFurniturePartOfBasePlan(piece));
  }

  toggleFurnitureSort(furniturePropertyName: string): void {
    if (furniturePropertyName === this.home.getFurnitureSortedPropertyName()) {
      this.home.setFurnitureSortedPropertyName(null);
    } else {
      this.home.setFurnitureSortedPropertyName(furniturePropertyName);
    }
  }

  toggleFurnitureSortOrder(): void {
    this.home.setFurnitureDescendingSorted(!this.home.isFurnitureDescendingSorted());
  }

  sortFurniture(furniturePropertyName: string): void {
    this.home.setFurnitureSortedPropertyName(furniturePropertyName);
  }

  setFurnitureVisiblePropertyNames(furnitureVisiblePropertyNames: string[]): void {
    this.home.setFurnitureVisiblePropertyNames(furnitureVisiblePropertyNames);
  }

  toggleFurnitureVisibleProperty(furniturePropertyName: string): void {
    const visibleProperties = this.home.getFurnitureVisiblePropertyNames();
    if (visibleProperties.includes(furniturePropertyName)) {
      this.home.setFurnitureVisiblePropertyNames(visibleProperties.filter((name) => name !== furniturePropertyName));
    } else {
      this.home.setFurnitureVisiblePropertyNames(visibleProperties.concat(furniturePropertyName));
    }
  }

  /** Displays the furniture modification dialog. */
  modifySelectedFurniture(): void {
    if (Home.getFurnitureSubList(this.home.getSelectedItems()).length > 0) {
      // HomeFurnitureController ported in task 4.4
      throw new Error("HomeFurnitureController not ported yet");
    }
  }

  toggleSelectedFurnitureVisibility(): void {
    if (Home.getFurnitureSubList(this.home.getSelectedItems()).length === 1) {
      throw new Error("HomeFurnitureController not ported yet");
    }
  }

  /** Groups the selected furniture as one piece. */
  groupSelectedFurniture(): void {
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length > 0) {
      const basePlanLocked = this.home.isBasePlanLocked();
      const allLevelsSelection = this.home.isAllLevelsSelection();
      const oldSelection = this.home.getSelectedItems();
      const homeFurniture = this.home.getFurniture();
      const groupedFurnitureMap = new Map<HomeFurnitureGroup | null, Map<number, HomePieceOfFurniture>>();
      let groupedFurnitureCount = 0;
      for (const piece of selectedFurniture) {
        const group = getPieceOfFurnitureGroup(piece, null, homeFurniture);
        let sortedMap = groupedFurnitureMap.get(group);
        if (sortedMap === undefined) {
          sortedMap = new Map<number, HomePieceOfFurniture>();
          groupedFurnitureMap.set(group, sortedMap);
        }
        if (group === null) {
          sortedMap.set(homeFurniture.indexOf(piece), piece);
        } else {
          sortedMap.set(group.getFurniture().indexOf(piece), piece);
        }
        groupedFurnitureCount++;
      }
      const groupedPieces: HomePieceOfFurniture[] = [];
      const groupedPiecesIndex: number[] = [];
      const groupedPiecesLevel: (Level | null)[] = [];
      const groupedPiecesElevation: number[] = [];
      const groupedPiecesVisible: boolean[] = [];
      const groupedPiecesGroups: (HomeFurnitureGroup | null)[] = [];
      let minLevel = this.home.getSelectedLevel();
      for (const [group, sortedMap] of groupedFurnitureMap.entries()) {
        for (const [index, piece] of [...sortedMap.entries()].sort((a, b) => a[0] - b[0])) {
          groupedPieces.push(piece);
          groupedPiecesIndex.push(index);
          groupedPiecesLevel.push(piece.getLevel());
          groupedPiecesElevation.push(piece.getElevation());
          groupedPiecesVisible.push(piece.isVisible());
          groupedPiecesGroups.push(group);
          const pieceLevel = piece.getLevel();
          if (pieceLevel !== null) {
            if (minLevel === null || pieceLevel.getElevation() < minLevel.getElevation()) {
              minLevel = pieceLevel;
            }
          }
        }
      }
      let newGroup: HomeFurnitureGroup;
      const leadIndex = groupedPieces.indexOf(this.leadSelectedPieceOfFurniture!);
      if (leadIndex > 0) {
        newGroup = this.createHomeFurnitureGroup(groupedPieces, this.leadSelectedPieceOfFurniture!);
      } else {
        newGroup = this.createHomeFurnitureGroup(groupedPieces);
      }
      const groupPiecesNewElevation = groupedPieces.map((piece) => piece.getElevation());
      const homeSortedMap = groupedFurnitureMap.get(null);
      const groupIndex = homeSortedMap !== undefined ? [...homeSortedMap.keys()].pop()! + 1 - groupedPieces.length : homeFurniture.length;
      const movable = newGroup.isMovable();
      const groupLevel = minLevel;

      doGroupFurniture(this.home, groupedPieces, [newGroup], null, [groupIndex], [groupLevel], basePlanLocked, false);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new FurnitureGroupingUndoableEdit(
            this.home, this.preferences, oldSelection, basePlanLocked, allLevelsSelection,
            groupedPieces, groupedPiecesIndex, groupedPiecesGroups, groupedPiecesLevel, groupedPiecesElevation, groupedPiecesVisible,
            newGroup, groupIndex, groupLevel, groupPiecesNewElevation, movable,
          ),
        );
      }
    }
  }

  protected createHomeFurnitureGroup(furniture: HomePieceOfFurniture[]): HomeFurnitureGroup;
  protected createHomeFurnitureGroup(furniture: HomePieceOfFurniture[], leadingPiece: HomePieceOfFurniture): HomeFurnitureGroup;
  protected createHomeFurnitureGroup(furniture: HomePieceOfFurniture[], leadingPiece?: HomePieceOfFurniture): HomeFurnitureGroup {
    const lead = leadingPiece ?? furniture[0]!;
    const furnitureGroupName = this.preferences.getLocalizedString(FurnitureController, "groupName", getFurnitureGroupCount(this.home.getFurniture()) + 1);
    return new HomeFurnitureGroup(furniture, lead, furnitureGroupName);
  }

  /** Ungroups the selected groups of furniture. */
  ungroupSelectedFurniture(): void {
    const movableSelectedFurnitureGroups: HomeFurnitureGroup[] = [];
    for (const item of this.home.getSelectedItems()) {
      if (item instanceof HomeFurnitureGroup && this.isPieceOfFurnitureMovable(item)) {
        movableSelectedFurnitureGroups.push(item);
      }
    }
    if (movableSelectedFurnitureGroups.length > 0) {
      const homeFurniture = this.home.getFurniture();
      const oldBasePlanLocked = this.home.isBasePlanLocked();
      const allLevelsSelection = this.home.isAllLevelsSelection();
      const oldSelection = this.home.getSelectedItems();
      const groupsMap = new Map<HomeFurnitureGroup | null, Map<number, HomeFurnitureGroup>>();
      let groupsCount = 0;
      for (const piece of movableSelectedFurnitureGroups) {
        const groupGroup = getPieceOfFurnitureGroup(piece, null, homeFurniture);
        let sortedMap = groupsMap.get(groupGroup);
        if (sortedMap === undefined) {
          sortedMap = new Map<number, HomeFurnitureGroup>();
          groupsMap.set(groupGroup, sortedMap);
        }
        if (groupGroup === null) {
          sortedMap.set(homeFurniture.indexOf(piece), piece);
        } else {
          sortedMap.set(groupGroup.getFurniture().indexOf(piece), piece);
        }
        groupsCount++;
      }
      const groups: HomeFurnitureGroup[] = [];
      const groupsGroups: (HomeFurnitureGroup | null)[] = [];
      const groupsIndex: number[] = [];
      const groupsLevels: (Level | null)[] = [];
      const ungroupedPiecesList: HomePieceOfFurniture[] = [];
      const ungroupedPiecesIndexList: number[] = [];
      const ungroupedPiecesGroupsList: (HomeFurnitureGroup | null)[] = [];
      for (const [groupGroup, sortedMap] of groupsMap.entries()) {
        const sortedEntries = [...sortedMap.entries()].sort((a, b) => a[0] - b[0]);
        let endIndex = sortedEntries[sortedEntries.length - 1]![0] + 1 - sortedEntries.length;
        for (const [index, group] of sortedEntries) {
          groups.push(group);
          groupsGroups.push(groupGroup);
          groupsIndex.push(index);
          groupsLevels.push(group.getLevel());
          for (const groupPiece of group.getFurniture()) {
            ungroupedPiecesList.push(groupPiece);
            ungroupedPiecesGroupsList.push(groupGroup);
            ungroupedPiecesIndexList.push(endIndex++);
          }
        }
      }
      const ungroupedPieces = ungroupedPiecesList;
      const ungroupedPiecesGroups = ungroupedPiecesGroupsList;
      const ungroupedPiecesIndex = ungroupedPiecesIndexList;
      const ungroupedPiecesLevels: (Level | null)[] = [];
      let basePlanLocked = oldBasePlanLocked;
      for (let i = 0; i < ungroupedPieces.length; i++) {
        ungroupedPiecesLevels.push(ungroupedPieces[i]!.getLevel());
        basePlanLocked = basePlanLocked && !this.isPieceOfFurniturePartOfBasePlan(ungroupedPieces[i]!);
      }
      const newBasePlanLocked = basePlanLocked;

      doUngroupFurniture(this.home, groups, ungroupedPieces, ungroupedPiecesGroups, ungroupedPiecesIndex, ungroupedPiecesLevels, newBasePlanLocked, false);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new FurnitureUngroupingUndoableEdit(
            this.home, this.preferences, oldSelection, oldBasePlanLocked, allLevelsSelection,
            groups, groupsIndex, groupsGroups, groupsLevels, ungroupedPieces, ungroupedPiecesIndex,
            ungroupedPiecesGroups, ungroupedPiecesLevels, newBasePlanLocked,
          ),
        );
      }
    }
  }

  /** Displays the wizard that helps to import furniture to home. */
  importFurniture(modelName: string | null = null): void {
    // ImportedFurnitureWizardController ported in task 4.5
    throw new Error("ImportedFurnitureWizardController not ported yet");
  }

  private getMovableSelectedFurniture(): HomePieceOfFurniture[] {
    const movableSelectedFurniture: HomePieceOfFurniture[] = [];
    for (const item of this.home.getSelectedItems()) {
      if (item instanceof HomePieceOfFurniture && this.isPieceOfFurnitureMovable(item)) {
        movableSelectedFurniture.push(item);
      }
    }
    return movableSelectedFurniture;
  }

  private alignSelectedFurniture(alignmentEdit: FurnitureAlignmentUndoableEdit): void {
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      this.home.setSelectedItems(selectedFurniture);
      alignmentEdit.alignFurniture();
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(alignmentEdit);
      }
    }
  }

  alignSelectedFurnitureOnTop(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnTopEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnBottom(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnBottomEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnLeft(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnLeftEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnRight(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnRightEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnFrontSide(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnFrontSideEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnBackSide(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnBackSideEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnLeftSide(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnLeftSideEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureOnRightSide(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignOnRightSideEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  alignSelectedFurnitureSideBySide(): void {
    const oldSelection = this.home.getSelectedItems();
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 2) {
      const leadPiece = selectedFurniture[0]!;
      this.alignSelectedFurniture(
        new AlignSideBySideEdit(this.home, this.preferences, oldSelection, selectedFurniture, leadPiece),
      );
    }
  }

  distributeSelectedFurnitureHorizontally(): void {
    this.distributeSelectedFurniture(true);
  }

  distributeSelectedFurnitureVertically(): void {
    this.distributeSelectedFurniture(false);
  }

  distributeSelectedFurniture(horizontal: boolean): void {
    const alignedFurniture = this.getMovableSelectedFurniture();
    if (alignedFurniture.length >= 3) {
      const oldSelection = this.home.getSelectedItems();
      const oldX = alignedFurniture.map((piece) => piece.getX());
      const oldY = alignedFurniture.map((piece) => piece.getY());
      this.home.setSelectedItems(alignedFurniture);
      doDistributeFurnitureAlongAxis(alignedFurniture, horizontal);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new FurnitureDistributionUndoableEdit(this.home, this.preferences, oldSelection, oldX, oldY, alignedFurniture, horizontal),
        );
      }
    }
  }

  resetFurnitureElevation(): void {
    const selectedFurniture = this.getMovableSelectedFurniture();
    if (selectedFurniture.length >= 1) {
      const oldSelection = this.home.getSelectedItems();
      const furnitureOldElevation: number[] = [];
      const furnitureNewElevation: number[] = [];
      for (const piece of selectedFurniture) {
        furnitureOldElevation.push(piece.getElevation());
        const highestSurroundingPiece = this.getHighestSurroundingPieceOfFurnitureEx(piece, selectedFurniture);
        if (highestSurroundingPiece !== null) {
          let elevation = highestSurroundingPiece.getElevation();
          if (highestSurroundingPiece.isHorizontallyRotated()) {
            elevation += highestSurroundingPiece.getHeightInPlan();
          } else {
            elevation += highestSurroundingPiece.getHeight() * (highestSurroundingPiece.getDropOnTopElevation() ?? 0);
          }
          if (highestSurroundingPiece.getLevel() !== null && piece.getLevel() !== null) {
            elevation += highestSurroundingPiece.getLevel()!.getElevation() - piece.getLevel()!.getElevation();
          }
          furnitureNewElevation.push(Math.max(0, elevation));
        } else {
          furnitureNewElevation.push(0);
        }
      }
      this.home.setSelectedItems(selectedFurniture);
      doSetFurnitureElevation(selectedFurniture, furnitureNewElevation);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new FurnitureElevationResetUndoableEdit(this.home, this.preferences, oldSelection, furnitureOldElevation, selectedFurniture, furnitureNewElevation),
        );
      }
    }
  }

  protected getHighestSurroundingPieceOfFurniture(piece: HomePieceOfFurniture): HomePieceOfFurniture | null {
    return this.getHighestSurroundingPieceOfFurnitureEx(piece, []);
  }

  private getHighestSurroundingPieceOfFurnitureEx(piece: HomePieceOfFurniture, ignoredFurniture: HomePieceOfFurniture[]): HomePieceOfFurniture | null {
    let highestSurroundingPiece: HomePieceOfFurniture | null = null;
    let highestElevation = Number.MIN_VALUE;
    for (const surroundingPiece of this.getSurroundingFurniture(piece)) {
      if (!ignoredFurniture.includes(surroundingPiece)) {
        let elevation = surroundingPiece.getElevation();
        if (surroundingPiece.isHorizontallyRotated()) {
          elevation += surroundingPiece.getHeightInPlan();
        } else {
          elevation += surroundingPiece.getHeight() * (surroundingPiece.getDropOnTopElevation() ?? 0);
        }
        if (elevation > highestElevation) {
          highestElevation = elevation;
          highestSurroundingPiece = surroundingPiece;
        }
      }
    }
    return highestSurroundingPiece;
  }

  protected getSurroundingFurniture(piece: HomePieceOfFurniture): HomePieceOfFurniture[] {
    return this.getSurroundingFurnitureEx(piece, [], 0.2, true);
  }

  private getSurroundingFurnitureEx(
    piece: HomePieceOfFurniture,
    ignoredFurniture: HomePieceOfFurniture[],
    marginError: number,
    includeShelfUnits: boolean,
  ): HomePieceOfFurniture[] {
    const piecePoints = piece.getPoints();
    const margin = Math.min(piece.getWidthInPlan(), piece.getDepthInPlan()) * marginError;
    const surroundingFurniture: HomePieceOfFurniture[] = [];
    for (const homePiece of this.getFurnitureInSameGroup(piece)) {
      if (
        homePiece !== piece
        && !ignoredFurniture.includes(homePiece)
        && this.isPieceOfFurnitureVisibleAtSelectedLevel(homePiece)
        && ((homePiece.getDropOnTopElevation() ?? -1) >= 0 || (includeShelfUnits && homePiece.constructor.name === "HomeShelfUnit"))
      ) {
        let surroundingPieceContainsPiece = true;
        for (const point of piecePoints) {
          if (!homePiece.containsPoint(point[0]!, point[1]!, margin)) {
            surroundingPieceContainsPiece = false;
            break;
          }
        }
        if (surroundingPieceContainsPiece) {
          surroundingFurniture.push(homePiece);
        }
      }
    }
    return surroundingFurniture;
  }

  /** Returns the furniture of the same group as the piece, or home furniture if it belongs to none. */
  protected getFurnitureInSameGroup(piece: HomePieceOfFurniture): HomePieceOfFurniture[] {
    const homeFurniture = this.home.getFurniture();
    const furnitureInSameGroup = getFurnitureInSameGroup(piece, homeFurniture);
    return furnitureInSameGroup !== null ? furnitureInSameGroup : homeFurniture;
  }

  protected isPieceOfFurnitureVisibleAtSelectedLevel(piece: HomePieceOfFurniture): boolean {
    const selectedLevel = this.home.getSelectedLevel();
    return piece.isVisible()
      && (piece.getLevel() === null || piece.getLevel()!.isViewable())
      && (piece.getLevel() === selectedLevel || (selectedLevel !== null && piece.isAtLevel(selectedLevel)));
  }

  setVisualProperty(propertyName: string, propertyValue: unknown): void {
    // Overridden by subclasses for view-specific properties
  }

  setHomeProperty(propertyName: string, propertyValue: unknown): void {
    // Overridden by subclasses for home-level properties
  }
}

// ---------------------------------------------------------------------------
// Undoable edits (inner classes in Java)

class FurnitureAdditionUndoableEdit extends LocalizedUndoableEdit {
  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    private readonly oldBasePlanLocked: boolean,
    private readonly allLevelsSelection: boolean,
    private readonly newFurniture: HomePieceOfFurniture[],
    private readonly newFurnitureIndex: number[],
    private readonly newFurnitureGroups: (HomeFurnitureGroup | null)[] | null,
    private readonly newFurnitureLevels: (Level | null)[] | null,
    private readonly furnitureLevel: Level | null,
    private readonly newBasePlanLocked: boolean,
  ) {
    super(preferences, FurnitureController, "undoAddFurnitureName");
  }

  override undo(): void {
    super.undo();
    doDeleteFurniture(this.home, this.newFurniture, this.oldBasePlanLocked, this.allLevelsSelection);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    doAddFurniture(this.home, this.newFurniture, this.newFurnitureGroups, this.newFurnitureIndex, this.furnitureLevel, this.newFurnitureLevels, this.newBasePlanLocked, false);
  }
}

class FurnitureDeletionUndoableEdit extends LocalizedUndoableEdit {
  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    private readonly basePlanLocked: boolean,
    private readonly allLevelsSelection: boolean,
    private readonly furniture: HomePieceOfFurniture[],
    private readonly furnitureIndex: number[],
    private readonly furnitureGroups: (HomeFurnitureGroup | null)[],
    private readonly furnitureLevels: (Level | null)[],
  ) {
    super(preferences, FurnitureController, "undoDeleteSelectionName");
  }

  override undo(): void {
    super.undo();
    doAddFurniture(this.home, this.furniture, this.furnitureGroups, this.furnitureIndex, null, this.furnitureLevels, this.basePlanLocked, this.allLevelsSelection);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    this.home.setSelectedItems(this.furniture);
    doDeleteFurniture(this.home, this.furniture, this.basePlanLocked, false);
  }
}

class FurnitureGroupingUndoableEdit extends LocalizedUndoableEdit {
  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    private readonly basePlanLocked: boolean,
    private readonly allLevelsSelection: boolean,
    private readonly groupedPieces: HomePieceOfFurniture[],
    private readonly groupedPiecesIndex: number[],
    private readonly groupedPiecesGroups: (HomeFurnitureGroup | null)[],
    private readonly groupedPiecesLevel: (Level | null)[],
    private readonly groupedPiecesElevation: number[],
    private readonly groupedPiecesVisible: boolean[],
    private readonly newGroup: HomeFurnitureGroup,
    private readonly groupIndex: number,
    private readonly groupLevel: Level | null,
    private readonly groupPiecesNewElevation: number[],
    private readonly movable: boolean,
  ) {
    super(preferences, FurnitureController, "undoGroupName");
  }

  override undo(): void {
    super.undo();
    doUngroupFurniture(this.home, [this.newGroup], this.groupedPieces, this.groupedPiecesGroups, this.groupedPiecesIndex, this.groupedPiecesLevel, this.basePlanLocked, this.allLevelsSelection);
    for (let i = 0; i < this.groupedPieces.length; i++) {
      this.groupedPieces[i]!.setElevation(this.groupedPiecesElevation[i]!);
      this.groupedPieces[i]!.setVisible(this.groupedPiecesVisible[i]!);
    }
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    for (let i = 0; i < this.groupedPieces.length; i++) {
      this.groupedPieces[i]!.setElevation(this.groupPiecesNewElevation[i]!);
      this.groupedPieces[i]!.setLevel(null);
    }
    this.newGroup.setMovable(this.movable);
    this.newGroup.setVisible(true);
    doGroupFurniture(this.home, this.groupedPieces, [this.newGroup], null, [this.groupIndex], [this.groupLevel], this.basePlanLocked, false);
  }
}

class FurnitureUngroupingUndoableEdit extends LocalizedUndoableEdit {
  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    private readonly oldBasePlanLocked: boolean,
    private readonly allLevelsSelection: boolean,
    private readonly groups: HomeFurnitureGroup[],
    private readonly groupsIndex: number[],
    private readonly groupsGroups: (HomeFurnitureGroup | null)[],
    private readonly groupsLevels: (Level | null)[],
    private readonly ungroupedPieces: HomePieceOfFurniture[],
    private readonly ungroupedPiecesIndex: number[],
    private readonly ungroupedPiecesGroups: (HomeFurnitureGroup | null)[],
    private readonly ungroupedPiecesLevels: (Level | null)[],
    private readonly newBasePlanLocked: boolean,
  ) {
    super(preferences, FurnitureController, "undoUngroupName");
  }

  override undo(): void {
    super.undo();
    doGroupFurniture(this.home, this.ungroupedPieces, this.groups, this.groupsGroups, this.groupsIndex, this.groupsLevels, this.oldBasePlanLocked, this.allLevelsSelection);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    doUngroupFurniture(this.home, this.groups, this.ungroupedPieces, this.ungroupedPiecesGroups, this.ungroupedPiecesIndex, this.ungroupedPiecesLevels, this.newBasePlanLocked, false);
  }
}

abstract class FurnitureAlignmentUndoableEdit extends LocalizedUndoableEdit {
  protected readonly home: Home;
  private readonly oldSelection: Selectable[];
  private readonly selectedFurniture: HomePieceOfFurniture[];
  private readonly alignedFurniture: HomePieceOfFurniture[];
  private readonly oldX: number[];
  private readonly oldY: number[];

  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(preferences, FurnitureController, "undoAlignName");
    this.home = home;
    this.oldSelection = oldSelection;
    this.selectedFurniture = selectedFurniture;
    this.alignedFurniture = leadPiece === null ? selectedFurniture : selectedFurniture.filter((piece) => piece !== leadPiece);
    this.oldX = this.alignedFurniture.map((piece) => piece.getX());
    this.oldY = this.alignedFurniture.map((piece) => piece.getY());
  }

  override undo(): void {
    super.undo();
    undoAlignFurniture(this.alignedFurniture, this.oldX, this.oldY);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    this.home.setSelectedItems(this.selectedFurniture);
    this.alignFurniture();
  }

  alignFurniture(): void {
    this.alignFurnitureList(this.alignedFurniture, this.selectedFurniture[0]!);
  }

  abstract alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void;
}

class AlignOnTopEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setY(leadPiece!.getY());
    }
  }
}

class AlignOnBottomEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setY(leadPiece!.getY() - (piece.getDepth() - leadPiece!.getDepth()));
    }
  }
}

class AlignOnLeftEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setX(leadPiece!.getX());
    }
  }
}

class AlignOnRightEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setX(leadPiece!.getX() - (piece.getWidth() - leadPiece!.getWidth()));
    }
  }
}

class AlignOnFrontSideEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setElevation(leadPiece!.getElevation() + leadPiece!.getHeight() - piece.getHeight());
    }
  }
}

class AlignOnBackSideEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setElevation(leadPiece!.getElevation());
    }
  }
}

class AlignOnLeftSideEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setX(leadPiece!.getX() - piece.getWidth());
    }
  }
}

class AlignOnRightSideEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setX(leadPiece!.getX() + leadPiece!.getWidth());
    }
  }
}

class AlignSideBySideEdit extends FurnitureAlignmentUndoableEdit {
  constructor(home: Home, preferences: UserPreferences, oldSelection: Selectable[], selectedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null) {
    super(home, preferences, oldSelection, selectedFurniture, leadPiece);
  }

  override alignFurnitureList(alignedFurniture: HomePieceOfFurniture[], leadPiece: HomePieceOfFurniture | null): void {
    for (const piece of alignedFurniture) {
      piece.setX(leadPiece!.getX() + leadPiece!.getWidth());
    }
  }
}

class FurnitureDistributionUndoableEdit extends LocalizedUndoableEdit {
  private oldX: number[];
  private oldY: number[];

  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    oldX: number[],
    oldY: number[],
    private readonly alignedFurniture: HomePieceOfFurniture[],
    private readonly horizontal: boolean,
  ) {
    super(preferences, FurnitureController, "undoDistributeName");
    this.oldX = oldX;
    this.oldY = oldY;
  }

  override undo(): void {
    super.undo();
    undoAlignFurniture(this.alignedFurniture, this.oldX, this.oldY);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    this.home.setSelectedItems(this.alignedFurniture);
    doDistributeFurnitureAlongAxis(this.alignedFurniture, this.horizontal);
  }
}

class FurnitureElevationResetUndoableEdit extends LocalizedUndoableEdit {
  constructor(
    private readonly home: Home,
    preferences: UserPreferences,
    private readonly oldSelection: Selectable[],
    private readonly furnitureOldElevation: number[],
    private readonly selectedFurniture: HomePieceOfFurniture[],
    private readonly furnitureNewElevation: number[],
  ) {
    super(preferences, FurnitureController, "undoResetElevation");
  }

  override undo(): void {
    super.undo();
    doSetFurnitureElevation(this.selectedFurniture, this.furnitureOldElevation);
    this.home.setSelectedItems(this.oldSelection);
  }

  override redo(): void {
    super.redo();
    this.home.setSelectedItems(this.selectedFurniture);
    doSetFurnitureElevation(this.selectedFurniture, this.furnitureNewElevation);
  }
}

// ---------------------------------------------------------------------------
// Static helpers

function doAddFurniture(
  home: Home,
  furniture: HomePieceOfFurniture[],
  furnitureGroups: (HomeFurnitureGroup | null)[] | null,
  furnitureIndex: number[],
  furnitureLevel: Level | null,
  furnitureLevels: (Level | null)[] | null,
  basePlanLocked: boolean,
  allLevelsSelection: boolean,
): void {
  for (let i = 0; i < furnitureIndex.length; i++) {
    if (furnitureGroups !== null && furnitureGroups[i] !== null) {
      home.addPieceOfFurnitureToGroup(furniture[i]!, furnitureGroups[i]!, furnitureIndex[i]!);
      furniture[i]!.setVisible(furnitureGroups[i]!.isVisible());
    } else {
      home.addPieceOfFurnitureAt(furniture[i]!, furnitureIndex[i]!);
    }
    furniture[i]!.setLevel(furnitureLevels !== null ? (furnitureLevels[i] ?? null) : furnitureLevel);
  }
  home.setBasePlanLocked(basePlanLocked);
  home.setSelectedItems(furniture);
  home.setAllLevelsSelection(allLevelsSelection);
}

function doDeleteFurniture(home: Home, furniture: HomePieceOfFurniture[], basePlanLocked: boolean, allLevelsSelection: boolean): void {
  for (const piece of furniture) {
    home.deletePieceOfFurniture(piece);
  }
  home.setBasePlanLocked(basePlanLocked);
  home.setAllLevelsSelection(allLevelsSelection);
}

function doGroupFurniture(
  home: Home,
  groupedPieces: HomePieceOfFurniture[],
  groups: HomeFurnitureGroup[],
  groupsGroups: (HomeFurnitureGroup | null)[] | null,
  groupsIndex: number[],
  groupsLevels: (Level | null)[],
  basePlanLocked: boolean,
  allLevelsSelection: boolean,
): void {
  doDeleteFurniture(home, groupedPieces, basePlanLocked, allLevelsSelection);
  doAddFurniture(home, groups, groupsGroups, groupsIndex, null, groupsLevels, basePlanLocked, allLevelsSelection);
}

function doUngroupFurniture(
  home: Home,
  groups: HomeFurnitureGroup[],
  ungroupedPieces: HomePieceOfFurniture[],
  ungroupedPiecesGroups: (HomeFurnitureGroup | null)[],
  ungroupedPiecesIndex: number[],
  ungroupedPiecesLevels: (Level | null)[],
  basePlanLocked: boolean,
  allLevelsSelection: boolean,
): void {
  doDeleteFurniture(home, groups, basePlanLocked, allLevelsSelection);
  doAddFurniture(home, ungroupedPieces, ungroupedPiecesGroups, ungroupedPiecesIndex, null, ungroupedPiecesLevels, basePlanLocked, allLevelsSelection);
}

function searchGroups(furniture: HomePieceOfFurniture[], groups: HomeFurnitureGroup[]): void {
  for (const piece of furniture) {
    if (piece instanceof HomeFurnitureGroup) {
      groups.push(piece);
      searchGroups(piece.getFurniture(), groups);
    }
  }
}

function getPieceOfFurnitureGroup(
  piece: HomePieceOfFurniture,
  furnitureGroup: HomeFurnitureGroup | null,
  furniture: HomePieceOfFurniture[],
): HomeFurnitureGroup | null {
  for (const homePiece of furniture) {
    if (homePiece === piece) {
      return furnitureGroup;
    } else if (homePiece instanceof HomeFurnitureGroup) {
      const group = getPieceOfFurnitureGroup(piece, homePiece, homePiece.getFurniture());
      if (group !== null) {
        return group;
      }
    }
  }
  return null;
}

function getFurnitureInSameGroup(piece: HomePieceOfFurniture, furniture: HomePieceOfFurniture[]): HomePieceOfFurniture[] | null {
  for (const piece2 of furniture) {
    if (piece2 === piece) {
      return furniture;
    } else if (piece2 instanceof HomeFurnitureGroup) {
      const siblingFurniture = getFurnitureInSameGroup(piece, piece2.getFurniture());
      if (siblingFurniture !== null) {
        return siblingFurniture;
      }
    }
  }
  return null;
}

function getFurnitureGroupCount(furniture: HomePieceOfFurniture[]): number {
  let count = 0;
  for (const piece of furniture) {
    if (piece instanceof HomeFurnitureGroup) {
      count += 1 + getFurnitureGroupCount(piece.getFurniture());
    }
  }
  return count;
}

function undoAlignFurniture(alignedFurniture: HomePieceOfFurniture[], oldX: number[], oldY: number[]): void {
  for (let i = 0; i < alignedFurniture.length; i++) {
    alignedFurniture[i]!.setX(oldX[i]!);
    alignedFurniture[i]!.setY(oldY[i]!);
  }
}

function doDistributeFurnitureAlongAxis(furniture: HomePieceOfFurniture[], horizontal: boolean): void {
  // Java: sort by signed distance to the orthogonal axis (a vertical line for
  // horizontal distribution), then place the middle pieces at equal gaps.
  const axisPosition = (piece: HomePieceOfFurniture) => (horizontal ? piece.getX() : piece.getY());
  const sortedFurniture = [...furniture].sort((p1, p2) => axisPosition(p1) - axisPosition(p2));
  const axisAngle = horizontal ? 0 : Math.PI / 2;
  const pieceWidthAlongAxis = (piece: HomePieceOfFurniture) =>
    Math.abs(piece.getWidthInPlan() * Math.cos(axisAngle + piece.getAngle()))
    + Math.abs(piece.getDepthInPlan() * Math.sin(axisAngle + piece.getAngle()));
  const firstPiece = sortedFurniture[0]!;
  const lastPiece = sortedFurniture[sortedFurniture.length - 1]!;
  const firstHalfWidth = pieceWidthAlongAxis(firstPiece) / 2;
  const lastHalfWidth = pieceWidthAlongAxis(lastPiece) / 2;
  let gap = Math.abs(axisPosition(lastPiece) - axisPosition(firstPiece)) - lastHalfWidth - firstHalfWidth;
  const furnitureWidthsAlongAxis: number[] = [];
  for (let i = 1; i < sortedFurniture.length - 1; i++) {
    const width = pieceWidthAlongAxis(sortedFurniture[i]!);
    furnitureWidthsAlongAxis.push(width);
    gap -= width;
  }
  gap /= sortedFurniture.length - 1;
  let xOrY = axisPosition(firstPiece) + firstHalfWidth + gap;
  for (let i = 1; i < sortedFurniture.length - 1; i++) {
    const piece = sortedFurniture[i]!;
    if (horizontal) {
      piece.setX(xOrY + furnitureWidthsAlongAxis[i - 1]! / 2);
    } else {
      piece.setY(xOrY + furnitureWidthsAlongAxis[i - 1]! / 2);
    }
    xOrY += gap + furnitureWidthsAlongAxis[i - 1]!;
  }
}

function doSetFurnitureElevation(selectedFurniture: HomePieceOfFurniture[], furnitureNewElevation: number[]): void {
  for (let i = 0; i < selectedFurniture.length; i++) {
    selectedFurniture[i]!.setElevation(furnitureNewElevation[i]!);
  }
}

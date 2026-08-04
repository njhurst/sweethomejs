/*
 * HomePane.tsx
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
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
 */

/**
 * HomePane (task 7.1): the main layout — toolbar, plan view, 3D view
 * (tabbed/dockable), status bar. Wires the HomeController + sub-controllers
 * to the PlanCanvas and View3DCanvas.
 */
import { useEffect, useState } from "react";
import type { Home, UserPreferences, HomeController } from "@sweethomejs/core";
import { PlanCanvas } from "./plan/PlanCanvas.js";
import { FurnitureCatalogPanel } from "./catalog/FurnitureCatalogPanel.js";
import { buildBuiltinFurnitureCatalog } from "./catalog/BuiltinFurnitureCatalog.js";
import { FurnitureCatalogController, WallController, RoomController, HomePieceOfFurniture, Wall as WallModel, Room as RoomModel } from "@sweethomejs/core";
import { View3DCanvas } from "./view3d/View3DCanvas.js";
import { HelpPane } from "./help/HelpPane.js";
import { PrintPreviewView } from "./print/PrintPreviewView.js";
import { formatLengthValue } from "./units.js";
import { FurniturePropertiesPanel } from "./properties/FurniturePropertiesPanel.js";
import { WallDialog, RoomDialog } from "./properties/ControllerDialogs.js";
import { PreferencesView } from "./properties/PreferencesView.js";
import { exportPlanToPdf, exportFurnitureCsv } from "@sweethomejs/export";

export type View3DPosition = "tab" | "split" | "hidden";

export interface HomePaneProps {
  home: Home;
  preferences: UserPreferences;
  homeController: HomeController;
  /** Where the 3D view sits (default "split"). */
  view3DPosition?: View3DPosition;
  /** Opens a home from a file picker (replaces the session). */
  onOpenHome?: (() => void | Promise<void>) | null;
  /** Saves the home to a file. */
  onSaveHome?: (() => void | Promise<void>) | null;
}

export function HomePane(props: HomePaneProps): React.JSX.Element {
  const { home, preferences, homeController } = props;
  const [view3DPosition, setView3DPosition] = useState<View3DPosition>(props.view3DPosition ?? "split");
  const [selectedCount, setSelectedCount] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [catalogController] = useState(() => new FurnitureCatalogController(
    buildBuiltinFurnitureCatalog(),
    preferences,
    {} as never,
    null,
  ));
  const [helpOpen, setHelpOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [modifyDialog, setModifyDialog] = useState<"furniture" | "wall" | "room" | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [wallController, setWallController] = useState<WallController | null>(null);
  const [roomController, setRoomController] = useState<RoomController | null>(null);
  const [undoEnabled, setUndoEnabled] = useState(homeController.isUndoEnabled());
  const [redoEnabled, setRedoEnabled] = useState(homeController.isRedoEnabled());
  const [mode, setMode] = useState<string>(props.homeController.getPlanController().getMode().toString());

  useEffect(() => {
    // Dev-mode event log hook (exposed by the web app; no-op when absent)
    const dev = (globalThis as unknown as { __devEvent?: (type: string, fields?: Record<string, unknown>) => void }).__devEvent;
    const emit = (type: string, fields: Record<string, unknown> = {}): void => {
      dev?.(type, fields);
    };
    // Keyboard shortcuts (Ctrl/⌘ + Z/Y undo/redo, Delete, Ctrl+O/S/P, +/- zoom)
    const onKeyDown = (event: KeyboardEvent): void => {
      const planController = homeController.getPlanController();
      const target = event.target as HTMLElement | null;
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) {
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) homeController.redo();
        else homeController.undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        homeController.redo();
      } else if (mod && event.key.toLowerCase() === "o") {
        event.preventDefault();
        void (props.onOpenHome?.() ?? homeController.open());
      } else if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void (props.onSaveHome?.() ?? homeController.save());
      } else if (mod && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setPrintOpen(true);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        planController.deleteSelection();
      } else if (event.key === "+" || event.key === "=") {
        planController.zoom(1.25);
      } else if (event.key === "-") {
        planController.zoom(0.8);
      } else if (event.key === "Escape") {
        planController.setMode(PlanMode.SELECTION);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const syncUndoState = (): void => {
      setUndoEnabled(homeController.isUndoEnabled());
      setRedoEnabled(homeController.isRedoEnabled());
      emit("state.set", { path: "undo", undoEnabled: homeController.isUndoEnabled(), redoEnabled: homeController.isRedoEnabled() });
    };
    homeController.addUndoStateListener(syncUndoState);
    const syncSelection = (): void => setSelectedCount(home.getSelectedItems().length);
    home.addSelectionListener(syncSelection);
    const furnitureListener = {
      collectionChanged: (): void => {
        syncSelection();
        emit("state.set", { path: "home.furniture", count: home.getFurniture().length });
      },
    };
    home.addFurnitureListener(furnitureListener);
    const wallsListener = {
      collectionChanged: (): void => emit("state.set", { path: "home.walls", count: home.getWalls().length }),
    };
    home.addWallsListener(wallsListener);
    const planController = homeController.getPlanController();
    planController.setModifyItemCallback(() => {
      const selected = home.getSelectedItems();
      if (selected.length !== 1) {
        return;
      }
      const item = selected[0]!;
      if (item instanceof HomePieceOfFurniture) {
        setModifyDialog("furniture");
      } else if (item instanceof WallModel) {
        setWallController(new WallController(home, preferences, {} as never, null));
        setModifyDialog("wall");
      } else if (item instanceof RoomModel) {
        setRoomController(new RoomController(home, preferences, {} as never, null));
        setModifyDialog("room");
      }
    });
    const modeListener = {
      propertyChange: (evt: { newValue?: unknown }): void => {
        const next = evt.newValue?.toString() ?? planController.getMode().toString();
        setMode(next);
        emit("state.set", { path: "plan.mode", value: next });
      },
    };
    planController.addPropertyChangeListener(PlanController.Property.MODE, modeListener);
    return () => {
      home.removeFurnitureListener(furnitureListener);
      home.removeWallsListener(wallsListener);
      home.removeSelectionListener(syncSelection);
      planController.removePropertyChangeListener(PlanController.Property.MODE, modeListener);
      window.removeEventListener("keydown", onKeyDown);
      homeController.removeUndoStateListener(syncUndoState);
    };
  }, [home, homeController]);

  const planController = homeController.getPlanController();
  const homeController3D = homeController.getHomeController3D();

  return (
    <div className="sh-home">
      <MenuBar
        home={home}
        homeController={homeController}
        preferences={preferences}
        view3DPosition={view3DPosition}
        onView3DPositionChange={setView3DPosition}
        undoEnabled={undoEnabled}
        redoEnabled={redoEnabled}
        mode={mode}
        onOpenHome={props.onOpenHome ?? null}
        onSaveHome={props.onSaveHome ?? null}
        onShowHelp={() => setHelpOpen(true)}
        onShowPrint={() => setPrintOpen(true)}
        onShowPreferences={() => setPreferencesOpen(true)}
        catalogOpen={catalogOpen}
        onToggleCatalog={() => setCatalogOpen((open) => !open)}
      />
      <Toolbar
        home={home}
        homeController={homeController}
        view3DPosition={view3DPosition}
        onView3DPositionChange={setView3DPosition}
        undoEnabled={undoEnabled}
        redoEnabled={redoEnabled}
        mode={mode}
        onOpenHome={props.onOpenHome ?? null}
        onSaveHome={props.onSaveHome ?? null}
        catalogOpen={catalogOpen}
        onToggleCatalog={() => setCatalogOpen((open) => !open)}
      />
      <div className="sh-home-body">
        <LeftToolbar mode={mode} homeController={homeController} />
        {catalogOpen && (
          <div className="sh-catalog-dock" data-testid="catalog-dock">
            <FurnitureCatalogPanel
              catalog={catalogController.catalog_}
              catalogController={catalogController}
              homeController={homeController}
            />
          </div>
        )}
        <div className="sh-plan">
          <PlanCanvas
            home={home}
            preferences={preferences}
            controller={planController}
            onReady={(view) => {
              (globalThis as unknown as Record<string, unknown>).__planView = view;
            }}
          />
        </div>
        {view3DPosition === "split" && (
          <div className="sh-view3d">
            <View3DCanvas home={home} preferences={preferences} homeController3D={homeController3D} />
          </div>
        )}
        {view3DPosition === "tab" && (
          <TabbedViews
            home={home}
            preferences={preferences}
            planController={planController}
            homeController3D={homeController3D}
          />
        )}
      </div>
      {helpOpen && (
        <div className="sh-help-overlay" data-testid="help-overlay">
          <HelpPane onClose={() => setHelpOpen(false)} />
        </div>
      )}
      {printOpen && (
        <div className="sh-help-overlay" data-testid="print-preview-overlay">
          <PrintPreviewView home={home} preferences={preferences} onClose={() => setPrintOpen(false)} />
        </div>
      )}
      {preferencesOpen && (
        <div className="sh-help-overlay" data-testid="preferences-overlay">
          <div className="sh-dialog-card">
            <PreferencesView preferences={preferences} onClose={() => setPreferencesOpen(false)} />
          </div>
        </div>
      )}
      {modifyDialog === "furniture" && (
        <div className="sh-help-overlay" data-testid="furniture-dialog">
          <div className="sh-dialog-card">
            <FurniturePropertiesPanel home={home} planController={planController} preferences={preferences} />
            <div className="sh-dialog-buttons">
              <button className="sh-toolbar-button" onClick={() => setModifyDialog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {modifyDialog === "wall" && wallController !== null && (
        <div className="sh-help-overlay" data-testid="wall-dialog">
          <div className="sh-dialog-card">
            <WallDialog controller={wallController} onClose={() => setModifyDialog(null)} preferences={preferences} />
          </div>
        </div>
      )}
      {modifyDialog === "room" && roomController !== null && (
        <div className="sh-help-overlay" data-testid="room-dialog">
          <div className="sh-dialog-card">
            <RoomDialog controller={roomController} onClose={() => setModifyDialog(null)} />
          </div>
        </div>
      )}
      <div className="sh-statusbar">
        <span data-testid="status-selection">{selectionDescription(home, preferences)}</span>
        <span className="sh-statusbar-spacer" />
        <span data-testid="status-mode">{planController.getMode().toString()}</span>
      </div>
    </div>
  );
}

function Toolbar(props: {
  home: Home;
  homeController: HomeController;
  view3DPosition: View3DPosition;
  onView3DPositionChange: (position: View3DPosition) => void;
  undoEnabled: boolean;
  redoEnabled: boolean;
  mode: string;
  catalogOpen: boolean;
  onToggleCatalog: () => void;
  onOpenHome?: (() => void | Promise<void>) | null;
  onSaveHome?: (() => void | Promise<void>) | null;
}): React.JSX.Element {
  const { home, homeController, view3DPosition, onView3DPositionChange, undoEnabled, redoEnabled, mode, catalogOpen, onToggleCatalog, onOpenHome, onSaveHome } = props;
  const planController = homeController.getPlanController();
  return (
    <div className="sh-toolbar" data-mode={mode} role="toolbar" aria-label="Tools">
      <ToolbarButton label="New" onClick={() => homeController.newHome()} />
      <ToolbarButton label="Open" onClick={() => onOpenHome?.() ?? homeController.open()} />
      <ToolbarButton label="Save" onClick={() => onSaveHome?.() ?? homeController.save()} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Undo" onClick={() => homeController.undo()} disabled={!undoEnabled} />
      <ToolbarButton label="Redo" onClick={() => homeController.redo()} disabled={!redoEnabled} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Cut" onClick={() => homeController.cut(home.getSelectedItems())} disabled={home.getSelectedItems().length === 0} />
      <ToolbarButton label="Copy" onClick={() => {}} disabled title="Copy (not ported yet)" />
      <ToolbarButton label="Paste" onClick={() => {}} disabled title="Paste (not ported yet)" />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Delete" onClick={() => planController.deleteSelection()} />
      <ToolbarButton label="Select all" onClick={() => homeController.selectAll()} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="＋" title="Zoom in" onClick={() => planController.zoom(1.25)} />
      <ToolbarButton label="－" title="Zoom out" onClick={() => planController.zoom(0.8)} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Catalog" onClick={onToggleCatalog} active={catalogOpen} />
      <select
        className="sh-view3d-select"
        value={view3DPosition}
        onChange={(event) => onView3DPositionChange(event.target.value as View3DPosition)}
        aria-label="3D view"
      >
        <option value="split">3D: split</option>
        <option value="tab">3D: tab</option>
        <option value="hidden">3D: hidden</option>
      </select>
      <div className="sh-toolbar-spacer" />
      <span className="sh-home-name">{home.getName() ?? "Untitled"}</span>
    </div>
  );
}

function TabbedViews(props: {
  home: Home;
  preferences: UserPreferences;
  planController: ReturnType<HomeController["getPlanController"]>;
  homeController3D: ReturnType<HomeController["getHomeController3D"]>;
}): React.JSX.Element {
  const [tab, setTab] = useState<"plan" | "3d">("plan");
  return (
    <div className="sh-tabs">
      <div className="sh-tab-bar">
        <button className={`sh-tab${tab === "plan" ? " active" : ""}`} onClick={() => setTab("plan")}>Plan</button>
        <button className={`sh-tab${tab === "3d" ? " active" : ""}`} onClick={() => setTab("3d")}>3D</button>
      </div>
      <div className="sh-tab-body">
        {tab === "plan" ? (
          <PlanCanvas home={props.home} preferences={props.preferences} controller={props.planController} />
        ) : (
          <View3DCanvas home={props.home} preferences={props.preferences} homeController3D={props.homeController3D} />
        )}
      </div>
    </div>
  );
}

/** The menu bar (File / Edit / Plan / 3D view / Help), like the desktop app. */
function MenuBar(props: {
  home: Home;
  homeController: HomeController;
  preferences: UserPreferences;
  view3DPosition: View3DPosition;
  onView3DPositionChange: (position: View3DPosition) => void;
  undoEnabled: boolean;
  redoEnabled: boolean;
  mode: string;
  onOpenHome?: (() => void | Promise<void>) | null;
  onSaveHome?: (() => void | Promise<void>) | null;
  onShowHelp: () => void;
  onShowPrint: () => void;
  onShowPreferences: () => void;
  catalogOpen: boolean;
  onToggleCatalog: () => void;
}): React.JSX.Element {
  const { home, homeController, preferences, view3DPosition, onView3DPositionChange, undoEnabled, redoEnabled, mode, onOpenHome, onSaveHome, onShowHelp, onShowPrint, onShowPreferences, catalogOpen, onToggleCatalog } = props;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const planController = homeController.getPlanController();
  const homeController3D = homeController.getHomeController3D();
  const [gridVisible, setGridVisible] = useState(preferences.isGridVisible());
  const [rulersVisible, setRulersVisible] = useState(preferences.isRulersVisible());
  const [magnetismEnabled, setMagnetismEnabled] = useState(preferences.isMagnetismEnabled());

  const close = (): void => setOpenMenu(null);
  const toggle = (name: string): void => setOpenMenu((current) => (current === name ? null : name));
  const run = (action: () => void): void => {
    action();
    close();
  };
  const setMode = (planMode: PlanController.Mode): void => {
    planController.setMode(planMode);
    close();
  };

  const items = (
    name: string,
    entries: Array<
      | { label: string; onClick: () => void; disabled?: boolean; checked?: boolean; title?: string }
      | { separator: true }
    >,
  ): React.JSX.Element => (
    <div className="sh-menu">
      <button className="sh-menu-button" data-testid={`menu-${name}`} onClick={() => toggle(name)}>
        {name}
      </button>
      {openMenu === name && (
        <>
          <div className="sh-menu-backdrop" onClick={close} />
          <div className="sh-menu-dropdown">
            {entries.map((entry, index) =>
              "separator" in entry ? (
                <div key={index} className="sh-menu-separator" />
              ) : (
                <button
                  key={index}
                  className={`sh-menu-item${entry.disabled ? " disabled" : ""}${entry.checked ? " checked" : ""}`}
                  disabled={entry.disabled}
                  title={entry.title}
                  onClick={() => run(entry.onClick)}
                >
                  {entry.checked && <span className="sh-menu-check">✓</span>}
                  {entry.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="sh-menubar" data-testid="menubar" role="menubar">
      {items("File", [
        { label: "New", onClick: () => homeController.newHome() },
        { label: "Open…", onClick: () => onOpenHome?.() ?? homeController.open() },
        { label: "Open recent", onClick: () => {}, disabled: true, title: "Open recent" },
        { label: "Save", onClick: () => onSaveHome?.() ?? homeController.save() },
        { label: "Save as…", onClick: () => {}, disabled: true, title: "Save as…" },
        { separator: true },
        { label: "Export to SVG…", onClick: () => {}, disabled: true, title: "Export to SVG…" },
        { label: "Export to PDF…", onClick: () => {
            void exportPlanToPdf(home, preferences, {}).then((bytes: Uint8Array) => {
              downloadBytes(bytes, `${home.getName() ?? "home"}.pdf`, "application/pdf");
            });
          } },
        { label: "Export to CSV…", onClick: () => {
            const csv = exportFurnitureCsv(home, preferences);
            downloadBytes(new TextEncoder().encode(csv), `${home.getName() ?? "home"}.csv`, "text/csv");
          } },
        { label: "Export to OBJ…", onClick: () => {}, disabled: true, title: "Export to OBJ…" },
        { label: "Export to Photos…", onClick: () => {}, disabled: true, title: "Export to Photos…" },
        { separator: true },
        { label: "Print…", onClick: props.onShowPrint },
        { separator: true },
        { label: "Quit", onClick: close },
      ])}
      {items("Edit", [
        { label: "Undo", onClick: () => homeController.undo(), disabled: !undoEnabled },
        { label: "Redo", onClick: () => homeController.redo(), disabled: !redoEnabled },
        { separator: true },
        { label: "Cut", onClick: () => homeController.cut(home.getSelectedItems()), disabled: home.getSelectedItems().length === 0 },
        { label: "Copy", onClick: () => {}, disabled: true, title: "Copy (not ported yet)" },
        { label: "Paste", onClick: () => {}, disabled: true, title: "Paste (not ported yet)" },
        { label: "Duplicate", onClick: () => {}, disabled: true, title: "Duplicate (not ported yet)" },
        { separator: true },
        { label: "Delete", onClick: () => planController.deleteSelection() },
        { label: "Select all", onClick: () => homeController.selectAll() },
        { separator: true },
        { label: "Modify…", onClick: () => {}, disabled: true, title: "Modify…" },
      ])}
      {items("Furniture", [
        { label: "Add from catalog…", onClick: () => {}, disabled: true, title: "Add from catalog…" },
        { label: "Import…", onClick: () => {}, disabled: true, title: "Import furniture…" },
        { separator: true },
        { label: "Sort…", onClick: () => {}, disabled: true, title: "Sort…" },
        { separator: true },
        { label: "Delete", onClick: () => planController.deleteSelection() },
        { label: "Modify…", onClick: () => {}, disabled: true, title: "Modify furniture…" },
        { label: "Copy…", onClick: () => {}, disabled: true, title: "Copy furniture…" },
      ])}
      {items("Plan", [
        { label: "Draw walls", onClick: () => setMode(PlanMode.WALL_CREATION), checked: mode === "WALL_CREATION" },
        { label: "Draw rooms", onClick: () => setMode(PlanMode.ROOM_CREATION), checked: mode === "ROOM_CREATION" },
        { label: "Draw dimensions", onClick: () => setMode(PlanMode.DIMENSION_LINE_CREATION), checked: mode === "DIMENSION_LINE_CREATION" },
        { label: "Draw labels", onClick: () => setMode(PlanMode.LABEL_CREATION), checked: mode === "LABEL_CREATION" },
        { label: "Draw polylines", onClick: () => setMode(PlanMode.POLYLINE_CREATION), checked: mode === "POLYLINE_CREATION" },
        { separator: true },
        { label: "Modify walls…", onClick: () => {}, disabled: true, title: "Modify walls…" },
        { separator: true },
        { label: "Zoom in", onClick: () => planController.zoom(1.25) },
        { label: "Zoom out", onClick: () => planController.zoom(0.8) },
        { separator: true },
        { label: "Select all", onClick: () => homeController.selectAll() },
        {
          label: "Grid visible",
          onClick: () => {
            preferences.setGridVisible(!preferences.isGridVisible());
            setGridVisible(!preferences.isGridVisible());
          },
          checked: gridVisible,
        },
        {
          label: "Rulers visible",
          onClick: () => {
            preferences.setRulersVisible(!preferences.isRulersVisible());
            setRulersVisible(!preferences.isRulersVisible());
          },
          checked: rulersVisible,
        },
        {
          label: "Magnetism",
          onClick: () => {
            preferences.setMagnetismEnabled(!preferences.isMagnetismEnabled());
            setMagnetismEnabled(!preferences.isMagnetismEnabled());
          },
          checked: magnetismEnabled,
        },
        { separator: true },
        { label: "Lock base plan", onClick: () => {}, disabled: true, title: "Lock base plan" },
      ])}
      {items("3D view", [
        { label: "Modify…", onClick: () => {}, disabled: true, title: "Modify 3D view…" },
        { separator: true },
        { label: "Store camera", onClick: () => homeController3D.storeCamera("Camera 1") },
        { label: "Go to camera", onClick: () => homeController3D.goToCamera(home.getObserverCamera()) },
        { label: "Top view", onClick: () => homeController3D.viewFromTop() },
        { label: "Observer view", onClick: () => homeController3D.viewFromObserver() },
        { separator: true },
        { label: "Split view", onClick: () => onView3DPositionChange("split"), checked: view3DPosition === "split" },
        { label: "Tab view", onClick: () => onView3DPositionChange("tab"), checked: view3DPosition === "tab" },
        { label: "Hidden", onClick: () => onView3DPositionChange("hidden"), checked: view3DPosition === "hidden" },
        { separator: true },
        { label: "Toggle ceilings visibility", onClick: () => {}, disabled: true, title: "Toggle ceilings visibility" },
        { label: "Toggle floors visibility", onClick: () => {}, disabled: true, title: "Toggle floors visibility" },
      ])}
      {items("Tools", [
        { label: "Languages…", onClick: () => {}, disabled: true, title: "Languages…" },
        { label: "Preferences…", onClick: onShowPreferences },
        { separator: true },
        { label: "Import textures…", onClick: () => {}, disabled: true, title: "Import textures…" },
      ])}
      {items("Catalog", [
        { label: "View furniture", onClick: onToggleCatalog, checked: catalogOpen },
        { label: "Import catalog…", onClick: () => {}, disabled: true, title: "Import catalog…" },
      ])}
      {items("Help", [
        { label: "Help…", onClick: onShowHelp },
        { label: "About…", onClick: () => {}, disabled: true, title: "About…" },
      ])}
    </div>
  );
}

/** A human description of the current selection (name + location/size). */
function selectionDescription(home: import("@sweethomejs/core").Home, preferences: UserPreferences): string {
  const unit = preferences.getLengthUnit();
  const selected = home.getSelectedItems();
  if (selected.length === 0) {
    return "Nothing selected";
  }
  if (selected.length > 1) {
    return `${selected.length} items selected`;
  }
  const item = selected[0]!;
  if (item instanceof HomePieceOfFurniture) {
    const size = `${formatLengthValue(item.getWidth(), unit)} × ${formatLengthValue(item.getDepth(), unit)} × ${formatLengthValue(item.getHeight(), unit)}`;
    return `${item.getName() ?? "Furniture"} — ${formatLengthValue(item.getX(), unit)}, ${formatLengthValue(item.getY(), unit)} · ${size}`;
  }
  if (item instanceof WallModel) {
    const length = Math.hypot(item.getXEnd() - item.getXStart(), item.getYEnd() - item.getYStart());
    return `Wall — ${formatLengthValue(length, unit)}`;
  }
  if (item instanceof RoomModel) {
    return `Room — ${Math.round(item.getArea())} cm²`;
  }
  return "Item selected";
}

/** Triggers a browser download of the given bytes. */
function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** The left tools palette (like the desktop app). */
function LeftToolbar(props: { mode: string; homeController: HomeController }): React.JSX.Element {
  const { mode, homeController } = props;
  const planController = homeController.getPlanController();
  const tools: Array<{ label: string; title: string; modeName: string; onClick: () => void }> = [
    { label: "▸", title: "Select", modeName: "SELECTION", onClick: () => planController.setMode(PlanMode.SELECTION) },
    { label: "✥", title: "Pan", modeName: "PANNING", onClick: () => planController.setMode(PlanMode.PANNING) },
    { label: "∥", title: "Draw walls", modeName: "WALL_CREATION", onClick: () => planController.setMode(PlanMode.WALL_CREATION) },
    { label: "▦", title: "Draw rooms", modeName: "ROOM_CREATION", onClick: () => planController.setMode(PlanMode.ROOM_CREATION) },
    { label: "↔", title: "Draw dimensions", modeName: "DIMENSION_LINE_CREATION", onClick: () => planController.setMode(PlanMode.DIMENSION_LINE_CREATION) },
    { label: "🖶", title: "Add labels", modeName: "LABEL_CREATION", onClick: () => planController.setMode(PlanMode.LABEL_CREATION) },
    { label: "⌁", title: "Draw polylines", modeName: "POLYLINE_CREATION", onClick: () => planController.setMode(PlanMode.POLYLINE_CREATION) },
  ];
  return (
    <div className="sh-left-toolbar" data-testid="left-toolbar" role="toolbar" aria-label="Drawing tools">
      {tools.map((tool) => (
        <button
          key={tool.modeName}
          className={`sh-left-tool${mode === tool.modeName ? " active" : ""}`}
          title={tool.title}
          aria-label={tool.title}
          aria-pressed={mode === tool.modeName}
          onClick={tool.onClick}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarButton(props: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; title?: string }): React.JSX.Element {
  return (
    <button
      className={`sh-toolbar-button${props.active ? " active" : ""}${props.disabled ? " disabled" : ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title ?? props.label}
      aria-label={props.title ?? props.label}
    >
      {props.label}
    </button>
  );
}

// The plan modes (re-exported from core's PlanController.Mode)
import { PlanController } from "@sweethomejs/core";
const PlanMode = PlanController.Mode;

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
import { View3DCanvas } from "./view3d/View3DCanvas.js";
import { HelpPane } from "./help/HelpPane.js";

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
  const [undoEnabled, setUndoEnabled] = useState(false);
  const [redoEnabled, setRedoEnabled] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mode, setMode] = useState<string>(props.homeController.getPlanController().getMode().toString());

  useEffect(() => {
    const syncSelection = (): void => setSelectedCount(home.getSelectedItems().length);
    home.addSelectionListener(syncSelection);
    const furnitureListener = { collectionChanged: syncSelection };
    home.addFurnitureListener(furnitureListener);
    const planController = homeController.getPlanController();
    const modeListener = {
      propertyChange: (evt: { newValue?: unknown }): void =>
        setMode(evt.newValue?.toString() ?? planController.getMode().toString()),
    };
    planController.addPropertyChangeListener(PlanController.Property.MODE, modeListener);
    return () => {
      home.removeFurnitureListener(furnitureListener);
      home.removeSelectionListener(syncSelection);
      planController.removePropertyChangeListener(PlanController.Property.MODE, modeListener);
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
      />
      <div className="sh-home-body">
        <LeftToolbar mode={mode} homeController={homeController} />
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
      <div className="sh-statusbar">
        <span data-testid="status-selection">{selectedCount} selected</span>
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
  onOpenHome?: (() => void | Promise<void>) | null;
  onSaveHome?: (() => void | Promise<void>) | null;
}): React.JSX.Element {
  const { home, homeController, view3DPosition, onView3DPositionChange, mode, onOpenHome, onSaveHome } = props;
  const planController = homeController.getPlanController();
  return (
    <div className="sh-toolbar" data-mode={mode}>
      <ToolbarButton label="New" onClick={() => homeController.newHome()} />
      <ToolbarButton label="Open" onClick={() => onOpenHome?.() ?? homeController.open()} />
      <ToolbarButton label="Save" onClick={() => onSaveHome?.() ?? homeController.save()} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Undo" onClick={() => homeController.undo()} />
      <ToolbarButton label="Redo" onClick={() => homeController.redo()} />
      <div className="sh-toolbar-separator" />
      <ToolbarButton label="Delete" onClick={() => planController.deleteSelection()} />
      <div className="sh-toolbar-separator" />
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
}): React.JSX.Element {
  const { home, homeController, preferences, view3DPosition, onView3DPositionChange, undoEnabled, redoEnabled, mode, onOpenHome, onSaveHome, onShowHelp } = props;
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
      | { label: string; onClick: () => void; disabled?: boolean; checked?: boolean }
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
    <div className="sh-menubar" data-testid="menubar">
      {items("File", [
        { label: "New", onClick: () => homeController.newHome() },
        { label: "Open…", onClick: () => onOpenHome?.() ?? homeController.open() },
        { label: "Save", onClick: () => onSaveHome?.() ?? homeController.save() },
        { separator: true },
        { label: "Quit", onClick: () => close() },
      ])}
      {items("Edit", [
        { label: "Undo", onClick: () => homeController.undo(), disabled: !undoEnabled },
        { label: "Redo", onClick: () => homeController.redo(), disabled: !redoEnabled },
        { separator: true },
        { label: "Delete", onClick: () => planController.deleteSelection() },
        { label: "Select all", onClick: () => homeController.selectAll() },
      ])}
      {items("Plan", [
        { label: "Draw walls", onClick: () => setMode(PlanMode.WALL_CREATION), checked: mode === "WALL_CREATION" },
        { label: "Draw rooms", onClick: () => setMode(PlanMode.ROOM_CREATION), checked: mode === "ROOM_CREATION" },
        { label: "Draw dimensions", onClick: () => setMode(PlanMode.DIMENSION_LINE_CREATION), checked: mode === "DIMENSION_LINE_CREATION" },
        { label: "Draw labels", onClick: () => setMode(PlanMode.LABEL_CREATION), checked: mode === "LABEL_CREATION" },
        { label: "Draw polylines", onClick: () => setMode(PlanMode.POLYLINE_CREATION), checked: mode === "POLYLINE_CREATION" },
        { separator: true },
        { label: "Zoom in", onClick: () => planController.zoom(1.25) },
        { label: "Zoom out", onClick: () => planController.zoom(0.8) },
        { separator: true },
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
      ])}
      {items("3D view", [
        { label: "Split view", onClick: () => onView3DPositionChange("split"), checked: view3DPosition === "split" },
        { label: "Tab view", onClick: () => onView3DPositionChange("tab"), checked: view3DPosition === "tab" },
        { label: "Hidden", onClick: () => onView3DPositionChange("hidden"), checked: view3DPosition === "hidden" },
        { separator: true },
        { label: "Store camera", onClick: () => homeController3D.storeCamera("Camera 1") },
        { label: "Go to camera", onClick: () => homeController3D.goToCamera(home.getObserverCamera()) },
      ])}
      {items("Help", [{ label: "Help…", onClick: onShowHelp }])}
    </div>
  );
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
    <div className="sh-left-toolbar" data-testid="left-toolbar">
      {tools.map((tool) => (
        <button
          key={tool.modeName}
          className={`sh-left-tool${mode === tool.modeName ? " active" : ""}`}
          title={tool.title}
          aria-label={tool.title}
          onClick={tool.onClick}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}

function ToolbarButton(props: { label: string; onClick: () => void; active?: boolean }): React.JSX.Element {
  return (
    <button className={`sh-toolbar-button${props.active ? " active" : ""}`} onClick={props.onClick}>
      {props.label}
    </button>
  );
}

// The plan modes (re-exported from core's PlanController.Mode)
import { PlanController } from "@sweethomejs/core";
const PlanMode = PlanController.Mode;

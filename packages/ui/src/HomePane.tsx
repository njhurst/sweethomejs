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

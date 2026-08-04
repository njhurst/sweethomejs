/*
 * FurniturePropertiesPanel.tsx
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
 * FurniturePropertiesPanel (task 7.3): edits the selected furniture's
 * properties in a side panel. Commits position/size edits through the
 * PlanController's editable-property path (undoable) and other fields via
 * the piece setters.
 */
import { useEffect, useState } from "react";
import { Home, HomePieceOfFurniture, UserPreferences } from "@sweethomejs/core";
import type { PlanController } from "@sweethomejs/core";
import { formatLengthValue, parseLengthValue } from "../units.js";

export interface FurniturePropertiesPanelProps {
  home: Home;
  planController: PlanController;
  /** The user preferences carrying the current length unit. */
  preferences?: UserPreferences;
}

interface EditableFields {
  name: string;
  x: string;
  y: string;
  elevation: string;
  angle: string;
  width: string;
  depth: string;
  height: string;
}

export function FurniturePropertiesPanel(props: FurniturePropertiesPanelProps): React.JSX.Element {
  const { home, planController } = props;
  const unit = props.preferences?.getLengthUnit() ?? new UserPreferences().getLengthUnit();
  const [piece, setPiece] = useState<HomePieceOfFurniture | null>(null);
  const [fields, setFields] = useState<EditableFields | null>(null);

  useEffect(() => {
    const syncSelection = (): void => {
      const selected = home.getSelectedItems().filter((item) => item instanceof HomePieceOfFurniture);
      const selectedPiece = selected.length === 1 ? (selected[0] as HomePieceOfFurniture) : null;
      setPiece(selectedPiece);
      setFields(selectedPiece === null ? null : fieldsFromPiece(selectedPiece, unit));
    };
    syncSelection();
    home.addSelectionListener(syncSelection);
    const furnitureListener = { collectionChanged: syncSelection };
    home.addFurnitureListener(furnitureListener);
    return () => {
      home.removeFurnitureListener(furnitureListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home]);

  if (piece === null || fields === null) {
    return <div className="sh-properties" data-testid="properties-empty">No furniture selected</div>;
  }

  const update = (field: keyof EditableFields, value: string): void => {
    setFields({ ...fields, [field]: value });
  };

  /** Commits a numeric field through the controller (undoable). */
  const commitNumeric = (field: keyof EditableFields, property: string): void => {
    const text = fields[field];
    const value = property === "ANGLE" ? parseFloat(text) : parseLengthValue(text, unit);
    if (value !== null && !Number.isNaN(value)) {
      planController.updateEditableProperty(property as never, value);
      setFields(fieldsFromPiece(piece, unit));
    }
  };

  const commitName = (): void => {
    piece.setName(fields.name);
  };

  return (
    <div className="sh-properties" data-testid="properties">
      <h3 className="sh-properties-title">Furniture</h3>
      <PropertyField label="Name" value={fields.name} onChange={(v) => update("name", v)} onCommit={commitName} />
      <PropertyField label="X" value={fields.x} onChange={(v) => update("x", v)} onCommit={() => commitNumeric("x", "X")} />
      <PropertyField label="Y" value={fields.y} onChange={(v) => update("y", v)} onCommit={() => commitNumeric("y", "Y")} />
      <PropertyField label="Elevation" value={fields.elevation} onChange={(v) => update("elevation", v)} onCommit={() => commitNumeric("elevation", "ELEVATION")} />
      <PropertyField label="Angle (°)" value={fields.angle} onChange={(v) => update("angle", v)} onCommit={() => commitNumeric("angle", "ANGLE")} />
      <PropertyField label="Width" value={fields.width} onChange={(v) => update("width", v)} onCommit={() => commitNumeric("width", "WIDTH")} />
      <PropertyField label="Depth" value={fields.depth} onChange={(v) => update("depth", v)} onCommit={() => commitNumeric("depth", "DEPTH")} />
      <PropertyField label="Height" value={fields.height} onChange={(v) => update("height", v)} onCommit={() => commitNumeric("height", "HEIGHT")} />
    </div>
  );
}

function fieldsFromPiece(piece: HomePieceOfFurniture, unit: import("@sweethomejs/core").LengthUnit): EditableFields {
  return {
    name: piece.getName() ?? "",
    x: formatLengthValue(piece.getX(), unit),
    y: formatLengthValue(piece.getY(), unit),
    elevation: formatLengthValue(piece.getElevation(), unit),
    angle: formatNumber((piece.getAngle() * 180) / Math.PI),
    width: formatLengthValue(piece.getWidth(), unit),
    depth: formatLengthValue(piece.getDepth(), unit),
    height: formatLengthValue(piece.getHeight(), unit),
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function PropertyField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
}): React.JSX.Element {
  return (
    <label className="sh-property-field">
      <span className="sh-property-label">{props.label}</span>
      <input
        className="sh-property-input"
        type="text"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        onBlur={props.onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            props.onCommit?.();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

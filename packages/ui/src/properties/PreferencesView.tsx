/*
 * PreferencesView.tsx
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
 * Preferences dialog: choose the length unit (mm, cm, m, inches, feet +
 * inches, …) plus the plan toggles (grid, rulers, magnetism). The chosen unit
 * is applied everywhere lengths are displayed or entered (Java's
 * UserPreferences.setUnit + LengthUnit).
 */
import { useState } from "react";
import { LengthUnit, UserPreferences } from "@sweethomejs/core";
import { formatLengthValue, parseLengthValue } from "../units.js";

export interface PreferencesViewProps {
  preferences: UserPreferences;
  onClose: () => void;
}

const UNITS: Array<{ value: string; label: string }> = [
  { value: LengthUnit.MILLIMETER, label: "Millimeters (mm)" },
  { value: LengthUnit.CENTIMETER, label: "Centimeters (cm)" },
  { value: LengthUnit.METER, label: "Meters (m)" },
  { value: LengthUnit.INCH, label: "Inches (fractions)" },
  { value: LengthUnit.INCH_DECIMALS, label: "Inches (decimals)" },
  { value: LengthUnit.FOOT_DECIMALS, label: "Feet (decimals)" },
];

export function PreferencesView(props: PreferencesViewProps): React.JSX.Element {
  const { preferences, onClose } = props;
  const [unit, setUnit] = useState(preferences.getLengthUnit().getUnit());
  const [gridVisible, setGridVisible] = useState(preferences.isGridVisible());
  const [rulersVisible, setRulersVisible] = useState(preferences.isRulersVisible());
  const [magnetismEnabled, setMagnetismEnabled] = useState(preferences.isMagnetismEnabled());
  const [example, setExample] = useState("");

  const currentUnit = new LengthUnit(unit);

  const applyUnit = (value: string): void => {
    setUnit(value);
    preferences.setUnit(new LengthUnit(value));
    setExample(formatLengthValue(parseLengthValue("2' 8\"", new LengthUnit(value)) ?? 0, new LengthUnit(value)));
  };

  return (
    <div className="sh-preferences" data-testid="preferences-dialog">
      <h3 className="sh-properties-title">Preferences</h3>
      <label className="sh-property-field">
        <span className="sh-property-label">Length unit</span>
        <select
          className="sh-property-input"
          value={unit}
          onChange={(event) => applyUnit(event.target.value)}
          data-testid="preferences-unit"
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </label>
      <div className="sh-preferences-example" data-testid="preferences-example">
        2&apos; 8&quot; = {formatLengthValue(parseLengthValue("2' 8\"", currentUnit) ?? 0, currentUnit)}
      </div>
      <label className="sh-property-field">
        <input type="checkbox" checked={gridVisible} onChange={(event) => {
          preferences.setGridVisible(event.target.checked);
          setGridVisible(event.target.checked);
        }} />
        <span className="sh-property-label">Grid visible</span>
      </label>
      <label className="sh-property-field">
        <input type="checkbox" checked={rulersVisible} onChange={(event) => {
          preferences.setRulersVisible(event.target.checked);
          setRulersVisible(event.target.checked);
        }} />
        <span className="sh-property-label">Rulers visible</span>
      </label>
      <label className="sh-property-field">
        <input type="checkbox" checked={magnetismEnabled} onChange={(event) => {
          preferences.setMagnetismEnabled(event.target.checked);
          setMagnetismEnabled(event.target.checked);
        }} />
        <span className="sh-property-label">Magnetism</span>
      </label>
      <div className="sh-dialog-buttons">
        <button className="sh-toolbar-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

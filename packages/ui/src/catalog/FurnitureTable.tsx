/*
 * FurnitureTable.tsx
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
 * FurnitureTable (task 7.2): the home's furniture list — virtualized
 * (windowed rows), sortable by column, synced with the home model and the
 * FurnitureController selection.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Home, FurnitureController } from "@sweethomejs/core";
import { HomePieceOfFurniture } from "@sweethomejs/core";

export interface FurnitureColumn {
  key: string;
  label: string;
  /** Returns the sortable value of a piece for this column. */
  value: (piece: HomePieceOfFurniture) => string | number;
  width?: number;
}

export const FURNITURE_COLUMNS: FurnitureColumn[] = [
  { key: "name", label: "Name", value: (p) => p.getName() ?? "", width: 140 },
  { key: "width", label: "Width", value: (p) => p.getWidth(), width: 70 },
  { key: "depth", label: "Depth", value: (p) => p.getDepth(), width: 70 },
  { key: "height", label: "Height", value: (p) => p.getHeight(), width: 70 },
  { key: "x", label: "X", value: (p) => p.getX(), width: 70 },
  { key: "y", label: "Y", value: (p) => p.getY(), width: 70 },
  { key: "elevation", label: "Elev.", value: (p) => p.getElevation(), width: 70 },
  { key: "angle", label: "Angle", value: (p) => p.getAngle(), width: 70 },
];

const ROW_HEIGHT = 24;
const DEFAULT_ROW_COUNT = 20;

/** Sorts pieces by the column (numeric when the value is numeric). */
export function sortFurniture(pieces: HomePieceOfFurniture[], column: FurnitureColumn, descending: boolean): HomePieceOfFurniture[] {
  const sorted = [...pieces].sort((a, b) => {
    const va = column.value(a);
    const vb = column.value(b);
    let result: number;
    if (typeof va === "number" && typeof vb === "number") {
      result = va - vb;
    } else {
      result = String(va).localeCompare(String(vb));
    }
    return descending ? -result : result;
  });
  return sorted;
}

export interface FurnitureTableProps {
  home: Home;
  furnitureController: FurnitureController;
  columns?: FurnitureColumn[];
}

export function FurnitureTable(props: FurnitureTableProps): React.JSX.Element {
  const { home, furnitureController } = props;
  const columns = props.columns ?? FURNITURE_COLUMNS;
  const [sortKey, setSortKey] = useState("name");
  const [descending, setDescending] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const furniture = useMemo(() => home.getFurniture(), [home]);
  const sortColumn = columns.find((c) => c.key === sortKey) ?? columns[0]!;
  const sorted = useMemo(() => sortFurniture(furniture, sortColumn, descending), [furniture, sortColumn, descending]);
  const visibleCount = Math.ceil((containerRef.current?.clientHeight ?? ROW_HEIGHT * DEFAULT_ROW_COUNT) / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
  const visibleRows = sorted.slice(startIndex, startIndex + visibleCount + 2);

  useEffect(() => {
    const syncSelection = (): void => {
      const selected = home.getSelectedItems().filter((item) => item instanceof HomePieceOfFurniture);
      setSelectedName(selected.length === 1 ? (selected[0] as HomePieceOfFurniture).getName() : null);
    };
    home.addSelectionListener(syncSelection);
    return () => {
      home.removeSelectionListener(syncSelection);
    };
  }, [home]);

  const onSort = (column: FurnitureColumn): void => {
    if (column.key === sortKey) {
      setDescending((d) => !d);
    } else {
      setSortKey(column.key);
      setDescending(false);
    }
  };

  const selectRow = (piece: HomePieceOfFurniture): void => {
    furnitureController.setSelectedFurniture([piece]);
  };

  return (
    <div className="sh-furniture-table" data-testid="furniture-table">
      <div className="sh-furniture-header">
        {columns.map((column) => (
          <button
            key={column.key}
            className={`sh-furniture-header-cell${column.key === sortKey ? " sorted" : ""}`}
            style={{ width: column.width }}
            onClick={() => onSort(column)}
          >
            {column.label}
            {column.key === sortKey ? (descending ? " ↓" : " ↑") : ""}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        className="sh-furniture-body"
        style={{ height: ROW_HEIGHT * DEFAULT_ROW_COUNT, overflowY: "auto" }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        data-testid="furniture-rows"
      >
        <div style={{ height: sorted.length * ROW_HEIGHT, position: "relative" }}>
          {visibleRows.map((piece, i) => (
            <div
              key={piece.getId()}
              className={`sh-furniture-row${piece.getName() === selectedName ? " selected" : ""}`}
              style={{ position: "absolute", top: (startIndex + i) * ROW_HEIGHT, height: ROW_HEIGHT }}
              onClick={() => selectRow(piece)}
            >
              {columns.map((column) => (
                <span key={column.key} className="sh-furniture-cell" style={{ width: column.width }}>
                  {formatCell(column.value(piece))}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatCell(value: string | number): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value;
}

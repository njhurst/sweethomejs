/*
 * PlanPainterPipeline.ts
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
 * PlanPainterPipeline (task 5.3): paints a Home on a PlanPainter in the Java
 * paint order. The painter must already have the viewport transform applied
 * (model space, y-down like Java2D).
 */
import type { PlanPainter, Color } from "./PlanPainter.js";
import type { Home } from "@sweethomejs/core";
import type { Level } from "@sweethomejs/core";
import { Wall } from "@sweethomejs/core";
import { Room } from "@sweethomejs/core";
import { Polyline } from "@sweethomejs/core";
import { DimensionLine } from "@sweethomejs/core";
import { Label } from "@sweethomejs/core";
import { Compass } from "@sweethomejs/core";
import { HomePieceOfFurniture } from "@sweethomejs/core";
import type { UserPreferences } from "@sweethomejs/core";

/** Plan color scheme (desktop-app defaults). */
export interface PlanColors {
  background: Color;
  grid: Color;
  mainGrid: Color;
  furnitureOutline: Color;
  furnitureName: Color;
  wallOutline: Color;
  roomOutline: Color;
  roomName: Color;
  dimensionLine: Color;
  label: Color;
  polyline: Color;
  compass: Color;
  selection: Color;
  text: Color;
}

export const DEFAULT_PLAN_COLORS: PlanColors = {
  background: 0xffffff,
  grid: 0xdddddd,
  mainGrid: 0xc8c8c8,
  furnitureOutline: 0x1d00b4,
  furnitureName: 0x000000,
  wallOutline: 0x7f7f7f,
  roomOutline: 0x7f7f7f,
  roomName: 0x000000,
  dimensionLine: 0x000000,
  label: 0x000000,
  polyline: 0x000000,
  compass: 0x000000,
  selection: 0x0057ff,
  text: 0x000000,
};

/** Draws a polygon from item points with a fill/stroke. */
function drawPolygon(painter: PlanPainter, points: number[][]): void {
  painter.beginPath();
  if (points.length > 0) {
    painter.moveTo(points[0]![0]!, points[0]![1]!);
    for (let i = 1; i < points.length; i++) {
      painter.lineTo(points[i]![0]!, points[i]![1]!);
    }
    painter.closePath();
  }
}

export interface PlanPaintOptions {
  colors?: PlanColors;
  /** Paint only the selected level's items (false paints all levels). */
  selectedLevelOnly?: boolean;
}

export class PlanPainterPipeline {
  private readonly colors: PlanColors;

  constructor(colors: PlanColors = DEFAULT_PLAN_COLORS) {
    this.colors = colors;
  }

  /** Paints the home content for the selected level. */
  paint(painter: PlanPainter, home: Home, preferences: UserPreferences, level: Level | null, options: PlanPaintOptions = {}): void {
    void level;
    void options;
    // Paint order mirrors PlanComponent.paintHomeItems
    const selectedLevel = home.getSelectedLevel();
    const viewableAtLevel = (item: { getLevel(): Level | null }): boolean => {
      if (selectedLevel === null) {
        return true;
      }
      const itemLevel = item.getLevel();
      return itemLevel === selectedLevel || itemLevel === null;
    };

    // Compass
    this.paintCompass(painter, home.getCompass());

    // Rooms
    const rooms = home.getRooms().filter(viewableAtLevel);
    this.paintRooms(painter, rooms);

    // Walls
    const walls = home.getWalls().filter(viewableAtLevel);
    this.paintWalls(painter, walls);

    // Furniture (sorted by elevation, like Java)
    const furniture = home.getFurniture()
      .filter(viewableAtLevel)
      .sort((p1, p2) => p1.getGroundElevation() - p2.getGroundElevation());
    this.paintFurniture(painter, furniture, preferences);

    // Polylines
    this.paintPolylines(painter, home.getPolylines().filter(viewableAtLevel));

    // Dimension lines
    this.paintDimensionLines(painter, home.getDimensionLines().filter(viewableAtLevel));

    // Rooms text, furniture names, labels (painted last, on top)
    this.paintRoomsNameAndArea(painter, rooms);
    this.paintFurnitureName(painter, furniture);
    this.paintLabels(painter, home.getLabels().filter(viewableAtLevel));
  }

  /** Paints the background color over the whole painter surface. */
  paintBackground(painter: PlanPainter, width: number, height: number): void {
    painter.save();
    painter.setColor(this.colors.background);
    painter.fillRect(0, 0, width, height);
    painter.restore();
  }

  /** Paints the base + major grid lines for the visible model area. */
  paintGrid(painter: PlanPainter, preferences: UserPreferences, xMin: number, yMin: number, xMax: number, yMax: number, scale: number): void {
    const gridSize = this.getGridSize(preferences, scale);
    const mainGridSize = this.getMainGridSize(preferences, scale);
    painter.save();
    painter.setStroke(1 / scale, []);
    // Base grid
    painter.setColor(this.colors.grid);
    this.paintGridLines(painter, xMin, xMax, yMin, yMax, gridSize);
    // Main grid
    painter.setColor(this.colors.mainGrid);
    this.paintGridLines(painter, xMin, xMax, yMin, yMax, mainGridSize);
    painter.restore();
  }

  private paintGridLines(painter: PlanPainter, xMin: number, xMax: number, yMin: number, yMax: number, gridSize: number): void {
    for (let x = Math.ceil(xMin / gridSize) * gridSize; x <= xMax; x += gridSize) {
      painter.drawLine(x, yMin, x, yMax);
    }
    for (let y = Math.ceil(yMin / gridSize) * gridSize; y <= yMax; y += gridSize) {
      painter.drawLine(xMin, y, xMax, y);
    }
  }

  private gridSizes(preferences: UserPreferences): number[] {
    if (preferences.getLengthUnit().isMetric()) {
      return [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    }
    const oneFoot = 2.54 * 12;
    return [2.54, 5.08, 7.62, 15.24, oneFoot, 3 * oneFoot, 6 * oneFoot, 12 * oneFoot, 24 * oneFoot, 48 * oneFoot, 96 * oneFoot, 192 * oneFoot, 384 * oneFoot];
  }

  getGridSize(preferences: UserPreferences, gridScale: number): number {
    const sizes = this.gridSizes(preferences);
    let gridSize = sizes[0]!;
    for (let i = 1; i < sizes.length && gridSize * gridScale < 10; i++) {
      gridSize = sizes[i]!;
    }
    return gridSize;
  }

  getMainGridSize(preferences: UserPreferences, gridScale: number): number {
    const gridSize = this.getGridSize(preferences, gridScale);
    const sizes = this.gridSizes(preferences);
    let mainGridSize = gridSize;
    for (let i = sizes.indexOf(gridSize) + 1; i < sizes.length && mainGridSize * gridScale < 50; i++) {
      mainGridSize = sizes[i]!;
    }
    return mainGridSize;
  }

  private paintCompass(painter: PlanPainter, compass: Compass): void {
    painter.save();
    painter.setStroke(1.5, []);
    painter.setColor(this.colors.compass);
    const diameter = compass.getDiameter();
    painter.drawOval(compass.getX() - diameter / 2, compass.getY() - diameter / 2, diameter, diameter);
    // North arrow
    const northAngle = -compass.getNorthDirection();
    const arrowLength = diameter / 2 * 0.8;
    const endX = compass.getX() + arrowLength * Math.cos(northAngle);
    const endY = compass.getY() + arrowLength * Math.sin(northAngle);
    painter.drawLine(compass.getX(), compass.getY(), endX, endY);
    painter.restore();
  }

  private paintRooms(painter: PlanPainter, rooms: Room[]): void {
    painter.save();
    for (const room of rooms) {
      if (!room.isFloorVisible()) {
        continue;
      }
      const points = room.getPoints();
      if (points.length < 3) {
        continue;
      }
      const floorColor = room.getFloorColor() ?? 0xffffff;
      painter.setColor(floorColor);
      drawPolygon(painter, points);
      painter.fillPath();
      // Outline
      painter.setColor(this.colors.roomOutline);
      painter.setStroke(0.5, []);
      drawPolygon(painter, points);
      painter.strokePath();
    }
    painter.restore();
  }

  private paintWalls(painter: PlanPainter, walls: Wall[]): void {
    painter.save();
    for (const wall of walls) {
      const points = wall.getPoints();
      if (points.length < 4) {
        continue;
      }
      const wallColor = wall.getLeftSideColor() ?? 0xbfbfbf;
      painter.setColor(wallColor);
      drawPolygon(painter, points);
      painter.fillPath();
    }
    painter.restore();
    // Outlines painted after all fills (Java paints walls then outlines)
    painter.save();
    painter.setColor(this.colors.wallOutline);
    painter.setStroke(0.5, []);
    for (const wall of walls) {
      drawPolygon(painter, wall.getPoints());
      painter.strokePath();
    }
    painter.restore();
  }

  private paintFurniture(painter: PlanPainter, furniture: HomePieceOfFurniture[], preferences: UserPreferences): void {
    painter.save();
    for (const piece of furniture) {
      const points = piece.getPoints();
      if (points.length === 0) {
        continue;
      }
      // Placeholder: outlined rectangle (the 3D-icon path is task 5.4)
      const color = piece.getColor() ?? this.colors.furnitureOutline;
      painter.setColor(color);
      drawPolygon(painter, points);
      painter.strokePath();
      void preferences;
    }
    painter.restore();
  }

  private paintFurnitureName(painter: PlanPainter, furniture: HomePieceOfFurniture[]): void {
    painter.save();
    for (const piece of furniture) {
      if (!piece.isNameVisible()) {
        continue;
      }
      painter.setColor(this.colors.furnitureName);
      painter.setFont({ name: null, size: 10, bold: false, italic: false });
      const name = piece.getName() ?? "";
      painter.drawText(name, piece.getX() + (piece.getNameXOffset() ?? 0), piece.getY() + (piece.getNameYOffset() ?? 0));
    }
    painter.restore();
  }

  private paintPolylines(painter: PlanPainter, polylines: Polyline[]): void {
    painter.save();
    for (const polyline of polylines) {
      painter.setColor(polyline.getColor() ?? this.colors.polyline);
      painter.setStroke(polyline.getThickness(), polyline.getDashPattern() ?? undefined);
      painter.beginPath();
      const points = polyline.getPoints();
      if (points.length > 0) {
        painter.moveTo(points[0]![0]!, points[0]![1]!);
        for (let i = 1; i < points.length; i++) {
          painter.lineTo(points[i]![0]!, points[i]![1]!);
        }
      }
      painter.strokePath();
    }
    painter.restore();
  }

  private paintDimensionLines(painter: PlanPainter, dimensionLines: DimensionLine[]): void {
    painter.save();
    for (const line of dimensionLines) {
      painter.setColor(line.getColor() ?? this.colors.dimensionLine);
      painter.setStroke(0.5, []);
      painter.drawLine(line.getXStart(), line.getYStart(), line.getXEnd(), line.getYEnd());
      // Offset line perpendicular to the dimension line
      const dx = line.getXEnd() - line.getXStart();
      const dy = line.getYEnd() - line.getYStart();
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        const nx = -dy / length;
        const ny = dx / length;
        const ox = line.getOffset();
        painter.drawLine(
          line.getXStart() + nx * ox, line.getYStart() + ny * ox,
          line.getXEnd() + nx * ox, line.getYEnd() + ny * ox,
        );
        // End marks
        const endMark = line.getEndMarkSize();
        painter.drawLine(line.getXEnd(), line.getYEnd(), line.getXEnd() + nx * endMark, line.getYEnd() + ny * endMark);
        painter.drawLine(line.getXStart(), line.getYStart(), line.getXStart() + nx * endMark, line.getYStart() + ny * endMark);
      }
    }
    painter.restore();
  }

  private paintRoomsNameAndArea(painter: PlanPainter, rooms: Room[]): void {
    painter.save();
    painter.setFont({ name: null, size: 10, bold: false, italic: false });
    for (const room of rooms) {
      const name = room.getName();
      if (name !== null && room.isNameVisible()) {
        painter.setColor(this.colors.roomName);
        painter.drawText(name, room.getXCenter() + room.getNameXOffset(), room.getYCenter() + room.getNameYOffset());
      }
      if (room.isAreaVisible()) {
        painter.setColor(this.colors.roomName);
        painter.drawText(formatArea(room.getArea()), room.getXCenter() + room.getAreaXOffset(), room.getYCenter() + room.getAreaYOffset() + 12);
      }
    }
    painter.restore();
  }

  private paintLabels(painter: PlanPainter, labels: Label[]): void {
    painter.save();
    painter.setFont({ name: null, size: 10, bold: false, italic: false });
    for (const label of labels) {
      painter.setColor(label.getColor() ?? this.colors.label);
      painter.drawText(label.getText(), label.getX(), label.getY());
    }
    painter.restore();
  }
}

function formatArea(area: number): string {
  const areaText = area >= 1000000 ? `${(area / 1000000).toFixed(2)} m²` : `${Math.round(area)} cm²`;
  return areaText;
}

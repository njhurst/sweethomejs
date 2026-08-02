/*
 * FurnitureCatalogPanel.tsx
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
 * FurnitureCatalogPanel (task 7.2): the furniture catalog as a searchable
 * category tree. Selecting a piece notifies the FurnitureCatalogController;
 * double-clicking adds the piece to the home via the furniture controller.
 */
import { useMemo, useState } from "react";
import type { FurnitureCatalogController, HomeController } from "@sweethomejs/core";
import { FurnitureCatalog, HomePieceOfFurniture } from "@sweethomejs/core";

interface CatalogPieceLike {
  getId(): string | null;
  getName(): string | null;
  getWidth(): number;
  getDepth(): number;
  getHeight(): number;
}

export interface FurnitureCatalogPanelProps {
  catalog: FurnitureCatalog;
  catalogController: FurnitureCatalogController;
  homeController: HomeController;
}

export interface CatalogSearchResult {
  category: string;
  pieces: Array<{ id: string; name: string; width: number; depth: number; height: number }>;
}

/**
 * Filters the catalog by the search query (case-insensitive on name/category).
 * Pure helper, unit-testable without React.
 */
export function filterCatalog(catalog: FurnitureCatalog, query: string): CatalogSearchResult[] {
  const q = query.trim().toLowerCase();
  const results: CatalogSearchResult[] = [];
  for (const category of catalog.getCategories()) {
    const pieces = category.getFurniture();
    const matched: CatalogSearchResult["pieces"] = [];
    for (const piece of pieces) {
      const pieceLike = piece as unknown as CatalogPieceLike;
      const name = pieceLike.getName() ?? "";
      const categoryName = category.getName();
      if (q === "" || name.toLowerCase().includes(q) || categoryName.toLowerCase().includes(q)) {
        matched.push({
          id: pieceLike.getId() ?? name,
          name,
          width: pieceLike.getWidth(),
          depth: pieceLike.getDepth(),
          height: pieceLike.getHeight(),
        });
      }
    }
    if (matched.length > 0) {
      results.push({ category: category.getName(), pieces: matched });
    }
  }
  return results;
}

export function FurnitureCatalogPanel(props: FurnitureCatalogPanelProps): React.JSX.Element {
  const { catalog, catalogController, homeController } = props;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const results = useMemo(() => filterCatalog(catalog, query), [catalog, query]);

  const toggleCategory = (name: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const selectPiece = (pieceId: string): void => {
    const piece = catalog.getPieceOfFurnitureWithId(pieceId);
    if (piece !== null) {
      catalogController.setSelectedFurniture([piece as unknown as import("@sweethomejs/core").CatalogPieceOfFurniture]);
    }
  };

  const addPieceToHome = (pieceId: string): void => {
    const piece = catalog.getPieceOfFurnitureWithId(pieceId);
    if (piece !== null) {
      const homePiece = homeController.getFurnitureController().createHomePieceOfFurniture(piece as unknown as import("@sweethomejs/core").CatalogPieceOfFurniture as never);
      homeController.getFurnitureController().addFurniture([homePiece as HomePieceOfFurniture]);
    }
  };

  return (
    <div className="sh-catalog">
      <input
        className="sh-catalog-search"
        type="search"
        placeholder="Search furniture…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        data-testid="catalog-search"
      />
      <div className="sh-catalog-tree" data-testid="catalog-tree">
        {results.length === 0 && <div className="sh-catalog-empty">No furniture found</div>}
        {results.map(({ category, pieces }) => (
          <div className="sh-catalog-category" key={category}>
            <button className="sh-catalog-category-header" onClick={() => toggleCategory(category)}>
              <span className="sh-catalog-caret">{expanded.has(category) ? "▾" : "▸"}</span>
              {category}
              <span className="sh-catalog-count">{pieces.length}</span>
            </button>
            {(expanded.has(category) || query.trim() !== "") && (
              <ul className="sh-catalog-pieces">
                {pieces.map((piece) => (
                  <li key={piece.id}>
                    <button
                      className="sh-catalog-piece"
                      onClick={() => selectPiece(piece.id)}
                      onDoubleClick={() => addPieceToHome(piece.id)}
                      title={`${piece.width} × ${piece.depth} × ${piece.height} cm — double-click to add`}
                    >
                      {piece.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

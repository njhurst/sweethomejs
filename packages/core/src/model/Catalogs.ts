/**
 * Port of com.eteks.sweethome3d.model.FurnitureCatalog / FurnitureCategory /
 * TexturesCatalog / TexturesCategory / PatternsCatalog (GPL v2+).
 */
import { CollectionChangeSupport, CollectionEvent } from "../events/CollectionChangeSupport.js";
import type { CatalogPieceOfFurniture, CatalogTexture, TextureImage } from "./stubs.js";

export class FurnitureCategory {
  private readonly name: string;
  private readonly furniture: CatalogPieceOfFurniture[] = [];

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  getFurniture(): CatalogPieceOfFurniture[] {
    return this.furniture;
  }

  getFurnitureCount(): number {
    return this.furniture.length;
  }

  getPieceOfFurniture(index: number): CatalogPieceOfFurniture {
    return this.furniture[index]!;
  }

  getIndexOfPieceOfFurniture(piece: CatalogPieceOfFurniture): number {
    return this.furniture.indexOf(piece);
  }

  addPieceOfFurniture(piece: CatalogPieceOfFurniture, index: number): void {
    this.furniture.splice(index, 0, piece);
  }

  deletePieceOfFurniture(piece: CatalogPieceOfFurniture): void {
    const index = this.furniture.indexOf(piece);
    if (index !== -1) {
      this.furniture.splice(index, 1);
    }
  }

  equals(obj: unknown): boolean {
    return obj instanceof FurnitureCategory && this.name === obj.getName();
  }
}

export class FurnitureCatalog {
  private readonly categories: FurnitureCategory[] = [];
  private readonly furnitureChangeSupport = new CollectionChangeSupport<CatalogPieceOfFurniture>(this);

  getCategories(): FurnitureCategory[] {
    return this.categories;
  }

  getCategoriesCount(): number {
    return this.categories.length;
  }

  getCategory(index: number): FurnitureCategory {
    return this.categories[index]!;
  }

  addFurnitureListener(listener: (event: { item: CatalogPieceOfFurniture; type: string }) => void): void {
    this.furnitureChangeSupport.addCollectionListener({
      collectionChanged: (event: { item: CatalogPieceOfFurniture; type: string }) => listener({ item: event.item, type: event.type }),
    });
  }

  removeFurnitureListener(listener: (event: { item: CatalogPieceOfFurniture; type: string }) => void): void {
    this.furnitureChangeSupport.removeCollectionListener({
      collectionChanged: (event: { item: CatalogPieceOfFurniture; type: string }) => listener({ item: event.item, type: event.type }),
    } as never);
  }

  add(category: FurnitureCategory, piece: CatalogPieceOfFurniture): void {
    if (this.categories.indexOf(category) === -1) {
      this.categories.push(category);
    }
    const index = category.getFurnitureCount();
    category.addPieceOfFurniture(piece, index);
    this.furnitureChangeSupport.fireCollectionChangedAt(piece, index, CollectionEvent.Type.ADD);
  }

  delete(piece: CatalogPieceOfFurniture): void {
    for (const category of this.categories) {
      const index = category.getIndexOfPieceOfFurniture(piece);
      if (index !== -1) {
        category.deletePieceOfFurniture(piece);
        this.furnitureChangeSupport.fireCollectionChangedAt(piece, index, CollectionEvent.Type.DELETE);
        break;
      }
    }
  }

  getPieceOfFurnitureWithId(id: string): CatalogPieceOfFurniture | null {
    for (const category of this.categories) {
      for (const piece of category.getFurniture()) {
        if (piece.getId?.() === id) {
          return piece;
        }
      }
    }
    return null;
  }
}

export class TexturesCategory {
  private readonly name: string;
  private readonly textures: CatalogTexture[] = [];

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  getTextures(): CatalogTexture[] {
    return this.textures;
  }

  getTexturesCount(): number {
    return this.textures.length;
  }

  getTexture(index: number): CatalogTexture {
    return this.textures[index]!;
  }

  addTexture(texture: CatalogTexture, index: number): void {
    this.textures.splice(index, 0, texture);
  }

  deleteTexture(texture: CatalogTexture): void {
    const index = this.textures.indexOf(texture);
    if (index !== -1) {
      this.textures.splice(index, 1);
    }
  }

  equals(obj: unknown): boolean {
    return obj instanceof TexturesCategory && this.name === obj.getName();
  }
}

export class TexturesCatalog {
  private readonly categories: TexturesCategory[] = [];
  private readonly texturesChangeSupport = new CollectionChangeSupport<CatalogTexture>(this);

  getCategories(): TexturesCategory[] {
    return this.categories;
  }

  getCategoriesCount(): number {
    return this.categories.length;
  }

  getCategory(index: number): TexturesCategory {
    return this.categories[index]!;
  }

  add(category: TexturesCategory, texture: CatalogTexture): void {
    if (this.categories.indexOf(category) === -1) {
      this.categories.push(category);
    }
    const index = category.getTexturesCount();
    category.addTexture(texture, index);
    this.texturesChangeSupport.fireCollectionChangedAt(texture, index, CollectionEvent.Type.ADD);
  }

  delete(texture: CatalogTexture): void {
    for (const category of this.categories) {
      const index = category.getTextures().indexOf(texture);
      if (index !== -1) {
        category.deleteTexture(texture);
        this.texturesChangeSupport.fireCollectionChangedAt(texture, index, CollectionEvent.Type.DELETE);
        break;
      }
    }
  }

  getTextureWithId(id: string): CatalogTexture | null {
    for (const category of this.categories) {
      for (const texture of category.getTextures()) {
        if (texture.getId?.() === id) {
          return texture;
        }
      }
    }
    return null;
  }
}

export class PatternsCatalog {
  private readonly patterns: TextureImage[] = [];

  getPatterns(): TextureImage[] {
    return this.patterns;
  }

  getPatternsCount(): number {
    return this.patterns.length;
  }

  getPattern(index: number): TextureImage {
    return this.patterns[index]!;
  }
}

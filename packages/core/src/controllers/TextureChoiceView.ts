/**
 * TextureChoiceView interface (port of com.eteks.sweethome3d.viewcontroller.TextureChoiceView, GPL v2+).
 * A view used to choose a texture.
 */
import type { View } from "./View.js";

export interface TextureChoiceView extends View {
  /** Asks confirmation to delete the selected catalog texture. */
  confirmDeleteSelectedCatalogTexture(): boolean;
}

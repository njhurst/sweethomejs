/**
 * View interface (port of com.eteks.sweethome3d.viewcontroller.View, GPL v2+).
 * An MVC view created and controlled by a controller.
 */
export interface View {
  // Marker interface (Java defines only the PointerType enum)
}

export namespace View {
  /** The pointer types that the user may use to interact with the plan. */
  export enum PointerType {
    MOUSE = "MOUSE",
    TOUCH = "TOUCH",
  }
}

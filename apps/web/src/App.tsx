import { formatFloat } from "@sweethomejs/core";
import type { ReactElement } from "react";

/**
 * Placeholder shell for the SweetHomeJS plan/3D editor.
 * Replaced by the real HomePane implementation in phase P6 (docs/13-roadmap.md).
 */
export function App(): ReactElement {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
      <h1>SweetHomeJS</h1>
      <p>
        TypeScript port of Sweet Home 3D — scaffold running. Core f32 helper:
        <code> formatFloat(0.1) = {formatFloat(0.1)}</code>
      </p>
    </main>
  );
}

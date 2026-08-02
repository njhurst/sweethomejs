/*
 * HelpPane.tsx
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
 * HelpPane (task 7.6): displays the shipped HTML help in-app — a table of
 * contents sidebar + the help page in an iframe (the help is static HTML
 * served from /help/<locale>/).
 */
import { useState } from "react";

export interface HelpPaneProps {
  /** The locale folder under /help (default "en"). */
  locale?: string;
  /** The base URL of the help assets (default "/help"). */
  helpBaseUrl?: string;
  onClose?: () => void;
}

/** The help page titles (from the shipped help/en pages). */
export const HELP_PAGES: Array<{ file: string; title: string }> = [
  { file: "index.html", title: "Welcome" },
  { file: "creatingHome.html", title: "Creating a home" },
  { file: "drawingWalls.html", title: "Drawing walls" },
  { file: "drawingRooms.html", title: "Drawing rooms" },
  { file: "addingFurniture.html", title: "Adding furniture" },
  { file: "drawingDimensions.html", title: "Drawing dimensions" },
  { file: "drawingPolylines.html", title: "Drawing polylines" },
  { file: "addingTexts.html", title: "Adding texts" },
  { file: "addingLevels.html", title: "Adding levels" },
  { file: "editing3DView.html", title: "Editing the 3D view" },
  { file: "editingCompass.html", title: "Editing the compass" },
  { file: "creatingPhotos.html", title: "Creating photos" },
  { file: "creatingVideos.html", title: "Creating videos" },
];

export function HelpPane(props: HelpPaneProps): React.JSX.Element {
  const { locale = "en", helpBaseUrl = "/help", onClose } = props;
  const [page, setPage] = useState("index.html");

  return (
    <div className="sh-help" data-testid="help-pane">
      <div className="sh-help-toolbar">
        <span className="sh-help-title">Help</span>
        <span className="sh-help-spacer" />
        <select
          className="sh-help-locale"
          aria-label="help locale"
          defaultValue={locale}
          onChange={(event) => {
            // Reload the iframe for the new locale
            const iframe = document.getElementById("sh-help-frame") as HTMLIFrameElement | null;
            if (iframe !== null) {
              iframe.src = `${helpBaseUrl}/${event.target.value}/${page}`;
            }
          }}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
        </select>
        {onClose !== undefined && (
          <button className="sh-help-close" onClick={onClose}>✕</button>
        )}
      </div>
      <div className="sh-help-body">
        <nav className="sh-help-toc" data-testid="help-toc">
          {HELP_PAGES.map((entry) => (
            <button
              key={entry.file}
              className={`sh-help-toc-item${page === entry.file ? " active" : ""}`}
              onClick={() => setPage(entry.file)}
            >
              {entry.title}
            </button>
          ))}
        </nav>
        <iframe
          id="sh-help-frame"
          className="sh-help-frame"
          title="SweetHomeJS help"
          src={`${helpBaseUrl}/${locale}/${page}`}
          data-testid="help-frame"
        />
      </div>
    </div>
  );
}

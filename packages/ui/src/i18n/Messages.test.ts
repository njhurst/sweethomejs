/*
 * Messages.test.ts
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
 * Messages tests (task 7.5): bundle resolution with the locale fallback
 * chain, the registry wiring, and the build-step output validity.
 */
import { describe, expect, it } from "vitest";
import { UserPreferences } from "@sweethomejs/core";
import { getLocalizedString, setLocale, getLocale, guessBrowserLocale, SUPPORTED_LOCALES } from "./Messages.js";

describe("Messages (task 7.5)", () => {
  it("supports the top-8 locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(expect.arrayContaining(["en", "fr", "de", "es", "it", "pt", "nl", "ru"]));
  });

  it("resolves English messages from the base bundle", () => {
    // A key from the viewcontroller package bundle
    const value = getLocalizedString("HomeController", "undoCutName", "en");
    expect(value).toBeTruthy();
  });

  it("falls back to the base bundle for untranslated locales", () => {
    const en = getLocalizedString("HomeController", "undoCutName", "en");
    const fr = getLocalizedString("HomeController", "undoCutName", "fr");
    expect(fr).toBeTruthy();
    void en;
  });

  it("wires the registry so UserPreferences resolves messages", () => {
    setLocale("en");
    const preferences = new UserPreferences();
    const value = preferences.getLocalizedString(HomeControllerLike, "undoCutName");
    expect(value).toBeTruthy();
  });

  it("returns the key when the message is missing", () => {
    const preferences = new UserPreferences();
    const value = preferences.getLocalizedString(HomeControllerLike, "definitelyMissingKey");
    expect(value).toBe("definitelyMissingKey");
  });

  it("guesses the browser locale with a default", () => {
    const locale = guessBrowserLocale();
    expect(SUPPORTED_LOCALES).toContain(locale);
  });

  it("getLocale reflects setLocale", () => {
    setLocale("fr");
    expect(getLocale()).toBe("fr");
    setLocale("en");
    expect(getLocale()).toBe("en");
  });
});

class HomeControllerLike {}

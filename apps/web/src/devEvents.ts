/*
 * devEvents.ts
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
 * Dev-mode event log (in-the-app instrumentation). In DEV builds, writes
 * compact JSONL events (navigate/state.set/request/error/app.start) to
 * `.pi/in-the-app/events.log` via a Vite middleware endpoint (`POST
 * /__devlog`). Inert in production builds. Secret-shaped fields are
 * redacted to fingerprints.
 */
const LOG_ENDPOINT = "/__devlog";
const ENABLED = import.meta.env.DEV;

/** Secret-shaped keys are written as fingerprints, never raw. */
const SECRET_KEY_RE = /(password|passwd|token|secret|authorization|cookie|api[_-]?key|private[_-]?key)/i;

function redact(value: unknown, key: string): unknown {
  if (typeof value === "string" && SECRET_KEY_RE.test(key) && value.length > 0) {
    return `<redacted len=${value.length} prefix=${value.slice(0, 3)}>`;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redact(item, key + index));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redact(v, k);
    }
    return out;
  }
  return value;
}

/** Emits one JSONL event (no-op outside DEV). */
export function devEvent(type: string, fields: Record<string, unknown> = {}): void {
  if (!ENABLED) {
    return;
  }
  const redacted = redact(fields, "") as Record<string, unknown>;
  const event = {
    t: new Date().toISOString(),
    type,
    ...redacted,
  };
  const line = JSON.stringify(event);
  try {
    void fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: line,
      keepalive: true,
    });
  } catch {
    // Logging must never break the app
  }
  // Also mirror to the console at DEBUG level for at-the-keyboard debugging
  // eslint-disable-next-line no-console
  console.debug("[dev]", type, event);
}

/** Boot checkpoint + global error hooks. Call once from the entry point. */
export function installDevEventHooks(info: { rev?: string } = {}): void {
  if (!ENABLED) {
    return;
  }
  devEvent("app.start", { pid: info.rev ?? "dev", git: info.rev ?? null });
  window.addEventListener("error", (event) => {
    devEvent("error", {
      where: "window.onerror",
      message: event.message,
      file: event.filename,
      line: event.lineno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    devEvent("error", {
      where: "unhandledrejection",
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

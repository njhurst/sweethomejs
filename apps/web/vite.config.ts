import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Dev-only event log (in-the-app instrumentation): POST /__devlog appends
 * one JSONL line to .pi/in-the-app/events.log. Inert outside `vite dev`.
 */
function devLogPlugin(): Plugin {
  const logPath = resolve(__dirname, "../../.pi/in-the-app/events.log");
  return {
    name: "sweethomejs-dev-log",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__devlog", (req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const line = Buffer.concat(chunks).toString("utf8").trim();
          if (line.length > 0) {
            try {
              mkdirSync(resolve(logPath, ".."), { recursive: true });
              appendFileSync(logPath, line + "\n", "utf8");
            } catch {
              // Logging must never break the dev server
            }
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devLogPlugin()],
  server: {
    port: 5199,
    strictPort: true,
  },
});

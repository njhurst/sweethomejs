import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});

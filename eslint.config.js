import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/build/**", "node_modules/**", "src/SweetHome3D-7.5-src/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Translated Java code uses getX/setX naming conventions on purpose.
      "@typescript-eslint/naming-convention": "off",
    },
  },
);

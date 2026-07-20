import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    ignores: [
      "bootstrap/cache/**",
      "node_modules/**",
      "public/build/**",
      "storage/**",
      "vendor/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["resources/js/**/*.js"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["*.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);

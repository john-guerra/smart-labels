import globals from "globals";
import pluginJs from "@eslint/js";
import html from "eslint-plugin-html";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
  },
  pluginJs.configs.recommended,
];

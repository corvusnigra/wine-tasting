import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // react-hooks v6's `set-state-in-effect` flags intentional sync-on-mount
    // and debounce-reset effects (age gate, autocompletes, dialog reset).
    // These are correct patterns — keep the rule advisory, not blocking.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Playwright specs use the fixture argument `use`, which the react-hooks
    // rule mistakes for the React `use` hook. Not React code.
    files: ["e2e/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;

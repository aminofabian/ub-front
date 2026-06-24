import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadNextConfigs() {
  const coreWebVitals = require("eslint-config-next/core-web-vitals");
  const typescript = require("eslint-config-next/typescript");

  if (Array.isArray(coreWebVitals) && Array.isArray(typescript)) {
    return [...coreWebVitals, ...typescript];
  }

  const compat = new FlatCompat({ baseDirectory: __dirname });
  return compat.extends("next/core-web-vitals", "next/typescript");
}

const eslintConfig = defineConfig([
  ...loadNextConfigs(),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

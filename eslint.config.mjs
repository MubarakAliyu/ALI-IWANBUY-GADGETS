import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * One flat config for the whole workspace. The shared rules come first, then the server (Node globals) and the
 * client (React 19, Next 15, JSX a11y) narrow them for their own files. Prettier is last so formatting rules
 * never fight the formatter.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "client/public/**",
      "server/uploads/**",
      "server/.local/**",
      "brand/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "object-shorthand": "error",
    },
  },
  {
    // Scripts, seeds and the local database runner talk to the operator through stdout.
    files: ["scripts/**", "server/src/seed/**", "server/src/scripts/**", "server/scripts/**", "**/*.mjs"],
    rules: { "no-console": "off" },
  },
  {
    files: ["client/**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@next/next": nextPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs["recommended-latest"].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/prop-types": "off",
      // App Router only: there is no `pages` directory for this rule to check against.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**", "client/e2e/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  prettier,
);

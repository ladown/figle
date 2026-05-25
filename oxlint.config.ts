import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "import"],
  categories: {
    correctness: "error",
    suspicious: "error",
    perf: "warn",
  },
  rules: {
    "no-console": "warn",
    "no-underscore-dangle": ["warn", { allow: ["_meta", "_asset"] }],
  },
  overrides: [
    {
      files: ["packages/bridge/src/**/*.ts", "packages/mcp-preset/src/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/.figle/**"],
});

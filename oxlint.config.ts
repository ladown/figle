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
  },
  overrides: [
    {
      files: ["packages/bridge/src/**/*.ts"],
      rules: {
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/.figle/**"],
});

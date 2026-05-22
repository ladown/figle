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
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/.figle/**"],
});

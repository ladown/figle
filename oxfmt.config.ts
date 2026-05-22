import { defineConfig } from "oxfmt";

export default defineConfig({
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  printWidth: 80,
  trailingComma: "all",
  arrowParens: "always",
  endOfLine: "lf",
  bracketSpacing: true,
  sortPackageJson: false,
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/.figle/**"],
});

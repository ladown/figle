import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  platform: "node",
  outputOptions: {
    entryFileNames: "[name].js",
    chunkFileNames: "[name]-[hash].js",
  },
});

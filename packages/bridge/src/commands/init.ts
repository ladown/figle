import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const CONFIG_TEMPLATE = `import { defineConfig } from "@figle/cli";

export default defineConfig({
  stack: "vue3-ts-tailwind",

  // Map Figma variable/style names to project token paths.
  // Example: "color/primary/500": "colors.primary.500"
  tokens: {},

  // Map Figma component (or component-set) names to project components.
  // Example:
  //   Button: {
  //     import: "@/components/UiButton.vue",
  //     as: "UiButton",
  //     propMap: { Variant: "variant", Size: "size" },
  //     slots: { default: "auto-text" },
  //   },
  components: {},
});
`;

const EXISTING_CONFIG_NAMES = [
  "figle.config.ts",
  "figle.config.mts",
  "figle.config.js",
  "figle.config.mjs",
];

export type InitOptions = {
  force?: boolean;
};

export async function runInit(
  cwd: string,
  options: InitOptions = {},
): Promise<void> {
  const existing = EXISTING_CONFIG_NAMES.map((name) => resolve(cwd, name)).find(
    (p) => existsSync(p),
  );
  const target = resolve(cwd, "figle.config.ts");

  if (existing && !options.force) {
    const rel = relative(cwd, existing) || existing;
    console.error(`figle: ${rel} already exists. Pass --force to overwrite.`);
    process.exit(1);
  }

  await writeFile(target, CONFIG_TEMPLATE, "utf8");
  console.log(`figle: wrote ${relative(cwd, target) || target}`);
  console.log("figle: edit it, then run `npx figle sync`.");
}

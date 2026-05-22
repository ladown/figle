import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createJiti } from "jiti";
import {
  BridgeConfigSchema,
  type BridgeConfig,
} from "@figle/spec-schema";

const CONFIG_NAMES = [
  "figle.config.ts",
  "figle.config.mts",
  "figle.config.js",
  "figle.config.mjs",
];

export function findConfigPath(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    if (existsSync(resolve(dir, "package.json"))) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function loadConfig(configPath: string): Promise<BridgeConfig> {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const loaded = (await jiti.import(configPath)) as unknown;
  const raw =
    loaded !== null &&
    typeof loaded === "object" &&
    "default" in (loaded as Record<string, unknown>)
      ? (loaded as Record<string, unknown>).default
      : loaded;
  return BridgeConfigSchema.parse(raw);
}

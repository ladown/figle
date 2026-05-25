import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { createJiti } from "jiti";
import { BridgeConfigSchema, type BridgeConfig } from "@figle/spec-schema";
import { ZodError } from "zod";

const CONFIG_NAMES = [
  "figle.config.ts",
  "figle.config.mts",
  "figle.config.js",
  "figle.config.mjs",
];

export class ConfigLoadError extends Error {
  override readonly name = "ConfigLoadError";
  constructor(
    message: string,
    readonly path: string,
    readonly issues?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

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

export async function loadConfig(
  configPath: string,
  cwd: string = process.cwd(),
): Promise<BridgeConfig> {
  const jiti = createJiti(import.meta.url, { interopDefault: true });

  let loaded: unknown;
  try {
    loaded = await jiti.import(configPath);
  } catch (err) {
    throw new ConfigLoadError(
      `Failed to load ${relative(cwd, configPath) || configPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
      configPath,
    );
  }

  const raw =
    loaded !== null &&
    typeof loaded === "object" &&
    "default" in (loaded as Record<string, unknown>)
      ? (loaded as Record<string, unknown>).default
      : loaded;

  if (raw === undefined || raw === null) {
    throw new ConfigLoadError(
      `${relative(cwd, configPath) || configPath} has no default export.`,
      configPath,
    );
  }

  const result = BridgeConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigLoadError(
      `Invalid figle config (${relative(cwd, configPath) || configPath}):`,
      configPath,
      formatZodIssues(result.error),
    );
  }
  return result.data;
}

function formatZodIssues(
  error: ZodError,
): ReadonlyArray<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "<root>",
    message: issue.message,
  }));
}

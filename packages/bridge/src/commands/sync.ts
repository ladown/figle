import clipboard from "clipboardy";
import { sortKeysDeep } from "@figle/spec-schema";
import { ConfigLoadError, findConfigPath, loadConfig } from "../load-config.js";
import { hashConfig } from "../hash.js";

export async function runSync(cwd: string): Promise<void> {
  const configPath = findConfigPath(cwd);
  if (!configPath) {
    console.error(
      `figle: no figle.config.{ts,mts,js,mjs} found from ${cwd} up to project root.`,
    );
    process.exit(1);
  }

  let config;
  try {
    config = await loadConfig(configPath, cwd);
  } catch (err) {
    if (err instanceof ConfigLoadError) {
      console.error(`figle: ${err.message}`);
      if (err.issues) {
        for (const issue of err.issues) {
          console.error(`  - ${issue.path}: ${issue.message}`);
        }
      }
      process.exit(1);
    }
    throw err;
  }

  const blob = sortKeysDeep({
    version: "0.1" as const,
    hash: hashConfig(config),
    config,
  });
  clipboard.writeSync(JSON.stringify(blob));

  console.log(`figle: synced ${configPath}`);
  console.log(`figle: hash ${blob.hash} copied to clipboard`);
}

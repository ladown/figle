import clipboard from "clipboardy";
import { sortKeysDeep } from "@figle/spec-schema";
import { findConfigPath, loadConfig } from "../load-config.js";
import { hashConfig } from "../hash.js";

export async function runSync(cwd: string): Promise<void> {
  const configPath = findConfigPath(cwd);
  if (!configPath) {
    console.error(
      "figle: no figle.config.{ts,mts,js,mjs} found from",
      cwd,
      "up to project root.",
    );
    process.exit(1);
  }

  const config = await loadConfig(configPath);
  const blob = sortKeysDeep({
    version: "0.1" as const,
    hash: hashConfig(config),
    config,
  });
  clipboard.writeSync(JSON.stringify(blob));

  console.log(`figle: synced ${configPath}`);
  console.log(`figle: hash ${blob.hash} copied to clipboard`);
}

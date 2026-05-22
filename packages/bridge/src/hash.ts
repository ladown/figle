import { createHash } from "node:crypto";
import { sortKeysDeep } from "@figle/spec-schema";

export function hashConfig(config: unknown): string {
  const canonical = JSON.stringify(sortKeysDeep(config));
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

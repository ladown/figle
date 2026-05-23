import type { BridgeConfig, Spec } from "@figle/spec-schema";
import { walkNode, type RawNode } from "./extract/index.js";
import { resolve } from "./resolve/index.js";
import { serialize, type SerializeMeta } from "./serialize/index.js";

export async function runPipeline(
  node: SceneNode,
  config: BridgeConfig | null,
  meta: SerializeMeta,
): Promise<Spec> {
  const raw = await walkNode(node);
  return runFromRaw(raw, config, meta);
}

export function runFromRaw(
  raw: RawNode,
  config: BridgeConfig | null,
  meta: SerializeMeta,
): Spec {
  const { root, warnings } = resolve(raw, config);
  return serialize(root, warnings, meta);
}

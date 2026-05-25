import type { BridgeConfig, SpecCopyPayload } from "@figle/spec-schema";
import { walkNode, type RawNode } from "./extract/index.js";
import { resolve } from "./resolve/index.js";
import { serialize, type SerializeMeta } from "./serialize/index.js";

export async function runPipeline(
  node: SceneNode,
  config: BridgeConfig | null,
  meta: SerializeMeta,
): Promise<SpecCopyPayload> {
  const raw = await walkNode(node);
  return runFromRaw(raw, config, meta);
}

export async function runFromRaw(
  raw: RawNode,
  config: BridgeConfig | null,
  meta: SerializeMeta,
): Promise<SpecCopyPayload> {
  const { root, warnings } = resolve(raw, config);
  return serialize(root, warnings, meta);
}

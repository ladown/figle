import type { BridgeConfig, SpecCopyPayload } from "@figle/spec-schema";
import { walkNode, type RawNode } from "./extract/index.js";
import { resolve } from "./resolve/index.js";
import {
  serialize,
  type SerializeInput,
  type SerializeMeta,
  type SerializeOptions,
} from "./serialize/index.js";

export type PipelineInput = {
  node: SceneNode;
  meta: SerializeMeta;
};

export type RawPipelineInput = {
  raw: RawNode;
  meta: SerializeMeta;
};

export async function runPipeline(
  inputs: PipelineInput[],
  config: BridgeConfig | null,
  options: SerializeOptions = {},
): Promise<SpecCopyPayload> {
  const rawInputs: RawPipelineInput[] = await Promise.all(
    inputs.map(async ({ node, meta }) => ({
      raw: await walkNode(node),
      meta,
    })),
  );
  return runFromRaw(rawInputs, config, options);
}

export async function runFromRaw(
  inputs: RawPipelineInput[],
  config: BridgeConfig | null,
  options: SerializeOptions = {},
): Promise<SpecCopyPayload> {
  const serializeInputs: SerializeInput[] = inputs.map(({ raw, meta }) => {
    const { root, warnings } = resolve(raw, config);
    return { root, warnings, meta };
  });
  return serialize(serializeInputs, options);
}

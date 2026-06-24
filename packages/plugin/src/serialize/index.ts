import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  SPEC_COPY_PAYLOAD_VERSION,
  SPEC_VERSION,
  SpecCopyPayloadSchema,
  sortKeysDeep,
  type ComponentRef,
  type IconNode,
  type ImageNode,
  type LayoutNode,
  type Spec,
  type SpecAsset,
  type SpecCopyPayload,
  type SpecMeta,
  type SpecNode,
  type TextNode,
  type Warning,
} from "@figle/spec-schema";
import type { RawAsset } from "../extract/index.js";
import type { ResolvedNode } from "../resolve/index.js";

export type SerializeMeta = {
  figmaFileKey: string;
  nodeId?: string;
  nodeName?: string;
  width?: number;
  height?: number;
  extractedAt: string;
};

export type SerializeInput = {
  root: ResolvedNode;
  warnings: Warning[];
  meta: SerializeMeta;
};

type AssetCollector = {
  byHash: Map<string, { path: string; base64: string }>;
};

export type SerializeOptions = {
  /** Project-relative output folder chosen in the plugin, if any. */
  outputDir?: string | undefined;
};

export async function serialize(
  inputs: SerializeInput[],
  options: SerializeOptions = {},
): Promise<SpecCopyPayload> {
  if (inputs.length === 0) {
    throw new Error("serialize: at least one input is required");
  }
  const collector: AssetCollector = {
    byHash: new Map(),
  };

  const specs: Spec[] = await Promise.all(
    inputs.map(async (input) => ({
      version: SPEC_VERSION,
      root: await stripMeta(input.root, collector),
      warnings: input.warnings,
      meta: buildMeta(input.meta),
    })),
  );

  const assets: SpecAsset[] = [...collector.byHash.values()].toSorted((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );

  const payload = sortKeysDeep({
    payloadVersion: SPEC_COPY_PAYLOAD_VERSION,
    specs,
    assets,
    ...(options.outputDir ? { outputDir: options.outputDir } : {}),
  });
  return SpecCopyPayloadSchema.parse(payload);
}

function buildMeta(meta: SerializeMeta): SpecMeta {
  const out: SpecMeta = {
    figmaFileKey: meta.figmaFileKey,
    extractedAt: meta.extractedAt,
  };
  if (meta.nodeId) out.nodeId = meta.nodeId;
  if (meta.nodeName) out.nodeName = meta.nodeName;
  if (meta.width) out.width = meta.width;
  if (meta.height) out.height = meta.height;
  return out;
}

async function stripMeta(
  node: ResolvedNode,
  assets: AssetCollector,
): Promise<SpecNode> {
  if ("$component" in node) {
    const out: ComponentRef = {
      $component: node.$component,
      props: node.props,
    };
    if (node.importPath !== undefined) out.importPath = node.importPath;
    if (node.states !== undefined) out.states = node.states;
    if (node.children) {
      out.children = await Promise.all(
        node.children.map((c) => stripMeta(c, assets)),
      );
    }
    if (node.slots) {
      const entries = await Promise.all(
        Object.entries(node.slots).map(async ([key, list]) => {
          const resolvedList = await Promise.all(
            list.map((c) => stripMeta(c, assets)),
          );
          return [key, resolvedList] as const;
        }),
      );
      out.slots = Object.fromEntries(entries);
    }
    return out;
  }
  if (node.$type === "layout") {
    const out: LayoutNode = {
      $type: "layout",
      layout: node.layout,
      children: await Promise.all(
        node.children.map((c) => stripMeta(c, assets)),
      ),
    };
    if (node.semantic !== undefined) out.semantic = node.semantic;
    if (node.background !== undefined) out.background = node.background;
    if (node.border !== undefined) out.border = node.border;
    if (node.size !== undefined) out.size = node.size;
    return out;
  }
  if (node.$type === "icon") {
    const src = await registerAsset(assets, node._asset, node.name);
    const out: IconNode = { $type: "icon", name: node.name, src };
    if (node.size !== undefined) out.size = node.size;
    return out;
  }
  if (node.$type === "image") {
    const out: ImageNode = {
      $type: "image",
      name: node.name,
      size: node.size,
    };
    if (node._asset) {
      out.src = await registerAsset(assets, node._asset, node.name);
    }
    return out;
  }
  const out: TextNode = {
    $type: "text",
    content: node.content,
  };
  if (node.typography !== undefined) out.typography = node.typography;
  if (node.color !== undefined) out.color = node.color;
  if (node.semantic !== undefined) out.semantic = node.semantic;
  return out;
}

async function registerAsset(
  assets: AssetCollector,
  asset: RawAsset,
  rawName: string,
): Promise<string> {
  const hashHex = sha256Hex(asset.bytes);
  const existing = assets.byHash.get(hashHex);
  if (existing) return existing.path;

  const dir = asset.kind === "icon" ? "icons" : "images";
  const slug = slugify(rawName) || asset.kind;
  const suffix = hashHex.slice(0, 6);
  const path = `${dir}/${slug}-${suffix}.${asset.format}`;
  const base64 = bytesToBase64(asset.bytes);
  assets.byHash.set(hashHex, { path, base64 });
  return path;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

// The Figma main-thread sandbox (where the extract pipeline runs) exposes
// neither Node's `crypto` nor the WebCrypto `crypto.subtle` global — only the
// UI iframe does. @noble/hashes is an audited, zero-dependency pure-JS SHA-256
// that runs in any JS runtime, so it stays sandbox-safe with no host globals
// or network access.
function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    result += String.fromCharCode(...slice);
  }
  return btoa(result);
}

import type { BridgeConfig } from "@figle/spec-schema";
import type { RawAsset, RawNode } from "../extract/index.js";
import { resolvePaint } from "./colors.js";
import { ResolveContext } from "./context.js";
import {
  lookupComponent,
  resolveMappedInstance,
  resolvePassthroughInstance,
  toCamelCase,
} from "./instance.js";
import { resolveLayoutShape } from "./layout.js";
import { resolveText } from "./text.js";
import type {
  ResolveResult,
  ResolvedComponentSetNode,
  ResolvedIconNode,
  ResolvedImageNode,
  ResolvedLayoutNode,
  ResolvedNode,
} from "./types.js";

export function resolve(
  root: RawNode,
  config: BridgeConfig | null,
): ResolveResult {
  const ctx = new ResolveContext(config);
  ctx.enter(root.name);
  const resolved = resolveNode(ctx, root);
  ctx.exit();
  return { root: resolved, warnings: ctx.warnings };
}

function resolveNode(ctx: ResolveContext, node: RawNode): ResolvedNode {
  if (node.componentSet) {
    return resolveComponentSet(ctx, node, node.componentSet);
  }

  if (node.asset) {
    return resolveAsset(ctx, node, node.asset);
  }

  if (node.imageOversize) {
    return resolveOversizedImage(ctx, node, node.imageOversize);
  }

  if (node.text) {
    return resolveText(ctx, node);
  }

  if (node.instance) {
    const match = lookupComponent(ctx, node);
    if (match) {
      return resolveMappedInstance(ctx, node, match.descriptor, resolveNode);
    }
    if (!ctx.config) {
      return resolvePassthroughInstance(
        ctx,
        node,
        (child) => resolveNode(ctx, child),
        (name) => ctx.enter(name),
        () => ctx.exit(),
        { nodeId: node.id, nodePath: ctx.currentPath() },
      );
    }
    ctx.warn(
      node,
      "UNKNOWN_COMPONENT",
      `Figma component "${node.instance.mainComponentName}" has no mapping in bridge config`,
    );
  }

  return resolveLayout(ctx, node);
}

// Component-set axis names AND values are normalized to camelCase
// (`Icon only` → `iconOnly`, `Secondary color` → `secondaryColor`) so the
// emitted definition uses one consistent casing the project side can rely on.
function camelCaseVariantKey(
  record: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    out[toCamelCase(key)] = toCamelCase(value);
  }
  return out;
}

function resolveComponentSet(
  ctx: ResolveContext,
  node: RawNode,
  componentSet: NonNullable<RawNode["componentSet"]>,
): ResolvedComponentSetNode {
  const variants = (node.children ?? [])
    .filter((c) => c.visible !== false)
    .map((child) => {
      ctx.enter(child.name);
      const resolved = resolveNode(ctx, child);
      ctx.exit();
      return {
        key: camelCaseVariantKey(child.variantKey ?? {}),
        node: resolved,
      };
    });

  const axes: Record<string, string[]> = {};
  for (const [property, values] of Object.entries(componentSet.axes)) {
    axes[toCamelCase(property)] = values.map(toCamelCase);
  }

  return {
    $type: "componentSet",
    name: node.name,
    axes,
    variants,
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };
}

function resolveLayout(ctx: ResolveContext, node: RawNode): ResolvedLayoutNode {
  const layout = node.autoLayout
    ? resolveLayoutShape(ctx, node, node.autoLayout)
    : { direction: "col" as const };

  const out: ResolvedLayoutNode = {
    $type: "layout",
    layout,
    children: [],
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };

  const background = resolvePaint(
    ctx,
    node,
    node.fills?.[0],
    node.fillStyleName,
    "background",
  );
  if (background !== undefined) out.background = background;

  if (node.children) {
    out.children = node.children
      .filter((c) => c.visible !== false)
      .map((child) => {
        ctx.enter(child.name);
        const r = resolveNode(ctx, child);
        ctx.exit();
        return r;
      });
  }

  return out;
}

function resolveAsset(
  ctx: ResolveContext,
  node: RawNode,
  asset: RawAsset,
): ResolvedIconNode | ResolvedImageNode {
  const meta = { nodeId: node.id, nodePath: ctx.currentPath() };
  // A degenerate node (e.g. a zero-height vector in a variant) reports a
  // non-positive dimension. `AssetSizeSchema` requires positive width/height,
  // so drop the size hint rather than emit an invalid one — for icons `size`
  // is optional, so omitting it just loses an advisory dimension.
  const size =
    node.size && node.size.width > 0 && node.size.height > 0
      ? { width: node.size.width, height: node.size.height }
      : undefined;
  if (asset.kind === "icon") {
    const out: ResolvedIconNode = {
      $type: "icon",
      name: node.name,
      _asset: asset,
      _meta: meta,
    };
    if (size) out.size = size;
    return out;
  }
  if (!size) {
    throw new Error(`Image node ${node.id} has no size`);
  }
  return {
    $type: "image",
    name: node.name,
    size,
    _asset: asset,
    _meta: meta,
  };
}

function resolveOversizedImage(
  ctx: ResolveContext,
  node: RawNode,
  size: { width: number; height: number },
): ResolvedImageNode {
  return {
    $type: "image",
    name: node.name,
    size,
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };
}

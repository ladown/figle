import type { BridgeConfig } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";
import { resolvePaint } from "./colors.js";
import { ResolveContext } from "./context.js";
import { lookupComponent, resolveInstance } from "./instance.js";
import { resolveLayoutShape } from "./layout.js";
import { inferLayoutSemantic } from "./semantics.js";
import { resolveText } from "./text.js";
import type {
  ResolveResult,
  ResolvedLayoutNode,
  ResolvedNode,
} from "./types.js";

export function resolve(root: RawNode, config: BridgeConfig): ResolveResult {
  const ctx = new ResolveContext(config);
  ctx.enter(root.name);
  const resolved = resolveNode(ctx, root);
  ctx.exit();
  return { root: resolved, warnings: ctx.warnings };
}

function resolveNode(ctx: ResolveContext, node: RawNode): ResolvedNode {
  if (node.text) {
    return resolveText(ctx, node);
  }

  if (node.instance) {
    const match = lookupComponent(ctx, node);
    if (match) {
      return resolveInstance(ctx, node, match.descriptor, (childCtx, child) => {
        childCtx.enter(child.name);
        const r = resolveNode(childCtx, child);
        childCtx.exit();
        return r;
      });
    }
    ctx.warn(
      node,
      "UNKNOWN_COMPONENT",
      `Figma component "${node.instance.mainComponentName}" has no mapping in bridge config`,
    );
  }

  return resolveLayout(ctx, node);
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

  const semantic = inferLayoutSemantic(node);
  if (semantic) out.semantic = semantic;

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

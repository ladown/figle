import type { RawNode } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { lookupStyle, lookupVariable } from "./tokens.js";
import type { ResolvedTextNode } from "./types.js";

export function resolveText(
  ctx: ResolveContext,
  node: RawNode,
): ResolvedTextNode {
  if (!node.text) {
    throw new Error(`Text resolver called on non-text node ${node.id}`);
  }

  const out: ResolvedTextNode = {
    $type: "text",
    content: node.text.content,
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };

  const tyVar = node.text.typography.boundVariable;
  const tyStyle = node.text.typography.textStyleName;

  if (tyVar) {
    const { ref, mapped } = lookupVariable(ctx, tyVar);
    out.typography = ref;
    if (!mapped) {
      ctx.warn(
        node,
        "UNMAPPED_TOKEN",
        `Typography variable "${tyVar.name}" has no mapping in bridge config`,
      );
    }
  } else if (tyStyle) {
    const { ref, mapped } = lookupStyle(ctx, tyStyle);
    out.typography = ref;
    if (!mapped) {
      ctx.warn(
        node,
        "UNMAPPED_TOKEN",
        `Text style "${tyStyle}" has no mapping in bridge config`,
      );
    }
  } else {
    ctx.warn(
      node,
      "UNBOUND_TYPOGRAPHY",
      `Text "${node.name}" uses ad-hoc font properties`,
    );
  }

  return out;
}

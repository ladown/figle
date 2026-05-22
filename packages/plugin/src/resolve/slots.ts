import type { ComponentDescriptor } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { resolveText } from "./text.js";
import type { ResolvedNode } from "./types.js";

export function resolveDefaultSlot(
  ctx: ResolveContext,
  node: RawNode,
  descriptor: ComponentDescriptor,
  resolveChild: (ctx: ResolveContext, child: RawNode) => ResolvedNode,
): ResolvedNode[] | undefined {
  const slotMode = descriptor.slots?.default;
  if (!slotMode) return undefined;

  if (slotMode === "auto-text") {
    const text = findFirstText(node);
    if (!text) return undefined;
    ctx.enter(text.name);
    const out = resolveText(ctx, text);
    ctx.exit();
    return [out];
  }

  if (slotMode === "auto-children" && node.children) {
    return node.children.map((child) => {
      ctx.enter(child.name);
      const resolved = resolveChild(ctx, child);
      ctx.exit();
      return resolved;
    });
  }

  return undefined;
}

function findFirstText(node: RawNode): RawNode | null {
  if (node.text) return node;
  for (const child of node.children ?? []) {
    const found = findFirstText(child);
    if (found) return found;
  }
  return null;
}

import {
  SPEC_VERSION,
  SpecSchema,
  sortKeysDeep,
  type ComponentRef,
  type LayoutNode,
  type Spec,
  type SpecNode,
  type TextNode,
  type Warning,
} from "@figle/spec-schema";
import type { ResolvedNode } from "../resolve/index.js";

export type SerializeMeta = {
  figmaFileKey: string;
  extractedAt: string;
};

export function serialize(
  root: ResolvedNode,
  warnings: Warning[],
  meta: SerializeMeta,
): Spec {
  const spec: Spec = {
    version: SPEC_VERSION,
    root: stripMeta(root),
    warnings,
    meta,
  };
  const sorted = sortKeysDeep(spec);
  return SpecSchema.parse(sorted);
}

function stripMeta(node: ResolvedNode): SpecNode {
  if ("$component" in node) {
    const out: ComponentRef = {
      $component: node.$component,
      props: node.props,
    };
    if (node.importPath !== undefined) out.importPath = node.importPath;
    if (node.children) out.children = node.children.map(stripMeta);
    if (node.slots) {
      const slots: Record<string, SpecNode[]> = {};
      for (const [key, list] of Object.entries(node.slots)) {
        slots[key] = list.map(stripMeta);
      }
      out.slots = slots;
    }
    return out;
  }
  if (node.$type === "layout") {
    const out: LayoutNode = {
      $type: "layout",
      layout: node.layout,
      children: node.children.map(stripMeta),
    };
    if (node.semantic !== undefined) out.semantic = node.semantic;
    if (node.background !== undefined) out.background = node.background;
    if (node.border !== undefined) out.border = node.border;
    if (node.size !== undefined) out.size = node.size;
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

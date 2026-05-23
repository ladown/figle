import type { ComponentDescriptor, PropValue } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { resolveDefaultSlot } from "./slots.js";
import type { ResolvedComponentRef, ResolvedNode } from "./types.js";

export function lookupComponent(
  ctx: ResolveContext,
  node: RawNode,
): { key: string; descriptor: ComponentDescriptor } | null {
  if (!ctx.config || !node.instance) return null;
  const setName = node.instance.componentSetName;
  if (setName && ctx.config.components[setName]) {
    return { key: setName, descriptor: ctx.config.components[setName] };
  }
  const compName = node.instance.mainComponentName;
  if (ctx.config.components[compName]) {
    return { key: compName, descriptor: ctx.config.components[compName] };
  }
  return null;
}

export function resolveMappedInstance(
  ctx: ResolveContext,
  node: RawNode,
  descriptor: ComponentDescriptor,
  resolveChild: (ctx: ResolveContext, child: RawNode) => ResolvedNode,
): ResolvedComponentRef {
  const props = mapVariantProps(ctx, node, descriptor);
  const children = resolveDefaultSlot(ctx, node, descriptor, resolveChild);

  const out: ResolvedComponentRef = {
    $component: descriptor.as,
    importPath: descriptor.import,
    props,
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };
  if (children && children.length > 0) out.children = children;
  return out;
}

export function resolvePassthroughInstance(
  node: RawNode,
  resolveChild: (child: RawNode) => ResolvedNode,
  enterChild: (name: string) => void,
  exitChild: () => void,
  meta: { nodeId: string; nodePath: string },
): ResolvedComponentRef {
  const instance = node.instance;
  const compName =
    instance?.componentSetName ?? instance?.mainComponentName ?? node.name;
  const props: Record<string, PropValue> = {};
  if (instance?.variantProperties) {
    for (const [k, v] of Object.entries(instance.variantProperties)) {
      props[k] = v;
    }
  }
  const out: ResolvedComponentRef = {
    $component: compName,
    props,
    _meta: meta,
  };
  if (node.children && node.children.length > 0) {
    out.children = node.children
      .filter((c) => c.visible !== false)
      .map((child) => {
        enterChild(child.name);
        const r = resolveChild(child);
        exitChild();
        return r;
      });
  }
  return out;
}

function mapVariantProps(
  ctx: ResolveContext,
  node: RawNode,
  descriptor: ComponentDescriptor,
): Record<string, PropValue> {
  const variants = node.instance?.variantProperties ?? {};
  const propMap = descriptor.propMap ?? {};
  const result: Record<string, PropValue> = {};

  for (const [figmaKey, value] of Object.entries(variants)) {
    const target = propMap[figmaKey] ?? toCamelCase(figmaKey);
    const normalized = normalizeVariantValue(value);
    if (normalized === null) {
      ctx.warn(
        node,
        "AMBIGUOUS_VARIANT",
        `Variant "${figmaKey}=${value}" on "${node.name}" is not safely translatable`,
      );
      continue;
    }
    result[target] = normalized;
  }
  return result;
}

function normalizeVariantValue(value: string): PropValue | null {
  if (value === "True" || value === "true") return true;
  if (value === "False" || value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.length === 0) return null;
  return value.toLowerCase();
}

function toCamelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

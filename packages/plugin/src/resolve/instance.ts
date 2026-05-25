import type {
  ComponentDescriptor,
  PropValue,
  StateSnapshot,
} from "@figle/spec-schema";
import type { RawNode, RawStateSnapshot } from "../extract/index.js";
import { resolvePaint } from "./colors.js";
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
  const states = resolveStates(ctx, node);

  const out: ResolvedComponentRef = {
    $component: descriptor.as,
    importPath: descriptor.import,
    props,
    _meta: { nodeId: node.id, nodePath: ctx.currentPath() },
  };
  if (states) out.states = states;
  if (children && children.length > 0) out.children = children;
  return out;
}

export function resolvePassthroughInstance(
  ctx: ResolveContext,
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
  const states = resolveStates(ctx, node);
  if (states) out.states = states;
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

function resolveStates(
  ctx: ResolveContext,
  node: RawNode,
): Record<string, StateSnapshot> | null {
  const rawStates = node.instance?.states;
  if (!rawStates) return null;
  const result: Record<string, StateSnapshot> = {};
  for (const [stateName, snap] of Object.entries(rawStates)) {
    const resolved = resolveStateSnapshot(ctx, node, snap);
    if (Object.keys(resolved).length > 0) {
      result[stateName] = resolved;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function resolveStateSnapshot(
  ctx: ResolveContext,
  node: RawNode,
  snap: RawStateSnapshot,
): StateSnapshot {
  const out: StateSnapshot = {};
  if (typeof snap.opacity === "number") out.opacity = snap.opacity;
  const background = resolvePaint(
    ctx,
    node,
    snap.fills?.[0],
    snap.fillStyleName,
    "background",
  );
  if (background !== undefined) out.background = background;

  const borderColor = resolvePaint(
    ctx,
    node,
    snap.strokes?.[0],
    snap.strokeStyleName,
    "border",
  );
  if (borderColor !== undefined && typeof snap.strokeWeight === "number") {
    const radius = snap.corners?.uniform ?? 0;
    out.border = {
      color: borderColor,
      width: snap.strokeWeight,
      radius,
    };
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

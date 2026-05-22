import type { LayoutNode, TokenRef } from "@figle/spec-schema";
import type { RawAutoLayout, RawNode } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { lookupVariable } from "./tokens.js";

export function resolveLayoutShape(
  ctx: ResolveContext,
  node: RawNode,
  auto: RawAutoLayout,
): LayoutNode["layout"] {
  const direction: "row" | "col" = auto.mode === "VERTICAL" ? "col" : "row";

  const layout: LayoutNode["layout"] = { direction };

  if (typeof auto.itemSpacing === "number") {
    layout.gap = resolveSpacing(
      ctx,
      node,
      auto.itemSpacing,
      auto.itemSpacingVar,
    );
  }

  if (
    typeof auto.paddingTop === "number" ||
    typeof auto.paddingRight === "number" ||
    typeof auto.paddingBottom === "number" ||
    typeof auto.paddingLeft === "number"
  ) {
    layout.padding = {
      top: resolveSpacing(
        ctx,
        node,
        auto.paddingTop ?? 0,
        auto.paddingVars?.top,
      ),
      right: resolveSpacing(
        ctx,
        node,
        auto.paddingRight ?? 0,
        auto.paddingVars?.right,
      ),
      bottom: resolveSpacing(
        ctx,
        node,
        auto.paddingBottom ?? 0,
        auto.paddingVars?.bottom,
      ),
      left: resolveSpacing(
        ctx,
        node,
        auto.paddingLeft ?? 0,
        auto.paddingVars?.left,
      ),
    };
  }

  const align = mapAlign(auto.counterAxisAlign);
  if (align) layout.align = align;

  const justify = mapJustify(auto.primaryAxisAlign);
  if (justify) layout.justify = justify;

  if (auto.wrap) layout.wrap = true;

  return layout;
}

function resolveSpacing(
  ctx: ResolveContext,
  node: RawNode,
  value: number,
  alias: { name: string; collection?: string } | undefined,
): TokenRef | number {
  if (alias) {
    const ref = lookupVariable(ctx, {
      type: "VARIABLE_ALIAS",
      id: "",
      name: alias.name,
      ...(alias.collection ? { collection: alias.collection } : {}),
    });
    if (ref) return ref;
    ctx.warn(
      node,
      "UNMAPPED_TOKEN",
      `Spacing variable "${alias.name}" has no mapping in bridge config`,
    );
  } else if (value > 0) {
    ctx.warn(
      node,
      "UNBOUND_SPACING",
      `Spacing on "${node.name}" uses a literal value`,
    );
  }
  return value;
}

function mapAlign(
  value: RawAutoLayout["counterAxisAlign"],
): LayoutNode["layout"]["align"] | undefined {
  switch (value) {
    case "MIN":
      return "start";
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "BASELINE":
      return "baseline";
    default:
      return undefined;
  }
}

function mapJustify(
  value: RawAutoLayout["primaryAxisAlign"],
): LayoutNode["layout"]["justify"] | undefined {
  switch (value) {
    case "MIN":
      return "start";
    case "CENTER":
      return "center";
    case "MAX":
      return "end";
    case "SPACE_BETWEEN":
      return "between";
    default:
      return undefined;
  }
}

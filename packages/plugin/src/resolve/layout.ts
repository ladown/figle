import type { LayoutNode, TokenRef } from "@figle/spec-schema";
import type { RawAutoLayout, RawNode } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { lookupVariable } from "./tokens.js";

type SpacingField =
  | "gap"
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left";

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
      "gap",
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
        "padding-top",
        auto.paddingTop ?? 0,
        auto.paddingVars?.top,
      ),
      right: resolveSpacing(
        ctx,
        node,
        "padding-right",
        auto.paddingRight ?? 0,
        auto.paddingVars?.right,
      ),
      bottom: resolveSpacing(
        ctx,
        node,
        "padding-bottom",
        auto.paddingBottom ?? 0,
        auto.paddingVars?.bottom,
      ),
      left: resolveSpacing(
        ctx,
        node,
        "padding-left",
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
  field: SpacingField,
  value: number,
  alias: { name: string; collection?: string } | undefined,
): TokenRef | number {
  if (alias) {
    const { ref, mapped } = lookupVariable(ctx, {
      type: "VARIABLE_ALIAS",
      id: "",
      name: alias.name,
      ...(alias.collection ? { collection: alias.collection } : {}),
    });
    if (mapped) return ref;
    ctx.warn(
      node,
      "UNMAPPED_TOKEN",
      `Spacing variable "${alias.name}" (${field}) has no mapping in bridge config`,
    );
    return ref;
  }
  if (value > 0) {
    ctx.warn(
      node,
      "UNBOUND_SPACING",
      `${field} on "${node.name}" uses a literal value (${value}px)`,
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

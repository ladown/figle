import type { TokenRef } from "@figle/spec-schema";
import type { RawNode, RawPaint } from "../extract/index.js";
import type { ResolveContext } from "./context.js";
import { lookupStyle, lookupVariable } from "./tokens.js";

export function resolvePaint(
  ctx: ResolveContext,
  node: RawNode,
  paint: RawPaint | undefined,
  styleName: string | undefined,
  kind: "background" | "color" | "border",
): TokenRef | string | undefined {
  if (!paint) return undefined;
  if (paint.type !== "SOLID") return undefined;

  if (paint.boundVariable) {
    const { ref, mapped } = lookupVariable(ctx, paint.boundVariable);
    if (mapped) return ref;
    ctx.warn(
      node,
      "UNMAPPED_TOKEN",
      `Figma variable "${paint.boundVariable.name}" has no mapping in bridge config`,
    );
    return ref;
  }

  if (styleName) {
    const { ref, mapped } = lookupStyle(ctx, styleName);
    if (mapped) return ref;
    ctx.warn(
      node,
      "UNMAPPED_TOKEN",
      `Figma style "${styleName}" has no mapping in bridge config`,
    );
    return ref;
  }

  ctx.warn(
    node,
    "UNBOUND_COLOR",
    `${kind} on "${node.name}" uses a raw color value`,
  );
  return rgbToHex(paint.color);
}

function rgbToHex(color: { r: number; g: number; b: number }): string {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function toHex(c: number): string {
  return Math.round(c * 255)
    .toString(16)
    .padStart(2, "0");
}

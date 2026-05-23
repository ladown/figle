import type { TypographyProps } from "@figle/spec-schema";
import type { RawNode, RawTypography } from "../extract/index.js";
import { resolvePaint } from "./colors.js";
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
    out.typography = toTypographyProps(node.text.typography);
    ctx.warn(
      node,
      "UNBOUND_TYPOGRAPHY",
      `Text "${node.name}" uses ad-hoc font properties`,
    );
  }

  const color = resolvePaint(
    ctx,
    node,
    node.fills?.[0],
    node.fillStyleName,
    "color",
  );
  if (color !== undefined) out.color = color;

  return out;
}

function toTypographyProps(raw: RawTypography): TypographyProps {
  const props: TypographyProps = {
    fontFamily: raw.fontName.family,
    fontSize: raw.fontSize,
  };
  if (raw.fontName.style) props.fontStyle = raw.fontName.style;
  if (typeof raw.fontWeight === "number") props.fontWeight = raw.fontWeight;
  const lh = normalizeLineHeight(raw.lineHeight);
  if (lh !== undefined) props.lineHeight = lh;
  if (typeof raw.letterSpacing === "number") {
    props.letterSpacing = raw.letterSpacing;
  }
  return props;
}

function normalizeLineHeight(
  lh: RawTypography["lineHeight"],
): number | undefined {
  if (!lh) return undefined;
  if (typeof lh === "number") return lh;
  if (typeof lh !== "object") return undefined;
  if (lh.unit === "PIXELS" && "value" in lh) return lh.value;
  return undefined;
}

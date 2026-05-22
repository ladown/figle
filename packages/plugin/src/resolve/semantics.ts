import type { LayoutNode, TextNode } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";

const LAYOUT_NAME_PATTERNS: Array<{
  pattern: RegExp;
  semantic: NonNullable<LayoutNode["semantic"]>;
}> = [
  { pattern: /^card$|\bcard\b/i, semantic: "card" },
  { pattern: /^section$|\bsection\b/i, semantic: "section" },
  { pattern: /^list$|\blist\b/i, semantic: "list" },
  { pattern: /^header$|\bheader\b/i, semantic: "header" },
  { pattern: /^footer$|\bfooter\b/i, semantic: "footer" },
  { pattern: /^nav$|\bnav(igation)?\b/i, semantic: "nav" },
];

export function inferLayoutSemantic(
  node: RawNode,
): NonNullable<LayoutNode["semantic"]> | null {
  for (const { pattern, semantic } of LAYOUT_NAME_PATTERNS) {
    if (pattern.test(node.name)) return semantic;
  }
  return null;
}

export function inferTextSemantic(
  node: RawNode,
): NonNullable<TextNode["semantic"]> | null {
  if (!node.text) return null;
  const fontSize = node.text.typography.fontSize;
  const styleName = node.text.typography.textStyleName?.toLowerCase() ?? "";
  const variableName =
    node.text.typography.boundVariable?.name.toLowerCase() ?? "";
  const hint = `${styleName} ${variableName}`;

  if (/h1|heading[-/]1|display/.test(hint)) return "heading-1";
  if (/h2|heading[-/]2|title/.test(hint)) return "heading-2";
  if (/h3|heading[-/]3/.test(hint)) return "heading-3";
  if (/h4|heading[-/]4/.test(hint)) return "heading-4";
  if (/caption/.test(hint)) return "caption";
  if (/label/.test(hint)) return "label";
  if (/body|text/.test(hint)) return "body";

  if (fontSize >= 32) return "heading-1";
  if (fontSize >= 24) return "heading-2";
  if (fontSize >= 20) return "heading-3";
  if (fontSize >= 18) return "heading-4";
  if (fontSize <= 12) return "caption";
  return "body";
}

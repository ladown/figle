import type { TokenRef } from "@figle/spec-schema";
import type { RawVariableAlias } from "../extract/index.js";
import type { ResolveContext } from "./context.js";

export function lookupVariable(
  ctx: ResolveContext,
  alias: RawVariableAlias,
): { ref: TokenRef; mapped: boolean } {
  const key = canonicalVariableKey(alias);
  if (!ctx.config) {
    return { ref: { $token: key }, mapped: true };
  }
  const path = ctx.config.tokens[key] ?? ctx.config.tokens[alias.name];
  if (path) {
    return { ref: { $token: path }, mapped: true };
  }
  return { ref: { $token: key }, mapped: false };
}

export function lookupStyle(
  ctx: ResolveContext,
  styleName: string,
): { ref: TokenRef; mapped: boolean } {
  if (!ctx.config) {
    return { ref: { $token: styleName }, mapped: true };
  }
  const path = ctx.config.tokens[styleName];
  if (path) {
    return { ref: { $token: path }, mapped: true };
  }
  return { ref: { $token: styleName }, mapped: false };
}

function canonicalVariableKey(alias: RawVariableAlias): string {
  if (!alias.collection) return alias.name;
  return `${alias.collection}/${alias.name}`;
}
